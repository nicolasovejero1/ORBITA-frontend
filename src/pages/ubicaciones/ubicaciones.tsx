import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Switch } from 'react-native-paper';
import { tutorPcdApi } from '@/api/tutor-pcd';
import { ubicacionesApi } from '@/api/ubicaciones';
import { vinculosApi } from '@/api/vinculos';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Skeleton } from '@/components/Skeleton';
import { Toast, useToast } from '@/components/Toast';
import { HistorialUbicaciones, PuntoElegido } from '@/components/HistorialUbicaciones';
import { UbicacionMapa } from '@/components/UbicacionMapa';
import { AvatarRing, Button, Card, Chip, OrbitDecor, ScreenHeader as Cabecera, SectionHeader } from '@/components/ds';
import { useUbicacionEnVivo } from '@/hooks/useUbicacionEnVivo';
import { DS } from '@/constants/tokens';
import { useAuthStore } from '@/store/auth.store';
import {
  detenerUbicacionAutomatica,
  EstadoEnvio,
  estadoPermisos,
  guardarPausa,
  iniciarUbicacionAutomatica,
  pedirPermisosEIniciar,
  ubicacionPausada,
} from '@/tasks/ubicacion-automatica';
import { Ubicacion, UbicacionCompartida } from '@/types/ubicacion.types';
import { volver } from '@/utils/navegacion';
import { buscar } from '@/utils/search';
import { AppIcon, Tappable } from '@/components/a11y';
import { SearchBar } from '@/components/SearchBar';

interface PcdItem { id: number; nombre: string; apellido: string; }
interface Candidato { id: number; nombre: string; apellido: string; rol: string; }

function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const iniciales = (nombre: string, apellido: string) => `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase();

function Avatar({ nombre, apellido, size = 44 }: { nombre: string; apellido: string; size?: number }) {
  return <AvatarRing initials={iniciales(nombre, apellido)} size={size} />;
}

function Vacio({ icono, texto }: { icono: React.ComponentProps<typeof AppIcon>['name']; texto: string }) {
  return (
    <View style={styles.center}>
      <View style={styles.vacioIcono}>
        <AppIcon name={icono} size={32} color={DS.colors.textTertiary} />
      </View>
      <Text style={styles.vacioTexto}>{texto}</Text>
    </View>
  );
}

function MiUbicacion() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast, showToast, hideToast } = useToast();
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [compartidos, setCompartidos] = useState<UbicacionCompartida[]>([]);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [envio, setEnvio] = useState<EstadoEnvio | null>(null);
  const [explicarPermiso, setExplicarPermiso] = useState(false);
  const [pausada, setPausada] = useState(false);

  const cargar = useCallback(async () => {
    if (!user) return;
    try {
      const [ultima, compartidosList, tutores, vinculosProf] = await Promise.all([
        ubicacionesApi.getUltima(user.id),
        ubicacionesApi.getCompartidos(),
        tutorPcdApi.getAll({ pcdId: user.id, estado: 'ACTIVO' }),
        vinculosApi.getAll({ pcdId: user.id, estado: 'ACTIVO' }),
      ]);
      setUbicacion(ultima);
      setCompartidos(compartidosList);
      const permisos = await estadoPermisos();
      setEnvio(permisos);
      setPausada(await ubicacionPausada(user.id));
      if (permisos === 'activo' && compartidosList.length > 0) await iniciarUbicacionAutomatica();

      const yaCompartidos = new Set(compartidosList.map((c) => c.usuarioId));
      const cands: Candidato[] = [
        ...tutores.map((t) => ({
          id: t.tutor.usuario.id, nombre: t.tutor.usuario.nombre, apellido: t.tutor.usuario.apellido, rol: 'Tutor',
        })),
        ...vinculosProf.map((v) => ({
          id: v.profesional.usuario.id, nombre: v.profesional.usuario.nombre, apellido: v.profesional.usuario.apellido, rol: 'Profesional',
        })),
      ].filter((c) => !yaCompartidos.has(c.id));
      setCandidatos(cands);
    } catch {
      showToast('No se pudo cargar tu ubicación', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => { cargar(); }, [cargar]);

  const registrarUbicacion = async () => {
    setRegistrando(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Necesitamos permiso de ubicación para registrarla', 'error');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nueva = await ubicacionesApi.registrar({
        latitud: pos.coords.latitude,
        longitud: pos.coords.longitude,
        precision: pos.coords.accuracy ?? undefined,
      });
      setUbicacion(nueva);
      showToast('Ubicación registrada correctamente', 'success');
    } catch {
      showToast('No se pudo registrar tu ubicación', 'error');
    } finally {
      setRegistrando(false);
    }
  };

  // Explica para qué es el permiso antes de pedirlo: en Android 11+ el
  // "Permitir todo el tiempo" se elige en la configuración del sistema.
  const activarEnvio = async () => {
    setExplicarPermiso(false);
    const resultado = await pedirPermisosEIniciar();
    setEnvio(resultado);
    if (resultado === 'activo') {
      showToast('Tu ubicación se va a enviar automáticamente', 'success');
    } else {
      showToast('Elegí "Permitir todo el tiempo" en Ubicación', 'error');
      void Linking.openSettings();
    }
  };

  // Pausa general: deja de enviar la ubicación sin tocar la lista de "Compartido con".
  const cambiarEnvio = async (compartir: boolean) => {
    if (!user) return;
    const pausar = !compartir;
    setPausada(pausar);
    try {
      await guardarPausa(user.id, pausar);
      if (pausar) {
        await detenerUbicacionAutomatica();
        showToast('Pausaste el envío de tu ubicación', 'success');
        return;
      }
      showToast('Volviste a compartir tu ubicación', 'success');
      if (compartidos.length > 0) {
        if (envio === 'activo') await iniciarUbicacionAutomatica();
        else if (envio !== 'no-disponible') setExplicarPermiso(true);
      }
    } catch {
      setPausada(!pausar);
      showToast('No se pudo cambiar el envío de tu ubicación', 'error');
    }
  };

  const compartirCon = async (candidato: Candidato) => {
    try {
      const nuevo = await ubicacionesApi.compartir(candidato.id);
      setCompartidos((prev) => [nuevo, ...prev]);
      setCandidatos((prev) => prev.filter((c) => c.id !== candidato.id));
      setPickerOpen(false);
      showToast(`Ahora compartís tu ubicación con ${candidato.nombre}`, 'success');
      if (envio === 'activo') await iniciarUbicacionAutomatica();
      else if (envio !== 'no-disponible') setExplicarPermiso(true);
    } catch {
      showToast('No se pudo compartir la ubicación', 'error');
    }
  };

  const revocarA = async (c: UbicacionCompartida) => {
    try {
      await ubicacionesApi.revocar(c.usuarioId);
      // Si ya no la comparte con nadie, deja de enviarla.
      if (compartidos.length === 1) await detenerUbicacionAutomatica();
      setCompartidos((prev) => prev.filter((x) => x.usuarioId !== c.usuarioId));
      setCandidatos((prev) => [
        ...prev,
        { id: c.usuario.id, nombre: c.usuario.nombre, apellido: c.usuario.apellido, rol: c.usuario.tipoUsuario === 'TUTOR' ? 'Tutor' : 'Profesional' },
      ]);
      showToast(`Se revocó el acceso de ${c.usuario.nombre}`, 'success');
    } catch {
      showToast('No se pudo revocar el acceso', 'error');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <Cabecera titulo="Ubicación" subtitulo="Tu lugar y con quién lo compartís" onVolver={() => volver(router, '/(app)')} volverLabel="Volver al inicio" />
        <View style={styles.content}>
          <Skeleton height={260} borderRadius={DS.radius.featured} />
          <Skeleton height={92} borderRadius={DS.radius.card} />
          <Skeleton height={54} borderRadius={DS.radius.control} />
        </View>
      </View>
    );
  }

  const envioOk = envio === 'activo' && compartidos.length > 0;
  const estadoEnvio = compartidos.length === 0
    ? { icono: 'pause-circle-outline' as const, tono: 'neutral' as const, titulo: 'Envío automático en pausa', texto: 'Se activa cuando compartís tu ubicación con alguien.' }
    : envio === 'activo'
      ? { icono: 'radio-outline' as const, tono: 'success' as const, titulo: 'Envío automático activo', texto: 'Tu ubicación se envía sola cada minuto, también con la app cerrada. Gasta más batería y datos.' }
      : {
          icono: 'warning-outline' as const, tono: 'warning' as const, titulo: 'Falta un permiso',
          texto: envio === 'sin-permiso-fondo'
            ? 'Con la app cerrada no se envía. Permití la ubicación "todo el tiempo".'
            : 'La app no tiene permiso para usar tu ubicación.',
        };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Cabecera titulo="Ubicación" subtitulo="Tu lugar y con quién lo compartís" onVolver={() => volver(router, '/(app)')} volverLabel="Volver al inicio" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }} tintColor={DS.colors.primary} colors={[DS.colors.primary]} />
        }
      >
        <View>
          <Card featured style={styles.mapaCard}>
            {ubicacion ? (
              <UbicacionMapa latitud={ubicacion.latitud} longitud={ubicacion.longitud} precision={ubicacion.precision} titulo="Mi ubicación" />
            ) : (
              <View style={styles.mapaVacio}>
                <AppIcon name="location-outline" size={40} color={DS.colors.textTertiary} />
                <Text style={styles.vacioTexto}>Todavía no registraste tu ubicación</Text>
              </View>
            )}
          </Card>
          {ubicacion && (
            <View style={styles.mapaPie}>
              <Chip label={`Enviada ${formatFecha(ubicacion.fechaHora)}`} tone="neutral" />
            </View>
          )}
        </View>

        {/* El interruptor se ve siempre (también en la web); el estado del envío automático, solo donde existe. */}
        <Card style={styles.bloque}>
          <View style={styles.filaSwitch}>
            <View style={[styles.icono, { backgroundColor: DS.colors.accentSoft }]}>
              <AppIcon name="location" size={22} color={DS.colors.accent} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.bloqueTitulo}>Compartir mi ubicación</Text>
              <Text style={styles.bloqueTexto}>
                {pausada
                  ? 'En pausa. Nadie recibe tu ubicación nueva, pero las personas de la lista conservan el acceso.'
                  : 'Activado. Se envía a las personas de la lista "Compartido con".'}
              </Text>
            </View>
            <Switch
              value={!pausada}
              onValueChange={cambiarEnvio}
              color={DS.colors.primary}
              accessibilityLabel="Compartir mi ubicación"
              accessibilityRole="switch"
            />
          </View>

          {!pausada && envio !== 'no-disponible' && (
            <View style={[styles.estadoEnvio, envioOk && styles.estadoEnvioOk]}>
              <AppIcon
                name={estadoEnvio.icono}
                size={22}
                color={estadoEnvio.tono === 'success' ? DS.colors.success : estadoEnvio.tono === 'warning' ? DS.colors.warning : DS.colors.textSecondary}
              />
              <View style={styles.flex}>
                <Text style={styles.bloqueTitulo} accessibilityRole="header">{estadoEnvio.titulo}</Text>
                <Text style={styles.bloqueTexto}>{estadoEnvio.texto}</Text>
                {compartidos.length > 0 && envio !== 'activo' && (
                  <View style={styles.darPermiso}>
                    <Button label="Dar permiso" height={44} onPress={() => setExplicarPermiso(true)} accessibilityLabel="Dar permiso de ubicación" />
                  </View>
                )}
              </View>
            </View>
          )}
        </Card>

        <Button
          label={registrando ? 'Enviando...' : 'Enviar mi ubicación ahora'}
          variant="secondary"
          onPress={registrarUbicacion}
          loading={registrando}
          disabled={pausada}
          accessibilityLabel={registrando ? 'Enviando ubicación' : pausada ? 'Enviar mi ubicación ahora, no disponible mientras el envío está en pausa' : 'Enviar mi ubicación ahora'}
        />

        <View>
          <SectionHeader
            title="Compartido con"
            actionLabel={candidatos.length > 0 ? (pickerOpen ? 'Cerrar' : '+ Agregar') : undefined}
            onAction={() => setPickerOpen((v) => !v)}
          />

          {pickerOpen && (
            <Card style={styles.picker}>
              {candidatos.map((c, i) => (
                <Tappable
                  key={c.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Compartir con ${c.nombre} ${c.apellido}, ${c.rol}`}
                  style={[styles.fila, i < candidatos.length - 1 && styles.filaBorde]}
                  onPress={() => compartirCon(c)}
                >
                  <Avatar nombre={c.nombre} apellido={c.apellido} size={40} />
                  <View style={styles.flex}>
                    <Text style={styles.nombre}>{c.nombre} {c.apellido}</Text>
                    <Text style={styles.rol}>{c.rol}</Text>
                  </View>
                  <AppIcon name="person-add-outline" size={20} color={DS.colors.accent} />
                </Tappable>
              ))}
            </Card>
          )}

          {compartidos.length === 0 ? (
            <Card style={styles.vacioCard}>
              <AppIcon name="people-outline" size={30} color={DS.colors.textTertiary} />
              <Text style={styles.vacioTexto}>No compartiste tu ubicación con nadie todavía</Text>
            </Card>
          ) : (
            <View style={styles.lista}>
              {compartidos.map((c) => (
                <Card key={c.usuarioId} style={styles.fila}>
                  <Avatar nombre={c.usuario.nombre} apellido={c.usuario.apellido} />
                  <View style={styles.flex}>
                    <Text style={styles.nombre}>{c.usuario.nombre} {c.usuario.apellido}</Text>
                    <Text style={styles.rol}>{c.usuario.tipoUsuario === 'TUTOR' ? 'Tutor' : 'Profesional'}</Text>
                  </View>
                  <Tappable
                    centrado
                    accessibilityRole="button"
                    accessibilityLabel={`Dejar de compartir con ${c.usuario.nombre} ${c.usuario.apellido}`}
                    style={styles.quitar}
                    onPress={() => revocarA(c)}
                  >
                    <Text style={styles.quitarTexto}>Quitar</Text>
                  </Tappable>
                </Card>
              ))}
            </View>
          )}
        </View>

        <ConfirmDialog
          visible={explicarPermiso}
          icon="location-outline"
          title="¿Enviar tu ubicación automáticamente?"
          message={'Así las personas con las que la compartís pueden ver dónde estás sin que tengas que abrir la app. En la próxima pantalla elegí "Permitir todo el tiempo". Mientras se envía, vas a ver una notificación fija.'}
          cancelLabel="Ahora no"
          confirmLabel="Continuar"
          onCancel={() => setExplicarPermiso(false)}
          onConfirm={activarEnvio}
        />
      </ScrollView>
      <Toast {...toast} onClose={hideToast} />
    </View>
  );
}

type EstadoVisor = 'idle' | 'loading' | 'sin-acceso' | 'sin-ubicacion' | 'ok' | 'error';

/**
 * Tutor y Profesional: al entrar se ve la lista de PCD que pueden consultar
 * (personas a cargo o pacientes). Al tocar uno se
 * muestra su última ubicación registrada.
 */
function UbicacionVisor() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast, showToast, hideToast } = useToast();
  const params = useLocalSearchParams<{ pcdId?: string; pcdNombre?: string; pcdApellido?: string }>();
  const [pcdList, setPcdList] = useState<PcdItem[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [selectedPcd, setSelectedPcd] = useState<PcdItem | null>(
    params.pcdId && params.pcdNombre && params.pcdApellido
      ? { id: Number(params.pcdId), nombre: params.pcdNombre, apellido: params.pcdApellido }
      : null
  );
  const [pcdSearch, setPcdSearch] = useState('');
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [estado, setEstado] = useState<EstadoVisor>('idle');
  // Lugar del historial que se muestra en el mapa en vez de la última ubicación.
  const [elegido, setElegido] = useState<(PuntoElegido & { pcdId: number }) | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const nombres = user?.tipoUsuario === 'TUTOR'
    ? { plural: 'personas a cargo', vacio: 'No tenés personas a cargo' }
    : { plural: 'pacientes', vacio: 'No tenés pacientes vinculados' };

  useEffect(() => {
    if (!user) return;
    let pedido: Promise<PcdItem[]> = Promise.resolve([]);
    if (user.tipoUsuario === 'PROFESIONAL') {
      pedido = vinculosApi.getAll({ profesionalId: user.id, estado: 'ACTIVO' })
        .then((list) => list.map((v) => ({ id: v.pcd.usuario.id, nombre: v.pcd.usuario.nombre, apellido: v.pcd.usuario.apellido })));
    } else if (user.tipoUsuario === 'TUTOR') {
      pedido = tutorPcdApi.getAll({ tutorId: user.id, estado: 'ACTIVO' })
        .then((list) => list.map((v) => ({ id: v.pcd.usuario.id, nombre: v.pcd.usuario.nombre, apellido: v.pcd.usuario.apellido })));
    }
    pedido
      .then((list) => setPcdList(
        [...list].sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)),
      ))
      .catch(() => showToast(`No se pudieron cargar tus ${nombres.plural}`, 'error'))
      .finally(() => setCargandoLista(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const cargarUbicacion = useCallback(async (pcdId: number) => {
    setEstado('loading');
    try {
      const u = await ubicacionesApi.getUltima(pcdId);
      setUbicacion(u);
      setEstado(u ? 'ok' : 'sin-ubicacion');
    } catch (err: any) {
      setEstado(err?.response?.status === 403 ? 'sin-acceso' : 'error');
    }
  }, []);

  // Ubicación en vivo: el backend reparte por socket cada posición nueva.
  const enVivo = useUbicacionEnVivo(
    selectedPcd && estado === 'ok' ? selectedPcd.id : null,
    (nueva) => setUbicacion(nueva),
    () => setEstado('sin-acceso'),
  );

  // Sin socket, la pantalla se actualiza sola cada 60 segundos mientras está abierta.
  useEffect(() => {
    if (!selectedPcd || estado !== 'ok' || enVivo === 'en-vivo') return;
    const pcdId = selectedPcd.id;
    const timer = setInterval(() => {
      ubicacionesApi.getUltima(pcdId).then((u) => u && setUbicacion(u)).catch(() => {});
    }, 60_000);
    return () => clearInterval(timer);
  }, [selectedPcd, estado, enVivo]);

  useEffect(() => {
    if (selectedPcd) {
      cargarUbicacion(selectedPcd.id);
    } else {
      setUbicacion(null);
      setEstado('idle');
    }
  }, [selectedPcd, cargarUbicacion]);

  // Solo vale mientras se mira a la misma persona.
  const punto = elegido && selectedPcd && elegido.pcdId === selectedPcd.id ? elegido : null;

  const pcdFiltrados = buscar(pcdList, pcdSearch, (p) => `${p.nombre} ${p.apellido}`, 0);

  if (!selectedPcd) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <Cabecera titulo="Ubicación" onVolver={() => volver(router, '/(app)')} volverLabel="Volver al inicio" />
        <View style={styles.heroPaso}>
          <Card dark featured style={styles.hero}>
            <OrbitDecor />
            <View style={styles.heroIcono}>
              <AppIcon name="location" size={26} color={DS.colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.heroTitulo}>Ubicación en vivo</Text>
              <Text style={styles.heroTexto}>Elegí a quién querés ver en el mapa.</Text>
            </View>
            {!cargandoLista && pcdList.length > 0 && (
              <Chip label={`${pcdList.length} ${pcdList.length === 1 ? 'persona' : 'personas'}`} tone="accent" />
            )}
          </Card>
        </View>
        <View style={styles.busqueda}>
          <SearchBar accessibilityLabel={`Buscar entre tus ${nombres.plural}`} placeholder="Buscar por nombre o apellido..." value={pcdSearch} onChangeText={setPcdSearch} />
        </View>
        {cargandoLista ? (
          <View style={styles.content}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={72} borderRadius={DS.radius.card} />
            ))}
          </View>
        ) : pcdList.length === 0 ? (
          <Vacio icono="people-outline" texto={nombres.vacio} />
        ) : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {pcdFiltrados.visibles.length === 0 ? (
              <Text style={styles.vacioTexto}>Sin resultados</Text>
            ) : pcdFiltrados.visibles.map((p) => (
              <Tappable
                key={p.id}
                style={styles.pcdFila}
                onPress={() => { setSelectedPcd(p); setPcdSearch(''); }}
                accessibilityRole="button"
                accessibilityLabel={`Ver la ubicación de ${p.nombre} ${p.apellido}`}
              >
                <AvatarRing initials={iniciales(p.nombre, p.apellido)} size={54} />
                <View style={styles.flex}>
                  <Text style={styles.nombre} numberOfLines={1}>{p.nombre} {p.apellido}</Text>
                  <View style={styles.verMapa}>
                    <AppIcon name="location" size={14} color={DS.colors.accent} />
                    <Text style={styles.verMapaTexto}>Ver en el mapa</Text>
                  </View>
                </View>
                <AppIcon name="chevron-forward" size={22} color={DS.colors.textTertiary} />
              </Tappable>
            ))}
            {pcdFiltrados.hayMas && (
              <Text style={styles.vacioTexto}>Hay más resultados. Escribí más para afinar la búsqueda.</Text>
            )}
          </ScrollView>
        )}
        <Toast {...toast} onClose={hideToast} />
      </View>
    );
  }

  const nombreCompleto = `${selectedPcd.nombre} ${selectedPcd.apellido}`;
  // Si se llegó desde otra pantalla (p. ej. "A cargo") con la persona ya elegida, la flecha vuelve a donde se estaba;
  // si no, vuelve a la lista de personas.
  const llegoConPersona = Boolean(params.pcdId);
  const volverAtras = llegoConPersona ? () => volver(router, '/(app)/mis-pcds') : () => setSelectedPcd(null);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Cabecera
        titulo={nombreCompleto}
        subtitulo="Ubicación"
        onVolver={volverAtras}
        volverLabel={llegoConPersona ? 'Volver a la pantalla anterior' : 'Volver a la lista para ver a otra persona'}
      />
      {estado === 'loading' ? (
        <View style={styles.content}><Skeleton height={280} borderRadius={DS.radius.featured} /></View>
      ) : estado === 'sin-acceso' ? (
        <Vacio icono="lock-closed-outline" texto={`${selectedPcd.nombre} no compartió su ubicación con vos`} />
      ) : estado === 'sin-ubicacion' ? (
        <Vacio icono="location-outline" texto={`${selectedPcd.nombre} todavía no registró su ubicación`} />
      ) : estado === 'error' ? (
        <Vacio icono="alert-circle-outline" texto="No se pudo cargar la ubicación" />
      ) : ubicacion ? (
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card featured style={styles.mapaCard}>
            {punto ? (
              <UbicacionMapa
                latitud={punto.estadia.latitud} longitud={punto.estadia.longitud}
                titulo={punto.direccion ?? `${nombreCompleto}, ${punto.horario}`}
              />
            ) : (
              <UbicacionMapa
                latitud={ubicacion.latitud} longitud={ubicacion.longitud} precision={ubicacion.precision}
                titulo={nombreCompleto}
              />
            )}
          </Card>

          {punto && (
            <Card style={styles.punto}>
              <View accessibilityLiveRegion="polite" style={styles.puntoCuerpo}>
                <AppIcon name="time-outline" size={20} color={DS.colors.accent} />
                <Text style={styles.puntoTexto} numberOfLines={2}>
                  Mostrando el historial: {punto.horario}{punto.direccion ? ` · ${punto.direccion}` : ''}
                </Text>
              </View>
              <Button label="Volver a la última" variant="secondary" height={44} onPress={() => setElegido(null)} />
            </Card>
          )}

          <Card style={styles.estadoVivo}>
            <View style={styles.flex} accessibilityLiveRegion="polite">
              <Text style={styles.bloqueTitulo}>Registrada {formatFecha(ubicacion.fechaHora)}</Text>
              <Text style={styles.bloqueTexto}>
                {enVivo === 'en-vivo'
                  ? 'Se actualiza en tiempo real'
                  : enVivo === 'sin-conexion'
                    ? 'Sin conexión en vivo (se actualiza cada minuto)'
                    : 'Conectando en vivo...'}
              </Text>
            </View>
            <Chip label={enVivo === 'en-vivo' ? 'En vivo' : 'Sin vivo'} tone={enVivo === 'en-vivo' ? 'success' : 'neutral'} />
          </Card>

          <Button label="Actualizar" variant="secondary" onPress={() => cargarUbicacion(selectedPcd.id)} accessibilityLabel="Actualizar la ubicación" />

          <HistorialUbicaciones
            pcdId={selectedPcd.id}
            nombre={nombreCompleto}
            elegidoId={punto?.estadia.id ?? null}
            onElegir={(p) => {
              setElegido({ ...p, pcdId: selectedPcd.id });
              scrollRef.current?.scrollTo({ y: 0, animated: true });
            }}
          />
        </ScrollView>
      ) : null}
      <Toast {...toast} onClose={hideToast} />
    </View>
  );
}

export default function UbicacionesScreen() {
  const { user } = useAuthStore();
  if (!user) return null;
  if (user.tipoUsuario === 'PCD') return <MiUbicacion />;
  // El Administrador no ve ubicaciones: son opt-in del PCD.
  if (user.tipoUsuario === 'ADMINISTRADOR') {
    return (
      <View style={styles.container}>
        <Cabecera titulo="Ubicación" />
        <Vacio icono="lock-closed-outline" texto="El Administrador no tiene acceso a las ubicaciones de los PCD." />
      </View>
    );
  }
  return <UbicacionVisor />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: DS.colors.background },
  content: { paddingHorizontal: DS.space.screen, paddingTop: 8, paddingBottom: 56, gap: DS.space.section },

  heroPaso: { paddingHorizontal: DS.space.screen, paddingTop: 8, paddingBottom: 12 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, overflow: 'hidden' },
  heroIcono: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: DS.colors.onPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitulo: { fontFamily: DS.font.bold, fontSize: 18, color: DS.colors.onPrimary },
  heroTexto: { fontFamily: DS.font.regular, fontSize: 13, color: DS.colors.onPrimaryMuted, marginTop: 2 },
  verMapa: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  verMapaTexto: { fontFamily: DS.font.medium, fontSize: 13, color: DS.colors.accent },
  busqueda: { paddingHorizontal: DS.space.screen, paddingBottom: 4, zIndex: 10 },

  avatar: { backgroundColor: DS.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontFamily: DS.font.bold, color: DS.colors.accent },
  icono: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  mapaCard: { height: 280, overflow: 'hidden' },
  mapaVacio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  mapaPie: { marginTop: 10, flexDirection: 'row' },

  bloque: { padding: 16, gap: 14 },
  filaSwitch: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bloqueTitulo: { fontFamily: DS.font.semibold, fontSize: 15, color: DS.colors.text },
  bloqueTexto: { fontFamily: DS.font.regular, fontSize: 13, lineHeight: 19, color: DS.colors.textSecondary, marginTop: 2 },
  estadoEnvio: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14,
    borderRadius: DS.radius.control, backgroundColor: DS.colors.background,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  estadoEnvioOk: { backgroundColor: DS.colors.successSoft, borderColor: '#99F6E4' },
  darPermiso: { marginTop: 10, alignSelf: 'flex-start' },

  lista: { gap: 10 },
  picker: { marginBottom: 10, overflow: 'hidden' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 72 },
  filaBorde: { borderBottomWidth: DS.border, borderBottomColor: DS.colors.border },
  pcdFila: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 72,
    backgroundColor: DS.colors.surface, borderRadius: DS.radius.card,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  nombre: { fontFamily: DS.font.semibold, fontSize: 15, color: DS.colors.text },
  rol: { fontFamily: DS.font.regular, fontSize: 13, color: DS.colors.textTertiary },
  quitar: {
    minHeight: 40, paddingHorizontal: 14, borderRadius: DS.radius.chip,
    borderWidth: DS.border, borderColor: '#FECACA', backgroundColor: DS.colors.errorSoft,
  },
  quitarTexto: { fontFamily: DS.font.semibold, fontSize: 13, color: DS.colors.error },

  punto: { padding: 14, gap: 12, backgroundColor: DS.colors.accentSoft, borderColor: '#C7D2FE' },
  puntoCuerpo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  puntoTexto: { flex: 1, fontFamily: DS.font.medium, fontSize: 14, color: DS.colors.text },
  estadoVivo: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  vacioIcono: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: DS.colors.surface,
    borderWidth: DS.border, borderColor: DS.colors.border, alignItems: 'center', justifyContent: 'center',
  },
  vacioCard: { alignItems: 'center', gap: 8, padding: 24 },
  vacioTexto: { fontFamily: DS.font.regular, fontSize: 14, lineHeight: 20, color: DS.colors.textSecondary, textAlign: 'center' },
});
