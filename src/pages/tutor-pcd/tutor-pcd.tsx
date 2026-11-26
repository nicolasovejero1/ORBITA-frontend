import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Skeleton } from '@/components/Skeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Toast, useToast } from '@/components/Toast';
import { usuariosApi } from '@/api/usuarios';
import { TutorPcd, tutorPcdApi } from '@/api/tutor-pcd';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { useAsyncData, useRecargarAlEnfocar } from '@/hooks/useAsyncData';
import { UsuarioListItem } from '@/types/usuario.types';
import { getErrorMessage } from '@/utils/http-error';
import { volver } from '@/utils/navegacion';
import { buscar } from '@/utils/search';
import { AppIcon, AppTextInput, Tappable } from '@/components/a11y';
import { ActionPill, Button, Chip, ScreenHeader } from '@/components/ds';
import { DS } from '@/constants/tokens';
import { SearchBar } from '@/components/SearchBar';

const FILTROS: { label: string; value: 'TODOS' | 'ACTIVO' | 'INACTIVO' }[] = [
  { label: 'Todos', value: 'TODOS' },
  { label: 'Activos', value: 'ACTIVO' },
  { label: 'Inactivos', value: 'INACTIVO' },
];

function UsuarioSelector({
  label, iconColor, iconBg, usuarios, selected, onSelect, fijo = false,
}: {
  label: string; iconColor: string; iconBg: string;
  usuarios: UsuarioListItem[]; selected: UsuarioListItem | null;
  onSelect: (u: UsuarioListItem) => void; fijo?: boolean;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  // Sin texto muestra los primeros; la búsqueda no distingue mayúsculas ni acentos.
  const { visibles: filtrados, hayMas } = buscar(usuarios, search, (u) => `${u.nombre} ${u.apellido}`, 0);

  const handleClear = () => { onSelect(null as any); setSearch(''); setOpen(false); };

  return (
    <View style={styles.selectorBlock}>
      <Text style={styles.selectorLabel}>{label}</Text>
      {selected ? (
        <View style={[styles.selectorChip, { borderColor: iconColor, backgroundColor: iconBg }]}>
          <View style={[styles.selectorChipAvatar, { backgroundColor: iconColor }]}>
            <Text style={styles.selectorChipAvatarText}>
              {selected.nombre[0]}{selected.apellido[0]}
            </Text>
          </View>
          <Text style={[styles.selectorChipName, { color: iconColor, flex: 1 }]} numberOfLines={1}>
            {selected.nombre} {selected.apellido}
          </Text>
          {/* Si viene precargado (se entró desde el detalle del usuario) no se puede quitar. */}
          {!fijo && (
            <Tappable centrado onPress={handleClear} accessibilityRole="button" accessibilityLabel="Quitar selección">
              <AppIcon name="close-circle" size={18} color={iconColor} />
            </Tappable>
          )}
        </View>
      ) : (
        <SearchBar accessibilityLabel={`Buscar ${label.replace(' *', '')}`} placeholder={`Buscar ${label.replace(' *', '')}...`} value={search} onChangeText={(t) => { setSearch(t); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onClear={() => { setSearch(''); setOpen(false); }} />
      )}
      {open && !selected && (
        <View style={styles.dropdown}>
          {filtrados.length === 0 ? (
            <Text style={styles.dropdownEmpty}>
              {search.length > 0 ? 'Sin resultados' : 'Sin usuarios disponibles'}
            </Text>
          ) : (
            filtrados.map((u) => (
              <Tappable
                accessibilityRole="button"
                accessibilityLabel={`${u.nombre} ${u.apellido}`}
                key={u.id}
                style={styles.dropdownItem}
                onPress={() => { onSelect(u); setSearch(''); setOpen(false); }}
              >
                <View style={[styles.dropdownAvatar, { backgroundColor: iconBg }]}>
                  <Text style={[styles.dropdownAvatarText, { color: iconColor }]}>
                    {u.nombre[0]}{u.apellido[0]}
                  </Text>
                </View>
                <Text style={styles.dropdownName}>{u.nombre} {u.apellido}</Text>
              </Tappable>
            ))
          )}
          {hayMas && <Text style={styles.dropdownEmpty}>Hay más resultados. Escribí más para afinar la búsqueda.</Text>}
        </View>
      )}
    </View>
  );
}

function TutorPcdCard({ item, onToggle, onDelete, onEditParentesco }: {
  item: TutorPcd; onToggle: () => void; onDelete: () => void; onEditParentesco: () => void;
}) {
  const activo = item.estado === 'ACTIVO';
  return (
    <View style={ls.card}>
      <View style={ls.persona}>
        <View style={[ls.icono, { backgroundColor: '#FCE7F3' }]}>
          <AppIcon name="person" size={22} color="#BE185D" />
        </View>
        <View style={ls.flex}>
          <Text style={ls.etiqueta}>Tutor · {item.parentesco}</Text>
          <Text style={ls.nombre}>{item.tutor.usuario.nombre} {item.tutor.usuario.apellido}</Text>
        </View>
        <Tappable
          centrado
          accessibilityRole="button"
          accessibilityLabel={`Editar el parentesco, hoy ${item.parentesco}`}
          onPress={onEditParentesco}
          style={ls.editar}
        >
          <AppIcon name="create-outline" size={20} color={DS.colors.accent} />
        </Tappable>
      </View>
      <View style={ls.union}>
        <View style={ls.unionLinea} />
        <Chip label={activo ? 'Activo' : 'Inactivo'} tone={activo ? 'success' : 'neutral'} />
      </View>
      <View style={ls.persona}>
        <View style={[ls.icono, { backgroundColor: '#CCFBF1' }]}>
          <AppIcon name="person" size={22} color="#0F766E" />
        </View>
        <View style={ls.flex}>
          <Text style={ls.etiqueta}>PCD</Text>
          <Text style={ls.nombre}>{item.pcd.usuario.nombre} {item.pcd.usuario.apellido}</Text>
        </View>
      </View>
      <View style={ls.acciones}>
        <ActionPill
          label={activo ? 'Desactivar' : 'Activar'}
          icon={activo ? 'pause-circle-outline' : 'play-circle-outline'}
          tone={activo ? 'warning' : 'success'}
          onPress={onToggle}
          accessibilityLabel={`${activo ? 'Desactivar' : 'Activar'} el vínculo`}
        />
        <ActionPill label="Eliminar" icon="trash-outline" tone="danger" onPress={onDelete} accessibilityLabel="Eliminar el vínculo" />
      </View>
    </View>
  );
}

function TutorPcdSkeleton() {
  return (
    <View style={styles.listContent}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} height={64} borderRadius={12} />
      ))}
    </View>
  );
}

/**
 * `tutorId` / `pcdId`: el usuario desde cuyo detalle se entró. Viene
 * precargado y fijo, para no tener que elegirlo de nuevo.
 */
function NuevoTutorPcdForm({ visible, onClose, onSaved, tutorId, pcdId }: {
  visible: boolean; onClose: () => void; onSaved: () => void; tutorId?: number; pcdId?: number;
}) {
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tutores, setTutores] = useState<UsuarioListItem[]>([]);
  const [pcds, setPcds] = useState<UsuarioListItem[]>([]);
  const [selectedTutor, setSelectedTutor] = useState<UsuarioListItem | null>(null);
  const [selectedPcd, setSelectedPcd] = useState<UsuarioListItem | null>(null);
  const [parentesco, setParentesco] = useState('');
  const [error, setError] = useState('');
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (!visible) return;
    setParentesco('');
    setSelectedTutor(null);
    setSelectedPcd(null);
    setError('');
    setLoadingData(true);
    Promise.all([
      usuariosApi.getAll('TUTOR'),
      usuariosApi.getAll('PCD'),
    ])
      .then(([tutList, pcdList]) => {
        const tutActivos = tutList.filter((u) => u.estado === 'ACTIVO');
        const pcdActivos = pcdList.filter((u) => u.estado === 'ACTIVO');
        setTutores(tutActivos);
        setPcds(pcdActivos);
        if (tutorId) setSelectedTutor(tutActivos.find((u) => u.id === tutorId) ?? null);
        if (pcdId) setSelectedPcd(pcdActivos.find((u) => u.id === pcdId) ?? null);
      })
      .catch(() => setError('No se pudieron cargar los usuarios'))
      .finally(() => setLoadingData(false));
  }, [visible, tutorId, pcdId]);

  const guardar = async () => {
    if (!selectedTutor || !selectedPcd) {
      setError('Seleccioná un tutor y un PCD');
      return;
    }
    if (parentesco.trim().length < 2) {
      setError('Indicá el parentesco del tutor con el PCD (ej: Madre, Padre)');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await tutorPcdApi.create({ tutorId: selectedTutor.id, pcdId: selectedPcd.id, parentesco: parentesco.trim() });
      showToast('Vínculo creado correctamente', 'success');
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo crear el vínculo'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToastClose = () => {
    hideToast();
    if (toast.type === 'success') { onClose(); onSaved(); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} accessibilityRole="header">Nuevo vínculo tutor-PCD</Text>
          <Tappable style={styles.modalClose} centrado accessibilityRole="button" accessibilityLabel="Cerrar el formulario" onPress={onClose}>
            <AppIcon name="close" size={24} color="#475569" />
          </Tappable>
        </View>
        {loadingData ? (
          <View style={styles.center}>
            <ActivityIndicator accessibilityLabel="Cargando" size="large" color={COLORS.primary} />
          </View>
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <UsuarioSelector
                label="Tutor *"
                iconColor="#4338CA"
                iconBg="#EEF2FF"
                usuarios={tutores}
                selected={selectedTutor}
                onSelect={setSelectedTutor}
                fijo={!!tutorId && selectedTutor?.id === tutorId}
              />
              <UsuarioSelector
                label="PCD *"
                iconColor="#0F766E"
                iconBg="#CCFBF1"
                usuarios={pcds}
                selected={selectedPcd}
                onSelect={setSelectedPcd}
                fijo={!!pcdId && selectedPcd?.id === pcdId}
              />
              <Text style={styles.selectorLabel}>Parentesco del tutor con el PCD *</Text>
              <AppTextInput
                accessibilityLabel="Parentesco del tutor con el PCD"
                placeholder="Ej: Madre, Padre, Tía"
                value={parentesco}
                onChangeText={setParentesco}
                maxLength={30}
                style={styles.parentescoInput}
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Tappable
                accessibilityRole="button"
                accessibilityLabel={saving ? 'Guardando' : 'Crear vínculo'}
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={guardar}
                disabled={saving || (toast.visible && toast.type === 'success')}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Crear vínculo'}</Text>
              </Tappable>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
        <Toast {...toast} onClose={handleToastClose} />
      </View>
    </Modal>
  );
}

export default function TutorPcdScreen() {
  const { toast, showToast, hideToast } = useToast();
  const router = useRouter();
  const params = useLocalSearchParams<{ tutorId?: string; pcdId?: string; userId?: string }>();
  const tutorId = params.tutorId ? Number(params.tutorId) : undefined;
  const pcdId = params.pcdId ? Number(params.pcdId) : undefined;
  const userId = params.userId;
  const fromUsuario = !!(tutorId || pcdId);

  const [filtro, setFiltro] = useState<'TODOS' | 'ACTIVO' | 'INACTIVO'>('TODOS');
  const [modalVisible, setModalVisible] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<TutorPcd | null>(null);
  const [eliminarTarget, setEliminarTarget] = useState<TutorPcd | null>(null);
  const [parentescoTarget, setParentescoTarget] = useState<TutorPcd | null>(null);
  const [parentescoTexto, setParentescoTexto] = useState('');

  const cargarLoader = useCallback(() => {
    const estadoParam = filtro && filtro !== 'TODOS' ? { estado: filtro } : {};
    const filterParams = { ...estadoParam, ...(tutorId ? { tutorId } : {}), ...(pcdId ? { pcdId } : {}) };
    return tutorPcdApi.getAll(Object.keys(filterParams).length ? filterParams : undefined);
  }, [filtro, tutorId, pcdId]);
  const { data: vinculosData, loading, error, reload, refrescarSilencioso } = useAsyncData<TutorPcd[]>(cargarLoader);
  useRecargarAlEnfocar(refrescarSilencioso);
  const vinculos = vinculosData ?? [];

  const confirmarToggle = async () => {
    if (!toggleTarget) return;
    const nuevo: 'ACTIVO' | 'INACTIVO' = toggleTarget.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    setToggleTarget(null);
    try {
      await tutorPcdApi.updateStatus(toggleTarget.tutorId, toggleTarget.pcdId, nuevo);
      void reload();
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo cambiar el estado'), 'error');
    }
  };

  const abrirParentesco = (v: TutorPcd) => {
    setParentescoTexto(v.parentesco);
    setParentescoTarget(v);
  };

  const guardarParentesco = async () => {
    if (!parentescoTarget) return;
    if (parentescoTexto.trim().length < 2) return showToast('El parentesco es requerido', 'error');
    const t = parentescoTarget;
    setParentescoTarget(null);
    try {
      await tutorPcdApi.updateParentesco(t.tutorId, t.pcdId, parentescoTexto.trim());
      void reload();
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo cambiar el parentesco'), 'error');
    }
  };

  const confirmarEliminar = async () => {
    if (!eliminarTarget) return;
    setEliminarTarget(null);
    try {
      await tutorPcdApi.remove(eliminarTarget.tutorId, eliminarTarget.pcdId);
      void reload();
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo eliminar'), 'error');
    }
  };

  const volverAtras = () => volver(router, fromUsuario ? (userId ? `/(app)/usuarios/${userId}` : '/(app)/usuarios') : '/(app)');
  const titulo = fromUsuario ? (tutorId ? 'Vínculos del Tutor' : 'Tutores del PCD') : 'Vínculos Tutor-PCD';

  return (
    <View style={ls.container}>
      <StatusBar style="dark" />
      <ScreenHeader
        titulo={titulo}
        subtitulo={loading ? undefined : `${vinculos.length} ${vinculos.length === 1 ? 'vínculo' : 'vínculos'}`}
        onVolver={volverAtras}
        volverLabel={fromUsuario ? 'Volver al usuario' : 'Volver al inicio'}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ls.chipsScroll} contentContainerStyle={ls.filtros}>
        {FILTROS.map((f) => {
          const activo = filtro === f.value;
          return (
            <Tappable
              centrado
              hitSlop={HIT_CHIP}
              accessibilityRole="radio"
              accessibilityLabel={f.label}
              selected={activo}
              key={f.value}
              style={[ls.filtro, activo && ls.filtroActivo]}
              onPress={() => setFiltro(f.value)}
            >
              <Text style={[ls.filtroTexto, activo && ls.filtroTextoActivo]}>{f.label}</Text>
            </Tappable>
          );
        })}
      </ScrollView>

      {loading ? (
        <TutorPcdSkeleton />
      ) : error ? (
        <View style={ls.center}>
          <View style={ls.vacioIcono}><AppIcon name="alert-circle-outline" size={32} color={DS.colors.textTertiary} /></View>
          <Text style={ls.vacioTexto}>{error}</Text>
          <Button label="Reintentar" variant="secondary" height={48} onPress={reload} accessibilityLabel="Reintentar cargar los vínculos" />
        </View>
      ) : vinculos.length === 0 ? (
        <View style={ls.center}>
          <View style={ls.vacioIcono}><AppIcon name="people-outline" size={32} color={DS.colors.textTertiary} /></View>
          <Text style={ls.vacioTexto}>Sin vínculos para este filtro</Text>
        </View>
      ) : (
        <FlatList
          data={vinculos}
          keyExtractor={(v) => `${v.tutorId}-${v.pcdId}`}
          contentContainerStyle={ls.lista}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TutorPcdCard
              item={item}
              onToggle={() => setToggleTarget(item)}
              onDelete={() => setEliminarTarget(item)}
              onEditParentesco={() => abrirParentesco(item)}
            />
          )}
        />
      )}

      <Tappable
        centrado
        style={ls.nuevo}
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Nuevo vínculo"
      >
        <AppIcon name="add" size={30} color={DS.colors.onPrimary} />
      </Tappable>

      <NuevoTutorPcdForm
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={() => { void reload(); }}
        tutorId={tutorId}
        pcdId={pcdId}
      />

      <ConfirmDialog
        visible={!!toggleTarget}
        variant={toggleTarget?.estado === 'ACTIVO' ? 'warning' : 'primary'}
        icon={toggleTarget?.estado === 'ACTIVO' ? 'pause-circle-outline' : 'play-circle-outline'}
        title={toggleTarget?.estado === 'ACTIVO' ? '¿Desactivar el vínculo?' : '¿Activar el vínculo?'}
        message={toggleTarget ? `Vínculo entre ${toggleTarget.tutor.usuario.nombre} y ${toggleTarget.pcd.usuario.nombre}.` : undefined}
        confirmLabel={toggleTarget?.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
        onCancel={() => setToggleTarget(null)}
        onConfirm={confirmarToggle}
      />

      <Modal visible={!!parentescoTarget} transparent animationType="fade" onRequestClose={() => setParentescoTarget(null)}>
        <View style={styles.parentescoFondo}>
          <View style={styles.parentescoCaja}>
            <Text style={styles.modalTitle} accessibilityRole="header">Parentesco</Text>
            {parentescoTarget && (
              <Text style={styles.cardLabel}>
                {parentescoTarget.tutor.usuario.nombre} con {parentescoTarget.pcd.usuario.nombre}
              </Text>
            )}
            <AppTextInput
              accessibilityLabel="Parentesco del tutor con el PCD"
              placeholder="Ej: Madre, Padre, Tía"
              value={parentescoTexto}
              onChangeText={setParentescoTexto}
              maxLength={30}
              style={styles.parentescoInput}
            />
            <View style={styles.cardActions}>
              <Tappable accessibilityRole="button" accessibilityLabel="Cancelar" style={[styles.actionBtn, { backgroundColor: '#F3F4F6' }]} onPress={() => setParentescoTarget(null)}>
                <Text style={[styles.actionText, { color: COLORS.textMuted }]}>Cancelar</Text>
              </Tappable>
              <Tappable accessibilityRole="button" accessibilityLabel="Guardar el parentesco" style={[styles.actionBtn, { backgroundColor: COLORS.primary }]} onPress={guardarParentesco}>
                <Text style={[styles.actionText, { color: '#FFFFFF' }]}>Guardar</Text>
              </Tappable>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!eliminarTarget}
        variant="danger"
        title="¿Eliminar el vínculo?"
        message={eliminarTarget ? `Se elimina el vínculo entre ${eliminarTarget.tutor.usuario.nombre} y ${eliminarTarget.pcd.usuario.nombre}. Esta acción no se puede deshacer.` : undefined}
        confirmLabel="Eliminar"
        onCancel={() => setEliminarTarget(null)}
        onConfirm={confirmarEliminar}
      />

      <Toast {...toast} onClose={hideToast} style={{ position: 'absolute', bottom: SIZES.lg, left: SIZES.lg, right: SIZES.lg }} />
    </View>
  );
}

// 40 dp visibles + 4 dp de hitSlop arriba y abajo = área táctil de 48 dp.
const HIT_CHIP = { top: 4, bottom: 4, left: 4, right: 4 };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  filtrosScroll: { flexGrow: 0, flexShrink: 0 },
  filtrosContainer: { paddingHorizontal: SIZES.lg, paddingVertical: SIZES.md, gap: SIZES.sm, alignItems: 'center' },
  filtroChip: {
    paddingHorizontal: 14, minHeight: 40, minWidth: 0, borderRadius: 999,
    backgroundColor: '#FFFFFF', borderWidth: DS.border, borderColor: DS.colors.border,
  },
  filtroChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filtroText: { ...FONTS.caption, color: COLORS.primary, fontWeight: '600' },
  filtroTextActive: { color: '#FFFFFF' },
  listContent: { padding: SIZES.lg, gap: SIZES.md, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: SIZES.md,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  cardAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  cardText: { flex: 1 },
  cardLabel: { ...FONTS.small, color: COLORS.textMuted, fontWeight: '600' },
  cardName: { ...FONTS.bodyBold, color: '#0F172A', fontWeight: '700' },
  connector: { flexDirection: 'row', alignItems: 'center', marginVertical: SIZES.sm, paddingHorizontal: SIZES.xs },
  connectorLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  estadoBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginHorizontal: SIZES.sm },
  estadoDot: { width: 7, height: 7, borderRadius: 4 },
  estadoText: { ...FONTS.small, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: SIZES.sm, marginTop: SIZES.md },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  actionText: { ...FONTS.caption, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SIZES.sm },
  emptyText: { ...FONTS.body, color: COLORS.textMuted },
  retryBtn: { paddingHorizontal: SIZES.lg, paddingVertical: SIZES.sm, backgroundColor: COLORS.primary, borderRadius: 12 },
  retryText: { ...FONTS.caption, color: '#FFFFFF', fontWeight: '700' },
  fab: { position: 'absolute', right: SIZES.lg, bottom: SIZES.lg, backgroundColor: COLORS.primary },
  modal: { flex: 1, padding: SIZES.lg, backgroundColor: '#F8FAFC' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.lg },
  modalTitle: { fontFamily: DS.font.bold, fontSize: 24, color: DS.colors.text },
  modalClose: { width: 46, height: 46, borderRadius: 23, backgroundColor: DS.colors.surface, borderWidth: DS.border, borderColor: DS.colors.border, alignItems: 'center', justifyContent: 'center' },
  modalContent: { paddingBottom: SIZES.xl },
  selectorBlock: { marginBottom: SIZES.md },
  selectorLabel: { ...FONTS.small, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.5, marginBottom: SIZES.xs },
  selectorChip: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    borderRadius: 14, padding: SIZES.sm, borderWidth: 1.5,
  },
  selectorChipAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  selectorChipAvatarText: { ...FONTS.caption, color: '#FFFFFF', fontWeight: '700' as const },
  selectorChipName: { ...FONTS.caption, fontWeight: '700' as const },
  searchInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.xs,
    backgroundColor: '#FFFFFF', borderRadius: DS.radius.control, paddingHorizontal: SIZES.md, paddingVertical: 10,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  searchInput: { flex: 1, ...FONTS.body, color: '#0F172A', padding: 0 },
  dropdown: {
    backgroundColor: '#FFFFFF', borderRadius: 14, marginTop: 4,
    borderWidth: DS.border, borderColor: DS.colors.border, overflow: 'hidden',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  dropdownEmpty: { ...FONTS.caption, color: COLORS.textMuted, padding: SIZES.md, textAlign: 'center' },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    padding: SIZES.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  dropdownAvatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  dropdownAvatarText: { ...FONTS.caption, fontWeight: '700' },
  dropdownName: { ...FONTS.bodyBold, color: '#0F172A', fontWeight: '700' },
  parentescoInput: {
    backgroundColor: '#FFFFFF', borderRadius: DS.radius.control, paddingHorizontal: SIZES.md,
    borderWidth: DS.border, borderColor: DS.colors.border, ...FONTS.body, color: '#0F172A', marginVertical: SIZES.sm,
  },
  parentescoFondo: { flex: 1, backgroundColor: 'rgba(17,33,71,0.45)', justifyContent: 'center', padding: SIZES.lg },
  parentescoCaja: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: SIZES.lg },
  errorText: { ...FONTS.caption, color: COLORS.error, textAlign: 'center', marginVertical: SIZES.sm },
  saveBtn: { backgroundColor: DS.colors.primary, borderRadius: DS.radius.control, minHeight: 54, justifyContent: 'center', alignItems: 'center', marginTop: SIZES.md },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { ...FONTS.bodyBold, color: '#FFFFFF', fontWeight: '700' },
});

/** Estilos de la lista (los formularios usan `styles`). */
const ls = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: DS.colors.background },
  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  filtros: { paddingHorizontal: DS.space.screen, paddingVertical: 12, gap: 8, alignItems: 'center' },
  filtro: {
    paddingHorizontal: 16, minHeight: 40, minWidth: 0, borderRadius: DS.radius.chip,
    backgroundColor: DS.colors.surface, borderWidth: DS.border, borderColor: DS.colors.border,
  },
  filtroActivo: { backgroundColor: DS.colors.primary, borderColor: DS.colors.primary },
  filtroTexto: { fontFamily: DS.font.semibold, fontSize: 14, color: DS.colors.textSecondary },
  filtroTextoActivo: { color: DS.colors.onPrimary },
  lista: { paddingHorizontal: DS.space.screen, paddingTop: 4, paddingBottom: 120, gap: 12 },
  card: {
    backgroundColor: DS.colors.surface, borderRadius: DS.radius.card, padding: 14, gap: 12,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  persona: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icono: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  etiqueta: { fontFamily: DS.font.medium, fontSize: 12, color: DS.colors.textTertiary },
  nombre: { fontFamily: DS.font.bold, fontSize: 16, color: DS.colors.text },
  union: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 22 },
  unionLinea: { width: 2, height: 16, backgroundColor: DS.colors.border },
  estado: { width: 10, height: 10, borderRadius: 5 },
  acciones: { flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: DS.border, borderTopColor: DS.colors.border },
  accion: {
    flex: 1, flexDirection: 'row', gap: 6, minHeight: 46, borderRadius: DS.radius.control,
  },
  accionTexto: { fontFamily: DS.font.semibold, fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  vacioIcono: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: DS.colors.surface,
    borderWidth: DS.border, borderColor: DS.colors.border, alignItems: 'center', justifyContent: 'center',
  },
  vacioTexto: { fontFamily: DS.font.regular, fontSize: 14, lineHeight: 20, color: DS.colors.textSecondary, textAlign: 'center' },
  editar: { width: 44, height: 44, borderRadius: 22, backgroundColor: DS.colors.accentSoft },
  nuevo: {
    position: 'absolute', right: DS.space.screen, bottom: 24, width: 58, height: 58,
    borderRadius: DS.radius.fab, backgroundColor: DS.colors.primary,
  },
});
