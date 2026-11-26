import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NuevoReporteForm } from '@/components/NuevoReporteForm';
import { Skeleton } from '@/components/Skeleton';
import { Button, Card, Chip, Entrar, OrbitDecor, ProgressRing, ScreenHeader } from '@/components/ds';
import { reportesApi } from '@/api/reportes';
import { vinculosApi } from '@/api/vinculos';
import { usuariosApi } from '@/api/usuarios';
import { tutorPcdApi } from '@/api/tutor-pcd';
import { DS } from '@/constants/tokens';
import { useAsyncData, useRecargarAlEnfocar } from '@/hooks/useAsyncData';
import { useAuthStore } from '@/store/auth.store';
import { EstadoReporte, Reporte, TipoReporte } from '@/types/reporte.types';
import { volver } from '@/utils/navegacion';
import { buscar, MIN_LETRAS_BUSQUEDA } from '@/utils/search';
import { AppIcon, Tappable } from '@/components/a11y';
import { SearchBar } from '@/components/SearchBar';

type PcdItem = { id: number; nombre: string; apellido: string };
type Filtro = EstadoReporte | 'TODOS' | 'COLABORACIONES';

const TIPO_CONFIG: Record<TipoReporte, { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }> = {
  DE_ACTIVIDAD: { label: 'De actividad', icon: 'clipboard-outline', bg: '#EEF2FF', fg: '#4338CA' },
  MENSUAL: { label: 'Mensual', icon: 'calendar-outline', bg: '#CCFBF1', fg: '#0F766E' },
  FINAL: { label: 'Final', icon: 'flag-outline', bg: '#FCE7F3', fg: '#BE185D' },
};

const FILTROS: { label: string; value: Filtro }[] = [
  { label: 'Todos', value: 'TODOS' },
  { label: 'En curso', value: 'EN_CURSO' },
  { label: 'Finalizados', value: 'FINALIZADO' },
  { label: 'Colaboraciones', value: 'COLABORACIONES' },
];

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }).replace('.', '');

function ReporteCard({ item, onPress }: { item: Reporte; onPress: () => void }) {
  const tipo = TIPO_CONFIG[item.tipo];
  const finalizado = item.estado === 'FINALIZADO';
  const estadoLabel = finalizado ? 'Finalizado' : 'En curso';
  const autor = `${item.profesional.usuario.nombre} ${item.profesional.usuario.apellido}`;
  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={`${item.titulo}, actividad ${item.actividad.titulo}, ${estadoLabel}`}
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <View style={[styles.cardIcono, { backgroundColor: tipo.bg }]}>
          <AppIcon name={tipo.icon} size={24} color={tipo.fg} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.cardTitulo} numberOfLines={2}>{item.titulo}</Text>
          <View style={styles.cardActividad}>
            <AppIcon name="clipboard-outline" size={14} color={DS.colors.accent} />
            <Text style={styles.cardActividadTexto} numberOfLines={1}>{item.actividad.titulo}</Text>
          </View>
        </View>
        <AppIcon name="chevron-forward" size={20} color={DS.colors.textTertiary} />
      </View>

      <View style={styles.cardChips}>
        <Chip label={estadoLabel} tone={finalizado ? 'success' : 'warning'} />
        <Chip label={tipo.label} tone="neutral" />
        {item.visibilidadTutor && <Chip label="Visible al tutor" tone="accent" />}
      </View>

      <View style={styles.cardPie}>
        <View style={styles.pieItem}>
          <AppIcon name="person-outline" size={14} color={DS.colors.textTertiary} />
          <Text style={styles.pieTexto} numberOfLines={1}>{autor}</Text>
        </View>
        <View style={styles.pieItem}>
          {item.adjuntos.length > 0 && (
            <>
              <AppIcon name="attach" size={15} color={DS.colors.textTertiary} />
              <Text style={styles.pieTexto}>{item.adjuntos.length}</Text>
            </>
          )}
          <AppIcon name="calendar-outline" size={14} color={DS.colors.textTertiary} />
          <Text style={styles.pieTexto}>{fechaCorta(item.createdAt)}</Text>
        </View>
      </View>
    </Tappable>
  );
}

function Resumen({ reportes }: { reportes: Reporte[] }) {
  const finalizados = reportes.filter((r) => r.estado === 'FINALIZADO').length;
  const enCurso = reportes.length - finalizados;
  const porcentaje = reportes.length > 0 ? (finalizados / reportes.length) * 100 : 0;
  return (
    <Card dark featured style={styles.resumen}>
      <OrbitDecor />
      <ProgressRing percent={porcentaje} size={92} stroke={9} />
      <View style={styles.flex}>
        <Text style={styles.resumenTitulo}>Resumen</Text>
        <View style={styles.resumenNumeros}>
          <View>
            <Text style={styles.resumenValor}>{reportes.length}</Text>
            <Text style={styles.resumenLabel}>Total</Text>
          </View>
          <View>
            <Text style={styles.resumenValor}>{enCurso}</Text>
            <Text style={styles.resumenLabel}>En curso</Text>
          </View>
          <View>
            <Text style={styles.resumenValor}>{finalizados}</Text>
            <Text style={styles.resumenLabel}>Finalizados</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

function ReportesListSkeleton() {
  return (
    <View style={styles.lista}>
      <Skeleton height={112} borderRadius={DS.radius.featured} />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} height={132} borderRadius={DS.radius.card} />
      ))}
    </View>
  );
}

export default function ReportesScreen() {
  const router = useRouter();
  const { actividadId: actividadIdParam } = useLocalSearchParams<{ actividadId?: string }>();
  const { user } = useAuthStore();
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [modalVisible, setModalVisible] = useState(false);

  const [actividadIdFiltro, setActividadIdFiltro] = useState<number | null>(
    actividadIdParam ? Number(actividadIdParam) : null
  );

  useEffect(() => {
    setActividadIdFiltro(actividadIdParam ? Number(actividadIdParam) : null);
  }, [actividadIdParam]);

  const [pcdList, setPcdList] = useState<PcdItem[]>([]);
  const [selectedPcd, setSelectedPcd] = useState<PcdItem | null>(null);
  const [pcdSearch, setPcdSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const canCreate = user?.tipoUsuario === 'PROFESIONAL';
  const showColaboraciones = user?.tipoUsuario === 'PROFESIONAL';
  const showPcdFilter = user?.tipoUsuario !== 'PCD';
  const filtrosVisibles = showColaboraciones ? FILTROS : FILTROS.filter((f) => f.value !== 'COLABORACIONES');

  // El desplegable no lista todos los PCD: recién con 2 letras y hasta 8 resultados.
  const pcdBusqueda = buscar(pcdList, pcdSearch, (p) => `${p.nombre} ${p.apellido}`);

  useEffect(() => {
    if (!showPcdFilter) return;
    const tipo = user?.tipoUsuario;
    if (tipo === 'ADMINISTRADOR' || user?.esAdministrador) {
      usuariosApi.getAll('PCD')
        .then((list) => setPcdList(list.map((u) => ({ id: u.id, nombre: u.nombre, apellido: u.apellido }))))
        .catch(() => {});
    } else if (tipo === 'PROFESIONAL') {
      vinculosApi.getAll({ estado: 'ACTIVO' })
        .then((list) => setPcdList(list.map((v) => ({ id: v.pcd.usuario.id, nombre: v.pcd.usuario.nombre, apellido: v.pcd.usuario.apellido }))))
        .catch(() => {});
    } else if (tipo === 'TUTOR') {
      tutorPcdApi.getAll({ estado: 'ACTIVO' })
        .then((list) => setPcdList(list.map((v) => ({ id: v.pcd.usuario.id, nombre: v.pcd.usuario.nombre, apellido: v.pcd.usuario.apellido }))))
        .catch(() => {});
    }
  }, [showPcdFilter, user]);

  const cargarLoader = useCallback(async (): Promise<Reporte[]> => {
    if (filtro === 'COLABORACIONES') {
      return reportesApi.getColaboraciones();
    }
    const estado = filtro !== 'TODOS' ? filtro : undefined;
    return reportesApi.getAll({
      estado,
      pcdId: selectedPcd?.id,
      actividadId: actividadIdFiltro ?? undefined,
    });
  }, [filtro, selectedPcd, actividadIdFiltro]);

  const { data: reportesData, loading, error, reload, refrescarSilencioso } = useAsyncData<Reporte[]>(cargarLoader);
  useRecargarAlEnfocar(refrescarSilencioso);
  const reportes = reportesData ?? [];

  const subtitulo = loading
    ? undefined
    : `${reportes.length} ${reportes.length === 1 ? 'reporte' : 'reportes'}`;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScreenHeader
        titulo="Reportes"
        subtitulo={subtitulo}
        onVolver={() => volver(router, '/(app)')}
        volverLabel="Volver al inicio"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtrosScroll} contentContainerStyle={styles.filtros}>
        {filtrosVisibles.map((f) => {
          const activo = filtro === f.value;
          return (
            <Tappable
              centrado
              hitSlop={HIT_CHIP}
              accessibilityRole="radio"
              accessibilityLabel={f.label}
              selected={activo}
              key={f.value}
              style={[styles.filtro, activo && styles.filtroActivo]}
              onPress={() => setFiltro(f.value)}
            >
              <Text style={[styles.filtroTexto, activo && styles.filtroTextoActivo]}>{f.label}</Text>
            </Tappable>
          );
        })}
      </ScrollView>

      {showPcdFilter && (
        <View style={styles.busqueda}>
          {selectedPcd ? (
            <View style={styles.pcdChip}>
              <AppIcon name="person-outline" size={16} color={DS.colors.accent} />
              <Text style={styles.pcdChipTexto} numberOfLines={1}>
                {selectedPcd.nombre} {selectedPcd.apellido}
              </Text>
              <Tappable centrado accessibilityRole="button" accessibilityLabel="Quitar el filtro de paciente" onPress={() => { setSelectedPcd(null); setPcdSearch(''); }}>
                <AppIcon name="close-circle" size={20} color={DS.colors.accent} />
              </Tappable>
            </View>
          ) : (
            <SearchBar accessibilityLabel="Buscar por PCD" placeholder="Buscar por PCD..." value={pcdSearch} onChangeText={(t) => { setPcdSearch(t); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} onBlur={() => setTimeout(() => setSearchOpen(false), 150)} onClear={() => { setPcdSearch(''); setSearchOpen(false); }} />
          )}
          {searchOpen && !selectedPcd && pcdBusqueda.faltanLetras && (
            <View style={styles.dropdown}>
              <Text style={styles.dropdownVacio}>Escribí al menos {MIN_LETRAS_BUSQUEDA} letras del nombre</Text>
            </View>
          )}
          {searchOpen && !selectedPcd && pcdBusqueda.visibles.length > 0 && (
            <View style={styles.dropdown}>
              {pcdBusqueda.visibles.map((p) => (
                <Tappable
                  accessibilityRole="button"
                  accessibilityLabel={`${p.nombre} ${p.apellido}`}
                  key={p.id}
                  style={styles.dropdownItem}
                  onPress={() => { setSelectedPcd(p); setPcdSearch(''); setSearchOpen(false); }}
                >
                  <AppIcon name="person-circle-outline" size={22} color={DS.colors.textTertiary} />
                  <Text style={styles.dropdownTexto}>{p.nombre} {p.apellido}</Text>
                </Tappable>
              ))}
              {pcdBusqueda.hayMas && (
                <Text style={styles.dropdownVacio}>Hay más resultados. Escribí más para afinar la búsqueda.</Text>
              )}
            </View>
          )}
          {searchOpen && !selectedPcd && !pcdBusqueda.faltanLetras && pcdBusqueda.visibles.length === 0 && (
            <View style={styles.dropdown}>
              <Text style={styles.dropdownVacio}>Sin resultados</Text>
            </View>
          )}
        </View>
      )}

      {actividadIdFiltro && (
        <View style={styles.busqueda}>
          <View style={styles.pcdChip}>
            <AppIcon name="clipboard-outline" size={16} color={DS.colors.accent} />
            <Text style={styles.pcdChipTexto}>Reportes de actividad #{actividadIdFiltro}</Text>
            <Tappable centrado accessibilityRole="button" accessibilityLabel="Quitar el filtro de actividad" onPress={() => setActividadIdFiltro(null)}>
              <AppIcon name="close-circle" size={20} color={DS.colors.accent} />
            </Tappable>
          </View>
        </View>
      )}

      {loading ? (
        <ReportesListSkeleton />
      ) : error ? (
        <View style={styles.center}>
          <View style={styles.vacioIcono}>
            <AppIcon name="alert-circle-outline" size={32} color={DS.colors.textTertiary} />
          </View>
          <Text style={styles.vacioTexto}>{error}</Text>
          <Button label="Reintentar" variant="secondary" height={48} onPress={reload} accessibilityLabel="Reintentar cargar los reportes" />
        </View>
      ) : reportes.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.vacioIcono}>
            <AppIcon name="document-text-outline" size={32} color={DS.colors.textTertiary} />
          </View>
          <Text style={styles.vacioTitulo}>Sin reportes</Text>
          <Text style={styles.vacioTexto}>
            {canCreate ? 'Cuando crees un reporte, lo vas a ver acá.' : 'Todavía no hay reportes para mostrar.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={reportes}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={filtro === 'TODOS' ? <Resumen reportes={reportes} /> : null}
          renderItem={({ item, index }) => (
            <Entrar delay={Math.min(index, 8) * 40}>
              <ReporteCard
                item={item}
                onPress={() => router.push(`/(app)/reportes/${item.id}` as any)}
              />
            </Entrar>
          )}
        />
      )}

      {canCreate && (
        <Tappable
          centrado
          style={styles.nuevo}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Crear un reporte nuevo"
        >
          <AppIcon name="add" size={30} color={DS.colors.onPrimary} />
        </Tappable>
      )}

      <NuevoReporteForm
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={() => { void reload(); }}
      />
    </View>
  );
}

// 40 dp visibles + 4 dp de hitSlop arriba y abajo = área táctil de 48 dp.
const HIT_CHIP = { top: 4, bottom: 4, left: 4, right: 4 };

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: DS.colors.background },

  filtrosScroll: { flexGrow: 0, flexShrink: 0 },
  filtros: { paddingHorizontal: DS.space.screen, paddingVertical: 12, gap: 8, alignItems: 'center' },
  filtro: {
    paddingHorizontal: 16, minHeight: 40, minWidth: 0, borderRadius: DS.radius.chip,
    backgroundColor: DS.colors.surface, borderWidth: DS.border, borderColor: DS.colors.border,
  },
  filtroActivo: { backgroundColor: DS.colors.primary, borderColor: DS.colors.primary },
  filtroTexto: { fontFamily: DS.font.semibold, fontSize: 14, color: DS.colors.textSecondary },
  filtroTextoActivo: { color: DS.colors.onPrimary },

  busqueda: { paddingHorizontal: DS.space.screen, paddingBottom: 10, zIndex: 10 },
  pcdChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    backgroundColor: DS.colors.accentSoft, borderRadius: DS.radius.chip,
    paddingLeft: 14, paddingRight: 6, minHeight: 44, borderWidth: DS.border, borderColor: '#C7D2FE',
  },
  pcdChipTexto: { fontFamily: DS.font.semibold, fontSize: 14, color: DS.colors.accent, maxWidth: 230 },
  dropdown: {
    backgroundColor: DS.colors.surface, borderRadius: DS.radius.card, borderWidth: DS.border, borderColor: DS.colors.border,
    marginTop: 6, overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
    borderBottomWidth: DS.border, borderBottomColor: DS.colors.border,
  },
  dropdownTexto: { fontFamily: DS.font.semibold, fontSize: 15, color: DS.colors.text },
  dropdownVacio: { fontFamily: DS.font.regular, fontSize: 13, color: DS.colors.textTertiary, padding: 14, textAlign: 'center' },

  lista: { paddingHorizontal: DS.space.screen, paddingTop: 4, paddingBottom: 120, gap: 12 },

  resumen: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 18, overflow: 'hidden', marginBottom: 4 },
  resumenTitulo: { fontFamily: DS.font.semibold, fontSize: 14, color: DS.colors.onPrimaryMuted },
  resumenNumeros: { flexDirection: 'row', gap: 20, marginTop: 8 },
  resumenValor: { fontFamily: DS.font.bold, fontSize: 26, color: DS.colors.onPrimary },
  resumenLabel: { fontFamily: DS.font.regular, fontSize: 12, color: DS.colors.onPrimaryMuted },

  card: {
    backgroundColor: DS.colors.surface, borderRadius: DS.radius.card, padding: 16, gap: 12,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcono: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitulo: { fontFamily: DS.font.bold, fontSize: 16, lineHeight: 21, color: DS.colors.text },
  cardActividad: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  cardActividadTexto: { flex: 1, fontFamily: DS.font.medium, fontSize: 13, color: DS.colors.accent },
  cardChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cardPie: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    paddingTop: 12, borderTopWidth: DS.border, borderTopColor: DS.colors.border,
  },
  pieItem: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  pieTexto: { fontFamily: DS.font.medium, fontSize: 13, color: DS.colors.textTertiary, marginRight: 6 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  vacioIcono: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: DS.colors.surface,
    borderWidth: DS.border, borderColor: DS.colors.border, alignItems: 'center', justifyContent: 'center',
  },
  vacioTitulo: { fontFamily: DS.font.bold, fontSize: 18, color: DS.colors.text },
  vacioTexto: { fontFamily: DS.font.regular, fontSize: 14, lineHeight: 20, color: DS.colors.textSecondary, textAlign: 'center' },

  nuevo: {
    position: 'absolute', right: DS.space.screen, bottom: 24, width: 58, height: 58,
    borderRadius: DS.radius.fab, backgroundColor: DS.colors.primary,
  },
});
