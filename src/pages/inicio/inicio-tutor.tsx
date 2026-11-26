import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Modal, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { actividadesApi } from '@/api/actividades';
import { notificacionesApi } from '@/api/notificaciones';
import { tutorPcdApi } from '@/api/tutor-pcd';
import { ubicacionesApi } from '@/api/ubicaciones';
import { AppIcon, Tappable } from '@/components/a11y';
import { AvatarRing, Button, Card, Chip, Entrar, ProgressRing, SectionHeader } from '@/components/ds';
import { Skeleton } from '@/components/Skeleton';
import { UbicacionMapa } from '@/components/UbicacionMapa';
import { DS } from '@/constants/tokens';
import { useAuthStore } from '@/store/auth.store';
import { Actividad, ActividadInstancia, TipoActividad } from '@/types/actividad.types';
import { Ubicacion } from '@/types/ubicacion.types';
import { hoyLocal } from '@/utils/date';
import { direccionDe } from '@/utils/direccion';

interface PersonaACargo { id: number; nombre: string; apellido: string }
interface Sesion { actividad: Actividad; instancia: ActividadInstancia }

const CATEGORIA: Record<TipoActividad, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  MEDICAMENTO: { label: 'Medicamento', icon: 'medkit-outline' },
  EJERCICIO: { label: 'Ejercicio', icon: 'barbell-outline' },
  TERAPIA: { label: 'Terapia', icon: 'pulse-outline' },
  PERSONALIZADA: { label: 'Personalizada', icon: 'star-outline' },
};

function saludo(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function fechaLarga(): string {
  const t = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

const iniciales = (nombre: string, apellido: string) =>
  `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();

function sesionesDeHoy(actividades: Actividad[]): Sesion[] {
  const hoy = hoyLocal();
  return actividades
    .flatMap((actividad) =>
      (actividad.instancias ?? [])
        .filter((i) => i.fechaProgramada.slice(0, 10) === hoy && i.estado !== 'CANCELADA')
        .map((instancia) => ({ actividad, instancia })),
    )
    .sort((a, b) => (a.actividad.horarioInicio ?? '').localeCompare(b.actividad.horarioInicio ?? ''));
}

function horaDe(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function DashboardTutor() {
  const router = useRouter();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [cargandoPcds, setCargandoPcds] = useState(true);
  const [errorPcds, setErrorPcds] = useState(false);
  const [pcds, setPcds] = useState<PersonaACargo[]>([]);
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);

  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [direccion, setDireccion] = useState<string | null>(null);

  const cargarPcds = useCallback(async () => {
    if (!user) return;
    try {
      const vinculos = await tutorPcdApi.getAll({ tutorId: user.id, estado: 'ACTIVO' });
      const lista = vinculos.map((v) => ({
        id: v.pcd.usuario.id, nombre: v.pcd.usuario.nombre, apellido: v.pcd.usuario.apellido,
      }));
      setPcds(lista);
      // Se conserva la persona elegida si sigue vinculada; si no, la primera.
      setSeleccionId((actual) => (actual != null && lista.some((p) => p.id === actual) ? actual : lista[0]?.id ?? null));
      setErrorPcds(false);
    } catch {
      setErrorPcds(true);
    } finally {
      setCargandoPcds(false);
    }
    notificacionesApi.countNoLeidas().then((r) => setNoLeidas(r.total)).catch(() => {});
  }, [user]);

  useFocusEffect(useCallback(() => { cargarPcds(); }, [cargarPcds]));

  const cargarDetalle = useCallback(async (pcdId: number) => {
    // La ubicación puede fallar (sin permiso, sin datos) sin tirar abajo las actividades.
    const [acts, ubi] = await Promise.allSettled([
      actividadesApi.getAll(pcdId),
      ubicacionesApi.getUltima(pcdId),
    ]);
    if (acts.status === 'fulfilled') {
      setSesiones(sesionesDeHoy(acts.value));
      setErrorDetalle(false);
    } else {
      setErrorDetalle(true);
    }
    const u = ubi.status === 'fulfilled' ? ubi.value : null;
    setUbicacion(u);
    setDireccion(u ? await direccionDe(u.latitud, u.longitud) : null);
  }, []);

  useEffect(() => {
    if (seleccionId == null) { setSesiones([]); setUbicacion(null); setDireccion(null); return; }
    let vigente = true;
    setCargandoDetalle(true);
    cargarDetalle(seleccionId).finally(() => { if (vigente) setCargandoDetalle(false); });
    return () => { vigente = false; };
  }, [seleccionId, cargarDetalle]);

  const refrescar = async () => {
    setRefrescando(true);
    await cargarPcds();
    if (seleccionId != null) await cargarDetalle(seleccionId);
    setRefrescando(false);
  };

  const seleccionada = pcds.find((p) => p.id === seleccionId) ?? null;
  const realizadas = sesiones.filter((s) => s.instancia.estado === 'REALIZADA').length;
  const pendientes = sesiones.filter((s) => s.instancia.estado === 'PENDIENTE').length;
  const porcentaje = sesiones.length > 0 ? (realizadas / sesiones.length) * 100 : 0;

  const ir = (ruta: string) => router.navigate(ruta as any);

  const header = (
    <View style={styles.header}>
      <AvatarRing initials={iniciales(user?.nombre ?? '', user?.apellido ?? '')} size={46} />
      <View style={styles.headerText}>
        <Text style={styles.fecha}>{fechaLarga()}</Text>
        <Text style={styles.saludo} numberOfLines={1} accessibilityRole="header">{saludo()}, {user?.nombre}</Text>
      </View>
      <Tappable
        centrado
        style={styles.bell}
        onPress={() => ir('/(app)/notificaciones')}
        accessibilityRole="button"
        accessibilityLabel={`Notificaciones${noLeidas > 0 ? `, ${noLeidas} sin leer` : ''}`}
      >
        <AppIcon name="notifications-outline" size={22} color={DS.colors.text} />
        {noLeidas > 0 && <View style={styles.bellDot} />}
      </Tappable>
    </View>
  );

  if (cargandoPcds) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
        <StatusBar style="dark" />
        {header}
        <View style={styles.body}>
          <Skeleton height={76} borderRadius={DS.radius.card} />
          <Skeleton height={140} borderRadius={DS.radius.featured} />
          <Skeleton height={210} borderRadius={DS.radius.card} />
          <Skeleton height={72} borderRadius={DS.radius.card} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <StatusBar style="dark" />
      {header}
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={DS.colors.primary} colors={[DS.colors.primary]} />}
      >
        {errorPcds && (
          <Card style={styles.aviso}>
            <Text style={styles.avisoTexto}>No se pudo cargar la información. Revisá tu conexión.</Text>
            <Button label="Reintentar" variant="secondary" height={44} onPress={cargarPcds} />
          </Card>
        )}

        {!errorPcds && pcds.length === 0 && (
          <Card style={styles.vacioCard}>
            <AppIcon name="people-outline" size={30} color={DS.colors.textTertiary} />
            <Text style={styles.vacioTitulo}>Sin personas a cargo</Text>
            <Text style={styles.vacioTexto}>Cuando te vinculen con una persona, vas a ver acá su día.</Text>
          </Card>
        )}

        {seleccionada && (
          <>
            <Tappable
              onPress={() => pcds.length > 1 && setSelectorAbierto(true)}
              accessibilityRole="button"
              accessibilityLabel={`Persona a cargo: ${seleccionada.nombre} ${seleccionada.apellido}.${pcds.length > 1 ? ' Tocá para elegir otra' : ''}`}
              style={styles.selector}
              activeOpacity={pcds.length > 1 ? 0.8 : 1}
            >
              <AvatarRing initials={iniciales(seleccionada.nombre, seleccionada.apellido)} size={48} />
              <View style={styles.headerText}>
                <Text style={styles.selectorLabel}>Persona a cargo</Text>
                <Text style={styles.selectorNombre} numberOfLines={1}>{seleccionada.nombre} {seleccionada.apellido}</Text>
              </View>
              {pcds.length > 1 && <AppIcon name="chevron-down" size={22} color={DS.colors.textTertiary} />}
            </Tappable>

            {cargandoDetalle ? (
              <View style={styles.bloques}>
                <Skeleton height={140} borderRadius={DS.radius.featured} />
                <Skeleton height={210} borderRadius={DS.radius.card} />
                <Skeleton height={72} borderRadius={DS.radius.card} />
              </View>
            ) : (
              <>
                {errorDetalle && (
                  <Card style={styles.aviso}>
                    <Text style={styles.avisoTexto}>No se pudieron cargar las actividades de hoy.</Text>
                    <Button label="Reintentar" variant="secondary" height={44} onPress={() => seleccionId != null && cargarDetalle(seleccionId)} />
                  </Card>
                )}

                <Entrar>
                <Card dark featured style={styles.progreso}>
                  <ProgressRing percent={porcentaje} />
                  <View style={styles.progresoTexto}>
                    <Text style={styles.progresoTitulo}>Progreso de hoy</Text>
                    <View style={styles.contadores}>
                      <View>
                        <Text style={styles.contador}>{realizadas}</Text>
                        <Text style={styles.contadorLabel}>Realizadas</Text>
                      </View>
                      <View>
                        <Text style={styles.contador}>{pendientes}</Text>
                        <Text style={styles.contadorLabel}>Pendientes</Text>
                      </View>
                    </View>
                  </View>
                </Card>
                </Entrar>

                <View>
                  <SectionHeader
                    title="Ubicación"
                    note={ubicacion ? `Actualizado ${horaDe(ubicacion.fechaHora)}` : undefined}
                  />
                  <Card style={styles.ubicacionCard}>
                    {ubicacion ? (
                      <>
                        <View style={styles.mapa} pointerEvents="none">
                          <UbicacionMapa
                            latitud={ubicacion.latitud} longitud={ubicacion.longitud}
                            precision={ubicacion.precision} titulo={seleccionada.nombre} compacto
                          />
                        </View>
                        <View style={styles.ubicacionInfo}>
                          <View style={styles.headerText}>
                            <Text style={styles.direccion} numberOfLines={2}>
                              {direccion ?? 'Ubicación actual'}
                            </Text>
                          </View>
                          <Button label="Ver mapa" variant="secondary" height={44} onPress={() => ir('/(app)/ubicaciones')} />
                        </View>
                      </>
                    ) : (
                      <View style={styles.ubicacionVacia}>
                        <AppIcon name="location-outline" size={28} color={DS.colors.textTertiary} />
                        <Text style={styles.vacioTexto}>
                          {seleccionada.nombre} todavía no compartió su ubicación.
                        </Text>
                      </View>
                    )}
                  </Card>
                </View>

                <View>
                  <SectionHeader title="Actividades de hoy" actionLabel="Ver todas" onAction={() => ir('/(app)/actividades')} />
                  <View style={styles.lista}>
                    {sesiones.length === 0 ? (
                      <Card style={styles.vacioCard}>
                        <AppIcon name="sunny-outline" size={30} color={DS.colors.textTertiary} />
                        <Text style={styles.vacioTexto}>No hay actividades programadas para hoy.</Text>
                      </Card>
                    ) : (
                      <>
                        {pendientes === 0 && (
                          <Card style={styles.vacioCard}>
                            <AppIcon name="checkmark-circle" size={30} color={DS.colors.success} />
                            <Text style={styles.vacioTexto}>No quedan actividades pendientes para hoy.</Text>
                          </Card>
                        )}
                        {sesiones.map(({ actividad, instancia }) => {
                          const cat = CATEGORIA[actividad.tipoActividad];
                          const hecha = instancia.estado === 'REALIZADA';
                          const hora = actividad.horarioInicio?.slice(0, 5);
                          const detalle = [cat.label, hora].filter(Boolean).join(' · ');
                          return (
                            <Tappable
                              key={instancia.id}
                              onPress={() => ir(`/(app)/actividades/${actividad.id}`)}
                              accessibilityRole="button"
                              accessibilityLabel={`${actividad.titulo}, ${detalle}, ${hecha ? 'completada' : 'pendiente'}`}
                              style={styles.actividad}
                            >
                              <View style={styles.actIcono}>
                                <AppIcon name={cat.icon} size={22} color={DS.colors.accent} />
                              </View>
                              <View style={styles.headerText}>
                                <Text style={styles.actTitulo} numberOfLines={1}>{actividad.titulo}</Text>
                                <Text style={styles.actDetalle} numberOfLines={1}>{detalle}</Text>
                              </View>
                              <Chip label={hecha ? 'Completada' : 'Pendiente'} tone={hecha ? 'success' : 'warning'} />
                            </Tappable>
                          );
                        })}
                      </>
                    )}
                  </View>
                </View>
              </>
            )}

            <View>
              <SectionHeader title="Accesos rápidos" />
              <View style={styles.accesos}>
                {([
                  { label: 'Actividades', icon: 'clipboard-outline', ruta: '/(app)/actividades' },
                  { label: 'Reportes', icon: 'stats-chart-outline', ruta: '/(app)/reportes' },
                  { label: 'Calendario', icon: 'calendar-outline', ruta: '/(app)/calendario' },
                  { label: 'Historial', icon: 'time-outline', ruta: '/(app)/ubicaciones' },
                ] as const).map((a) => (
                  <Tappable
                    key={a.label}
                    onPress={() => ir(a.ruta)}
                    accessibilityRole="button"
                    accessibilityLabel={a.label}
                    style={styles.acceso}
                  >
                    <View style={styles.accesoIcono}>
                      <AppIcon name={a.icon} size={24} color={DS.colors.text} />
                    </View>
                    <Text style={styles.accesoLabel} numberOfLines={1}>{a.label}</Text>
                  </Tappable>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={selectorAbierto} transparent animationType="fade" onRequestClose={() => setSelectorAbierto(false)}>
        <View style={styles.modalFondo}>
          <Tappable
            style={StyleSheet.absoluteFill}
            onPress={() => setSelectorAbierto(false)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar selector"
            activeOpacity={1}
          />
          <View style={[styles.modalHoja, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.modalTitulo} accessibilityRole="header">Persona a cargo</Text>
            {pcds.map((p) => {
              const activa = p.id === seleccionId;
              return (
                <Tappable
                  key={p.id}
                  onPress={() => { setSeleccionId(p.id); setSelectorAbierto(false); }}
                  accessibilityRole="radio"
                  accessibilityLabel={`${p.nombre} ${p.apellido}`}
                  selected={activa}
                  style={styles.opcion}
                >
                  <AvatarRing initials={iniciales(p.nombre, p.apellido)} size={48} />
                  <Text style={[styles.opcionNombre, activa && styles.opcionActiva]} numberOfLines={1}>
                    {p.nombre} {p.apellido}
                  </Text>
                  {activa && <AppIcon name="checkmark-circle" size={22} color={DS.colors.accent} />}
                </Tappable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.colors.background },
  body: { paddingHorizontal: DS.space.screen, paddingTop: 16, paddingBottom: 56, gap: DS.space.section },
  bloques: { gap: DS.space.section },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: DS.space.screen },
  avatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: DS.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: DS.font.bold, fontSize: 16, color: DS.colors.onPrimary },
  headerText: { flex: 1, gap: 2 },
  fecha: { fontFamily: DS.font.regular, fontSize: 13, color: DS.colors.textTertiary },
  saludo: { fontFamily: DS.font.bold, fontSize: 20, color: DS.colors.text },
  bell: {
    width: 46, height: 46, borderRadius: 23, borderWidth: DS.border, borderColor: DS.colors.border,
    backgroundColor: DS.colors.surface,
  },
  bellDot: {
    position: 'absolute', top: 10, right: 11, width: 10, height: 10, borderRadius: 5,
    backgroundColor: DS.colors.notification, borderWidth: 2, borderColor: DS.colors.surface,
  },

  selector: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 72,
    backgroundColor: DS.colors.surface, borderRadius: DS.radius.card,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  selectorAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: DS.colors.successSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  selectorAvatarText: { fontFamily: DS.font.bold, fontSize: 15, color: DS.colors.success },
  selectorLabel: { fontFamily: DS.font.medium, fontSize: 12, color: DS.colors.textTertiary },
  selectorNombre: { fontFamily: DS.font.semibold, fontSize: 16, color: DS.colors.text },

  progreso: { flexDirection: 'row', alignItems: 'center', gap: 20, padding: 20 },
  progresoTexto: { flex: 1, gap: 12 },
  progresoTitulo: { fontFamily: DS.font.semibold, fontSize: 15, color: DS.colors.onPrimaryMuted },
  contadores: { flexDirection: 'row', gap: 28 },
  contador: { fontFamily: DS.font.bold, fontSize: 28, color: DS.colors.onPrimary },
  contadorLabel: { fontFamily: DS.font.regular, fontSize: 13, color: DS.colors.onPrimaryMuted },

  ubicacionCard: { overflow: 'hidden' },
  mapa: { height: 130 },
  ubicacionInfo: { padding: 14, gap: 12 },
  direccion: { fontFamily: DS.font.semibold, fontSize: 15, color: DS.colors.text, marginBottom: 6 },
  ubicacionVacia: { alignItems: 'center', gap: 8, padding: 24 },

  lista: { gap: 10 },
  actividad: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 72,
    backgroundColor: DS.colors.surface, borderRadius: DS.radius.card,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  actIcono: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: DS.colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  actTitulo: { fontFamily: DS.font.semibold, fontSize: 15, color: DS.colors.text },
  actDetalle: { fontFamily: DS.font.regular, fontSize: 13, color: DS.colors.textTertiary },

  accesos: { flexDirection: 'row', gap: 10 },
  acceso: { flex: 1, alignItems: 'center', gap: 8, paddingHorizontal: 0 },
  accesoIcono: {
    width: 58, height: 58, borderRadius: DS.radius.card, backgroundColor: DS.colors.surface,
    borderWidth: DS.border, borderColor: DS.colors.border, alignItems: 'center', justifyContent: 'center',
  },
  accesoLabel: { fontFamily: DS.font.medium, fontSize: 12, color: DS.colors.textSecondary },

  aviso: { padding: 16, gap: 12 },
  avisoTexto: { fontFamily: DS.font.medium, fontSize: 14, color: DS.colors.error },
  vacioCard: { alignItems: 'center', gap: 8, padding: 24 },
  vacioTitulo: { fontFamily: DS.font.semibold, fontSize: 16, color: DS.colors.text },
  vacioTexto: { fontFamily: DS.font.regular, fontSize: 14, lineHeight: 20, color: DS.colors.textSecondary, textAlign: 'center' },

  modalFondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  modalHoja: {
    backgroundColor: DS.colors.surface, borderTopLeftRadius: DS.radius.featured, borderTopRightRadius: DS.radius.featured,
    padding: DS.space.screen, gap: 4,
  },
  modalTitulo: { fontFamily: DS.font.bold, fontSize: 18, color: DS.colors.text, marginBottom: 8 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  opcionNombre: { flex: 1, fontFamily: DS.font.medium, fontSize: 16, color: DS.colors.textSecondary },
  opcionActiva: { fontFamily: DS.font.bold, color: DS.colors.text },
});
