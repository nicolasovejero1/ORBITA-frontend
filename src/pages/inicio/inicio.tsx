import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { actividadesApi } from '@/api/actividades';
import { reportesApi } from '@/api/reportes';
import { usuariosApi } from '@/api/usuarios';
import { vinculosApi } from '@/api/vinculos';
import { AppIcon, Tappable } from '@/components/a11y';
import { Button, Card, Chip, Entrar, HomeHeader, OrbitDecor, ProgressRing, SectionHeader } from '@/components/ds';
import { Skeleton } from '@/components/Skeleton';
import { DS } from '@/constants/tokens';
import { TIPO_VISUAL } from '@/constants/actividad-visual';
import { useAuthStore } from '@/store/auth.store';
import { Actividad, ActividadInstancia } from '@/types/actividad.types';
import { hoyLocal } from '@/utils/date';
import DashboardTutor from './inicio-tutor';

interface SesionDelDia { actividad: Actividad; instancia: ActividadInstancia }
interface Acceso { label: string; icon: keyof typeof Ionicons.glyphMap; ruta: string }

/** Sesiones (instancias) programadas para hoy, de todas las actividades, ordenadas por horario. */
function sesionesDeHoy(actividades: Actividad[]): SesionDelDia[] {
  const hoy = hoyLocal();
  return actividades
    .flatMap((actividad) =>
      (actividad.instancias ?? [])
        .filter((inst) => inst.fechaProgramada.slice(0, 10) === hoy && inst.estado !== 'CANCELADA')
        .map((instancia) => ({ actividad, instancia })),
    )
    .sort((a, b) => (a.actividad.horarioInicio ?? '').localeCompare(b.actividad.horarioInicio ?? ''));
}

function Accesos({ items }: { items: Acceso[] }) {
  const router = useRouter();
  return (
    <Entrar delay={160}>
      <SectionHeader title="Accesos rápidos" />
      <View style={styles.accesos}>
        {items.map((a) => (
          <Tappable
            key={a.label}
            onPress={() => router.navigate(a.ruta as any)}
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
    </Entrar>
  );
}

function AvisoError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card style={styles.aviso}>
      <Text style={styles.avisoTexto}>No pudimos cargar toda la información. Algunos datos pueden estar incompletos.</Text>
      <Button label="Reintentar" variant="secondary" height={44} onPress={onRetry} />
    </Card>
  );
}

/** Tarjeta oscura con hasta 4 números clave. */
function ResumenOscuro({ titulo, items, anillo }: {
  titulo: string; items: { valor: string | number; label: string }[]; anillo?: number;
}) {
  return (
    <Entrar>
    <Card dark featured style={styles.resumen}>
      <OrbitDecor />
      {anillo !== undefined && <ProgressRing percent={anillo} />}
      <View style={styles.flex}>
        <Text style={styles.resumenTitulo}>{titulo}</Text>
        <View style={styles.resumenNumeros}>
          {items.map((i) => (
            <View key={i.label}>
              <Text style={styles.resumenValor}>{i.valor}</Text>
              <Text style={styles.resumenLabel}>{i.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </Card>
    </Entrar>
  );
}

function ActividadFila({ item, subtitulo, onPress }: { item: Actividad; subtitulo?: string; onPress: () => void }) {
  const completada = item.estado === 'COMPLETADA';
  const visual = TIPO_VISUAL[item.tipoActividad];
  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={`${item.titulo}${subtitulo ? `, ${subtitulo}` : ''}, ${completada ? 'completada' : 'pendiente'}`}
      style={styles.fila}
      onPress={onPress}
    >
      <View style={[styles.filaIcono, { backgroundColor: visual.bg }]}>
        <AppIcon name={visual.icon} size={22} color={visual.fg} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.filaTitulo} numberOfLines={1}>{item.titulo}</Text>
        {subtitulo ? <Text style={styles.filaSub} numberOfLines={1}>{subtitulo}</Text> : null}
      </View>
      <Chip label={completada ? 'Completada' : 'Pendiente'} tone={completada ? 'success' : 'warning'} />
    </Tappable>
  );
}

function SesionFila({ sesion, onPress }: { sesion: SesionDelDia; onPress: () => void }) {
  const { actividad, instancia } = sesion;
  const hecha = instancia.estado === 'REALIZADA';
  const visual = TIPO_VISUAL[actividad.tipoActividad];
  const hora = actividad.horarioInicio?.slice(0, 5);
  const detalle = [visual.label, hora].filter(Boolean).join(' · ');
  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={`${actividad.titulo}, ${detalle}, ${hecha ? 'completada' : 'pendiente'}`}
      style={styles.fila}
      onPress={onPress}
    >
      <View style={[styles.filaIcono, { backgroundColor: visual.bg }]}>
        <AppIcon name={visual.icon} size={22} color={visual.fg} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.filaTitulo} numberOfLines={1}>{actividad.titulo}</Text>
        <Text style={styles.filaSub} numberOfLines={1}>{detalle}</Text>
      </View>
      <Chip label={hecha ? 'Completada' : 'Pendiente'} tone={hecha ? 'success' : 'warning'} />
    </Tappable>
  );
}

function InicioSkeleton({ bloques = 3 }: { bloques?: number }) {
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <HomeHeader />
      <View style={styles.cuerpo}>
        <Skeleton height={140} borderRadius={DS.radius.featured} />
        {Array.from({ length: bloques }).map((_, i) => (
          <Skeleton key={i} height={72} borderRadius={DS.radius.card} />
        ))}
      </View>
    </View>
  );
}

function Pantalla({ children, refreshing, onRefresh }: { children: React.ReactNode; refreshing: boolean; onRefresh: () => void }) {
  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <HomeHeader />
      <ScrollView
        contentContainerStyle={styles.cuerpo}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={DS.colors.primary} colors={[DS.colors.primary]} />}
      >
        {children}
      </ScrollView>
    </View>
  );
}

function DashboardAdmin() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState({ total: 0, activos: 0, profesionales: 0, pcds: 0 });

  const cargar = useCallback(async () => {
    try {
      const usuarios = await usuariosApi.getAll();
      setStats({
        total: usuarios.length,
        activos: usuarios.filter((u) => u.estado === 'ACTIVO').length,
        profesionales: usuarios.filter((u) => u.tipoUsuario === 'PROFESIONAL').length,
        pcds: usuarios.filter((u) => u.tipoUsuario === 'PCD').length,
      });
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Se recarga cada vez que se vuelve al inicio.
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  if (loading) return <InicioSkeleton bloques={2} />;

  const accesos: Acceso[] = [
    { label: 'Usuarios', icon: 'people-outline', ruta: '/(app)/usuarios' },
    { label: 'Vínculos', icon: 'git-network-outline', ruta: '/(app)/vinculos' },
    { label: 'Medicamentos', icon: 'medkit-outline', ruta: '/(app)/medicamentos' },
    { label: 'Terapias', icon: 'pulse-outline', ruta: '/(app)/terapias' },
    // El Administrador puro no tiene pacientes ni ve ubicaciones; el Profesional con permisos de
    // administrador sí: ve a sus pacientes y las ubicaciones que le compartieron.
    ...(user?.tipoUsuario === 'PROFESIONAL'
      ? [
          { label: 'Pacientes', icon: 'people-circle-outline' as const, ruta: '/(app)/mis-pcds' },
          { label: 'Ubicación', icon: 'location-outline' as const, ruta: '/(app)/ubicaciones' },
        ]
      : []),
    { label: 'Avisos', icon: 'notifications-outline', ruta: '/(app)/notificaciones' },
  ];

  return (
    <Pantalla refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }}>
      {error && <AvisoError onRetry={cargar} />}
      <ResumenOscuro
        titulo="Resumen del sistema"
        items={[
          { valor: stats.total, label: 'Usuarios' },
          { valor: stats.activos, label: 'Activos' },
          { valor: stats.profesionales, label: 'Profesionales' },
          { valor: stats.pcds, label: 'PCDs' },
        ]}
      />
      <Accesos items={accesos} />
    </Pantalla>
  );
}

function DashboardProfesional() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [reportesAbiertos, setReportesAbiertos] = useState(0);
  const [pcdsCount, setPcdsCount] = useState(0);

  const cargar = useCallback(async () => {
    if (!user) return;
    try {
      const [acts, reps, vncs] = await Promise.all([
        actividadesApi.getAll(),
        reportesApi.getAll({ estado: 'EN_CURSO' }),
        vinculosApi.getAll({ profesionalId: user.id, estado: 'ACTIVO' }),
      ]);
      setActividades(acts);
      setReportesAbiertos(reps.length);
      setPcdsCount(vncs.length);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Se recarga cada vez que se vuelve al inicio (p. ej. después de confirmar una sesión).
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  if (loading) return <InicioSkeleton />;

  const pendientes = actividades.filter((a) => a.estado === 'PENDIENTE').length;
  const completadas = actividades.length - pendientes;
  const avance = actividades.length > 0 ? (completadas / actividades.length) * 100 : 0;
  const recientes = actividades.slice(0, 4);

  const accesos: Acceso[] = [
    { label: 'Pacientes', icon: 'people-circle-outline', ruta: '/(app)/mis-pcds' },
    { label: 'Actividades', icon: 'clipboard-outline', ruta: '/(app)/actividades' },
    { label: 'Reportes', icon: 'stats-chart-outline', ruta: '/(app)/reportes' },
    { label: 'Ubicación', icon: 'location-outline', ruta: '/(app)/ubicaciones' },
    { label: 'Calendario', icon: 'calendar-outline', ruta: '/(app)/calendario' },
    { label: 'Avisos', icon: 'notifications-outline', ruta: '/(app)/notificaciones' },
    { label: 'Perfil', icon: 'person-circle-outline', ruta: '/(app)/perfil' },
  ];

  return (
    <Pantalla refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }}>
      {error && <AvisoError onRetry={cargar} />}
      <ResumenOscuro
        titulo="Panel profesional"
        anillo={avance}
        items={[
          { valor: pcdsCount, label: 'Pacientes' },
          { valor: pendientes, label: 'Pendientes' },
          { valor: reportesAbiertos, label: 'Reportes' },
        ]}
      />

      <View>
        <SectionHeader title="Actividades recientes" actionLabel="Ver todas" onAction={() => router.navigate('/(app)/actividades' as any)} />
        {recientes.length > 0 ? (
          <View style={styles.lista}>
            {recientes.map((a) => (
              <ActividadFila
                key={a.id} item={a}
                subtitulo={`${a.pcd.usuario.nombre} ${a.pcd.usuario.apellido}`}
                onPress={() => router.navigate(`/(app)/actividades/${a.id}` as any)}
              />
            ))}
          </View>
        ) : (
          <Card style={styles.vacio}>
            <AppIcon name="clipboard-outline" size={30} color={DS.colors.textTertiary} />
            <Text style={styles.vacioTexto}>Todavía no hay actividades.</Text>
          </Card>
        )}
      </View>

      <Accesos items={accesos} />
    </Pantalla>
  );
}

function DashboardPcd() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [sesiones, setSesiones] = useState<SesionDelDia[]>([]);

  const cargar = useCallback(async () => {
    try {
      setSesiones(sesionesDeHoy(await actividadesApi.getAll()));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Se recarga cada vez que se vuelve al inicio (p. ej. después de confirmar una sesión).
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  if (loading) return <InicioSkeleton />;

  const realizadas = sesiones.filter((s) => s.instancia.estado === 'REALIZADA').length;
  const pendientes = sesiones.length - realizadas;
  const avance = sesiones.length > 0 ? (realizadas / sesiones.length) * 100 : 0;

  const accesos: Acceso[] = [
    { label: 'Actividades', icon: 'clipboard-outline', ruta: '/(app)/actividades' },
    { label: 'Calendario', icon: 'calendar-outline', ruta: '/(app)/calendario' },
    { label: 'Reportes', icon: 'stats-chart-outline', ruta: '/(app)/reportes' },
    { label: 'Ubicación', icon: 'location-outline', ruta: '/(app)/ubicaciones' },
  ];

  return (
    <Pantalla refreshing={refreshing} onRefresh={() => { setRefreshing(true); cargar(); }}>
      {error && <AvisoError onRetry={cargar} />}
      <ResumenOscuro
        titulo="Progreso de hoy"
        anillo={avance}
        items={[
          { valor: realizadas, label: 'Realizadas' },
          { valor: pendientes, label: 'Pendientes' },
        ]}
      />

      <View>
        <SectionHeader title="Mis actividades de hoy" actionLabel="Ver todas" onAction={() => router.navigate('/(app)/actividades' as any)} />
        {sesiones.length === 0 ? (
          <Card style={styles.vacio}>
            <AppIcon name="sunny-outline" size={30} color={DS.colors.textTertiary} />
            <Text style={styles.vacioTexto}>No tenés actividades programadas para hoy.</Text>
          </Card>
        ) : (
          <View style={styles.lista}>
            {pendientes === 0 && (
              <Card style={styles.vacio}>
                <AppIcon name="checkmark-circle" size={30} color={DS.colors.success} />
                <Text style={styles.vacioTexto}>¡Completaste todas las actividades de hoy!</Text>
              </Card>
            )}
            {sesiones.map((s) => (
              <SesionFila
                key={s.instancia.id} sesion={s}
                onPress={() => router.navigate(`/(app)/actividades/${s.actividad.id}` as any)}
              />
            ))}
          </View>
        )}
      </View>

      <Accesos items={accesos} />
    </Pantalla>
  );
}

export default function HomeScreen() {
  const { user } = useAuthStore();
  if (!user) return null;

  if (user.esAdministrador) return <DashboardAdmin />;
  if (user.tipoUsuario === 'PROFESIONAL') return <DashboardProfesional />;
  if (user.tipoUsuario === 'TUTOR') return <DashboardTutor />;
  return <DashboardPcd />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: DS.colors.background },
  cuerpo: { paddingHorizontal: DS.space.screen, paddingTop: 16, paddingBottom: 56, gap: DS.space.section },

  aviso: { padding: 16, gap: 12 },
  avisoTexto: { fontFamily: DS.font.medium, fontSize: 14, color: DS.colors.error },

  resumen: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 20, overflow: 'hidden' },
  resumenTitulo: { fontFamily: DS.font.semibold, fontSize: 14, color: DS.colors.onPrimaryMuted },
  resumenNumeros: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 22, rowGap: 10, marginTop: 8 },
  resumenValor: { fontFamily: DS.font.bold, fontSize: 28, color: DS.colors.onPrimary },
  resumenLabel: { fontFamily: DS.font.regular, fontSize: 12, color: DS.colors.onPrimaryMuted },

  lista: { gap: 10 },
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 72,
    backgroundColor: DS.colors.surface, borderRadius: DS.radius.card,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  filaIcono: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  filaTitulo: { fontFamily: DS.font.semibold, fontSize: 15, color: DS.colors.text },
  filaSub: { fontFamily: DS.font.regular, fontSize: 13, color: DS.colors.textTertiary },

  vacio: { alignItems: 'center', gap: 8, padding: 24 },
  vacioTexto: { fontFamily: DS.font.regular, fontSize: 14, lineHeight: 20, color: DS.colors.textSecondary, textAlign: 'center' },

  accesos: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 16 },
  acceso: { width: '25%', alignItems: 'center', gap: 8, paddingHorizontal: 0 },
  accesoIcono: {
    width: 58, height: 58, borderRadius: DS.radius.card, backgroundColor: DS.colors.surface,
    borderWidth: DS.border, borderColor: DS.colors.border, alignItems: 'center', justifyContent: 'center',
  },
  accesoLabel: { fontFamily: DS.font.medium, fontSize: 12, color: DS.colors.textSecondary },
});
