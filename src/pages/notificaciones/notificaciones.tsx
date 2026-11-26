import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button, ScreenHeader } from '@/components/ds';
import { Skeleton } from '@/components/Skeleton';
import { Toast, useToast } from '@/components/Toast';
import { notificacionesApi } from '@/api/notificaciones';
import { DS } from '@/constants/tokens';
import { FiltroNotificacion, Notificacion } from '@/types/notificacion.types';
import { volver } from '@/utils/navegacion';
import { AppIcon, Tappable } from '@/components/a11y';

type IconName = keyof typeof Ionicons.glyphMap;

const FILTROS: { label: string; value: FiltroNotificacion }[] = [
  { label: 'Todas', value: 'TODAS' },
  { label: 'No leídas', value: 'NO_LEIDA' },
  { label: 'Leídas', value: 'LEIDA' },
];

function tipoIcono(tipo: string): { icon: IconName; bg: string; color: string } {
  switch (tipo) {
    case 'ACTIVIDAD':
      return { icon: 'clipboard-outline', bg: '#EEF2FF', color: '#4338CA' };
    case 'RECORDATORIO':
      return { icon: 'alarm-outline', bg: '#FEF3C7', color: '#B45309' };
    case 'REPORTE':
      return { icon: 'stats-chart-outline', bg: '#FCE7F3', color: '#BE185D' };
    case 'ALERTA':
      return { icon: 'warning-outline', bg: '#FEE2E2', color: DS.colors.error };
    case 'UBICACION':
      return { icon: 'location-outline', bg: '#CCFBF1', color: '#0F766E' };
    default:
      return { icon: 'notifications-outline', bg: '#EEF2FF', color: '#4338CA' };
  }
}

function formatoFecha(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const esHoy = d.toDateString() === hoy.toDateString();
  if (esHoy) {
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function NotificacionCard({ item, onPress, onDelete }: {
  item: Notificacion; onPress: () => void; onDelete: () => void;
}) {
  const { icon, bg, color } = tipoIcono(item.tipo);
  const leida = item.estado === 'LEIDA';

  return (
    <View style={[styles.card, !leida && styles.cardSinLeer]}>
      <Tappable
        style={styles.cardMain}
        onPress={onPress}
        onLongPress={onDelete}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={`${leida ? 'Leída' : 'Sin leer'}: ${item.mensaje}. ${formatoFecha(item.createdAt)}${item.actividad ? `. ${item.actividad.titulo}` : ''}`}
        accessibilityActions={[{ name: 'delete', label: 'Eliminar' }]}
        onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === 'delete') onDelete(); }}
      >
        <View style={[styles.cardIcono, { backgroundColor: bg }]}>
          <AppIcon name={icon} size={22} color={color} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.cardTitulo, !leida && styles.cardTituloSinLeer]} numberOfLines={3}>
            {item.mensaje}
          </Text>
          <View style={styles.cardMeta}>
            {!leida && <View style={styles.punto} />}
            <Text style={styles.cardFecha}>{formatoFecha(item.createdAt)}</Text>
            {item.actividad && (
              <Text style={styles.cardActividad} numberOfLines={1}>· {item.actividad.titulo}</Text>
            )}
          </View>
        </View>
      </Tappable>
      <Tappable centrado style={styles.borrar} onPress={onDelete} accessibilityRole="button" accessibilityLabel="Eliminar notificación">
        <AppIcon name="trash-outline" size={20} color={DS.colors.textTertiary} />
      </Tappable>
    </View>
  );
}

function NotificacionesSkeleton() {
  return (
    <View style={styles.lista}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} height={84} borderRadius={DS.radius.card} />
      ))}
    </View>
  );
}

export default function NotificacionesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Notificacion[]>([]);
  const [filtro, setFiltro] = useState<FiltroNotificacion>('TODAS');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [eliminarTarget, setEliminarTarget] = useState<Notificacion | null>(null);
  const [marcarTodasConfirm, setMarcarTodasConfirm] = useState(false);
  const { toast, showToast, hideToast } = useToast();
  const cargandoRef = useRef(false);

  const cargar = useCallback(async (f: FiltroNotificacion = filtro) => {
    if (cargandoRef.current) return;
    cargandoRef.current = true;
    setLoading(true);
    setError('');
    try {
      const pagina = await notificacionesApi.getAll(f, 0);
      setItems(pagina.items);
      setHasMore(pagina.hasMore);
    } catch {
      setError('No se pudieron cargar las notificaciones.');
    } finally {
      cargandoRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtro]);

  const cargarMas = useCallback(async () => {
    if (cargandoRef.current || !hasMore) return;
    cargandoRef.current = true;
    setLoadingMore(true);
    try {
      const pagina = await notificacionesApi.getAll(filtro, items.length);
      setItems((prev) => [...prev, ...pagina.items]);
      setHasMore(pagina.hasMore);
    } catch {

    } finally {
      cargandoRef.current = false;
      setLoadingMore(false);
    }
  }, [filtro, items.length, hasMore]);

  useFocusEffect(
    useCallback(() => {
      cargar(filtro);
    }, [cargar, filtro]),
  );

  const onRefresh = () => { setRefreshing(true); cargar(); };
  const cambiarFiltro = (f: FiltroNotificacion) => setFiltro(f);

  const marcarLeida = async (item: Notificacion) => {
    if (item.estado !== 'LEIDA') {
      try {
        await notificacionesApi.marcarLeida(item.id);
        setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, estado: 'LEIDA' } : n)));
      } catch {

      }
    }
    if (item.actividadId) {
      router.push(`/(app)/actividades/${item.actividadId}` as any);
    }
  };

  const eliminar = async () => {
    if (!eliminarTarget) return;
    const item = eliminarTarget;
    setEliminarTarget(null);
    try {
      await notificacionesApi.remove(item.id);
      setItems((prev) => prev.filter((n) => n.id !== item.id));
    } catch {
      showToast('No se pudo eliminar la notificación', 'error');
    }
  };

  const marcarTodas = async () => {
    setMarcarTodasConfirm(false);
    try {
      await notificacionesApi.marcarTodasLeidas();
      setItems((prev) => prev.map((n) => ({ ...n, estado: 'LEIDA' as const })));
    } catch {
      showToast('No se pudieron marcar todas las notificaciones', 'error');
    }
  };

  const sinLeer = items.filter((n) => n.estado !== 'LEIDA').length;
  const hayNoLeidas = sinLeer > 0;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScreenHeader
        titulo="Notificaciones"
        subtitulo={loading ? undefined : hayNoLeidas ? `${sinLeer} sin leer` : 'Todo al día'}
        onVolver={() => volver(router, '/(app)')}
        volverLabel="Volver al inicio"
      />

      <View style={styles.segmentadoWrap}>
        <View style={styles.segmentado} accessibilityRole="radiogroup" accessibilityLabel="Filtrar notificaciones">
          {FILTROS.map((f) => {
            const activo = filtro === f.value;
            return (
              <Tappable
                centrado
                key={f.value}
                style={[styles.segmento, activo && styles.segmentoActivo]}
                onPress={() => cambiarFiltro(f.value)}
                accessibilityRole="radio"
                accessibilityLabel={f.label}
                selected={activo}
              >
                <Text style={[styles.segmentoTexto, activo && styles.segmentoTextoActivo]}>{f.label}</Text>
              </Tappable>
            );
          })}
        </View>
        {hayNoLeidas && (
          <Tappable
            accessibilityRole="button"
            accessibilityLabel="Marcar todas las notificaciones como leídas"
            style={styles.marcarTodas}
            onPress={() => setMarcarTodasConfirm(true)}
          >
            <AppIcon name="checkmark-done" size={18} color={DS.colors.accent} />
            <Text style={styles.marcarTodasTexto}>Marcar todas como leídas</Text>
          </Tappable>
        )}
      </View>

      {loading ? (
        <NotificacionesSkeleton />
      ) : error ? (
        <View style={styles.center}>
          <View style={styles.vacioIcono}><AppIcon name="alert-circle-outline" size={32} color={DS.colors.textTertiary} /></View>
          <Text style={styles.vacioTexto}>{error}</Text>
          <Button label="Reintentar" variant="secondary" height={48} onPress={() => cargar()} accessibilityLabel="Reintentar cargar las notificaciones" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.vacioIcono}><AppIcon name="notifications-off-outline" size={32} color={DS.colors.textTertiary} /></View>
          <Text style={styles.vacioTitulo}>Sin notificaciones</Text>
          <Text style={styles.vacioTexto}>Cuando haya novedades, las vas a ver acá.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={DS.colors.primary} colors={[DS.colors.primary]} />
          }
          onEndReached={cargarMas}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? (
            <ActivityIndicator accessibilityLabel="Cargando" style={styles.pie} color={DS.colors.primary} />
          ) : null}
          renderItem={({ item }) => (
            <NotificacionCard
              item={item}
              onPress={() => marcarLeida(item)}
              onDelete={() => setEliminarTarget(item)}
            />
          )}
        />
      )}

      <ConfirmDialog
        visible={eliminarTarget !== null}
        variant="danger"
        title="¿Eliminar la notificación?"
        message="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onCancel={() => setEliminarTarget(null)}
        onConfirm={eliminar}
      />
      <ConfirmDialog
        visible={marcarTodasConfirm}
        title="¿Marcar todas como leídas?"
        icon="checkmark-done-outline"
        confirmLabel="Marcar"
        onCancel={() => setMarcarTodasConfirm(false)}
        onConfirm={marcarTodas}
      />
      <Toast {...toast} onClose={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: DS.colors.background },

  segmentadoWrap: { paddingHorizontal: DS.space.screen, paddingTop: 8, gap: 6 },
  segmentado: {
    flexDirection: 'row', padding: 4, gap: 4, borderRadius: DS.radius.control,
    backgroundColor: '#EEF2F6', borderWidth: DS.border, borderColor: DS.colors.border,
  },
  segmento: { flex: 1, minHeight: 44, borderRadius: DS.radius.control - 4 },
  segmentoActivo: { backgroundColor: DS.colors.surface },
  segmentoTexto: { fontFamily: DS.font.semibold, fontSize: 14, color: DS.colors.textSecondary },
  segmentoTextoActivo: { color: DS.colors.text, fontFamily: DS.font.bold },
  marcarTodas: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end' },
  marcarTodasTexto: { fontFamily: DS.font.semibold, fontSize: 14, color: DS.colors.accent },

  lista: { paddingHorizontal: DS.space.screen, paddingTop: 12, paddingBottom: 56, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: DS.colors.surface,
    borderRadius: DS.radius.card, borderWidth: DS.border, borderColor: DS.colors.border, overflow: 'hidden',
  },
  cardSinLeer: { borderColor: '#C7D2FE', backgroundColor: '#F5F7FF' },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  cardIcono: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitulo: { fontFamily: DS.font.regular, fontSize: 15, lineHeight: 21, color: DS.colors.textSecondary },
  cardTituloSinLeer: { fontFamily: DS.font.semibold, color: DS.colors.text },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: DS.colors.notification },
  cardFecha: { fontFamily: DS.font.medium, fontSize: 12, color: DS.colors.textTertiary },
  cardActividad: { flexShrink: 1, fontFamily: DS.font.regular, fontSize: 12, color: DS.colors.textTertiary },
  borrar: { marginRight: 4 },

  pie: { paddingVertical: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  vacioIcono: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: DS.colors.surface,
    borderWidth: DS.border, borderColor: DS.colors.border, alignItems: 'center', justifyContent: 'center',
  },
  vacioTitulo: { fontFamily: DS.font.bold, fontSize: 18, color: DS.colors.text },
  vacioTexto: { fontFamily: DS.font.regular, fontSize: 14, lineHeight: 20, color: DS.colors.textSecondary, textAlign: 'center' },
});
