import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { ubicacionesApi } from '@/api/ubicaciones';
import { useAuthStore } from '@/store/auth.store';

/**
 * Envío automático de la ubicación del PCD (CU53). Android la entrega a esta
 * tarea también con la app en segundo plano, mientras corre el servicio en
 * primer plano (la notificación fija "Compartiendo tu ubicación"). Si el
 * usuario cierra la app desde "recientes", depende del fabricante; al volver
 * a abrirla se reanuda.
 */
export const TAREA_UBICACION = 'pcd-ubicacion-automatica';

/**
 * Se manda una ubicación por minuto (D16). No se usa un umbral de distancia:
 * Android exige tiempo Y distancia a la vez, así que con 50 m un PCD quieto no
 * mandaría nada y el tutor no sabría si sigue ahí. Un mínimo de un minuto entre
 * envíos también hace que "moverse 50 m" no pueda adelantar el siguiente.
 */
export const INTERVALO_MS = 60_000;
const DISTANCIA_M = 0;

let ultimoEnvio = 0;

/**
 * Pausa del envío: el PCD deja de mandar su ubicación sin tener que sacar a
 * nadie de la lista de "Compartido con". Se guarda en el teléfono, por usuario.
 */
const clavePausa = (userId: number) => `ubicacion-pausada:${userId}`;

export async function ubicacionPausada(userId: number): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(clavePausa(userId))) === '1';
  } catch {
    return false;
  }
}

export async function guardarPausa(userId: number, pausada: boolean): Promise<void> {
  if (pausada) await AsyncStorage.setItem(clavePausa(userId), '1');
  else await AsyncStorage.removeItem(clavePausa(userId));
}

/** En un arranque en segundo plano el store todavía se está leyendo del almacenamiento seguro. */
function esperarSesion(): Promise<void> {
  if (useAuthStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const quitar = useAuthStore.persist.onFinishHydration(() => { quitar(); resolve(); });
  });
}

export async function enviarUbicacion(pos: Location.LocationObject): Promise<void> {
  await esperarSesion();
  const { user, token } = useAuthStore.getState();
  if (!user || !token || user.tipoUsuario !== 'PCD') {
    // Se cerró la sesión con la tarea andando: no hay a quién mandarla.
    await detenerUbicacionAutomatica();
    return;
  }
  if (await ubicacionPausada(user.id)) {
    await detenerUbicacionAutomatica();
    return;
  }
  // Android a veces entrega varias posiciones juntas; con una por intervalo alcanza.
  if (Date.now() - ultimoEnvio < INTERVALO_MS / 2) return;
  ultimoEnvio = Date.now();
  await ubicacionesApi.registrar({
    latitud: pos.coords.latitude,
    longitud: pos.coords.longitude,
    precision: pos.coords.accuracy ?? undefined,
  });
}

// Tiene que definirse al cargar el módulo (alcance global): Android puede
// arrancar el JS solo para esta tarea, sin pasar por ninguna pantalla.
if (Platform.OS !== 'web') {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TAREA_UBICACION, async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    const ultima = data.locations[data.locations.length - 1];
    try {
      await enviarUbicacion(ultima);
    } catch {
      // Sin conexión o servidor dormido: se reintenta con la próxima posición.
    }
  });
}

export type EstadoEnvio = 'activo' | 'sin-permiso-fondo' | 'sin-permiso' | 'no-disponible';

/** Qué permisos hay, sin pedir ninguno. */
export async function estadoPermisos(): Promise<EstadoEnvio> {
  if (Platform.OS === 'web') return 'no-disponible';
  const primerPlano = await Location.getForegroundPermissionsAsync();
  if (!primerPlano.granted) return 'sin-permiso';
  const fondo = await Location.getBackgroundPermissionsAsync();
  return fondo.granted ? 'activo' : 'sin-permiso-fondo';
}

/**
 * Pide los permisos (primero "mientras se usa la app" y después "todo el
 * tiempo": Android exige ese orden y para el segundo abre la configuración)
 * y arranca el envío. Devuelve en qué quedó.
 */
export async function pedirPermisosEIniciar(): Promise<EstadoEnvio> {
  if (Platform.OS === 'web') return 'no-disponible';
  const primerPlano = await Location.requestForegroundPermissionsAsync();
  if (!primerPlano.granted) return 'sin-permiso';
  const fondo = await Location.requestBackgroundPermissionsAsync();
  if (!fondo.granted) return 'sin-permiso-fondo';
  await iniciarUbicacionAutomatica();
  return 'activo';
}

/** Arranca el envío si hay permiso "todo el tiempo" y todavía no estaba corriendo. */
export async function iniciarUbicacionAutomatica(): Promise<boolean> {
  const userId = useAuthStore.getState().user?.id;
  if (userId !== undefined && (await ubicacionPausada(userId))) return false;
  if ((await estadoPermisos()) !== 'activo') return false;
  if (await Location.hasStartedLocationUpdatesAsync(TAREA_UBICACION)) return true;
  await Location.startLocationUpdatesAsync(TAREA_UBICACION, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: INTERVALO_MS,
    distanceInterval: DISTANCIA_M,
    deferredUpdatesInterval: INTERVALO_MS,
    foregroundService: {
      notificationTitle: 'Compartiendo tu ubicación',
      notificationBody: 'Tus tutores y profesionales pueden ver dónde estás.',
      notificationColor: '#1F2937',
    },
  });
  return true;
}

export async function detenerUbicacionAutomatica(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (await Location.hasStartedLocationUpdatesAsync(TAREA_UBICACION)) {
      await Location.stopLocationUpdatesAsync(TAREA_UBICACION);
    }
  } catch {
    // La tarea no estaba registrada.
  }
}
