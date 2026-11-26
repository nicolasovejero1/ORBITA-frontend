import { useCallback, useEffect, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, FormTextInput as TextInput, ScreenHeader } from '@/components/ds';
import { MedicamentoCatalogo, medicamentosApi } from '@/api/medicamentos';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Skeleton } from '@/components/Skeleton';
import { Toast, useToast } from '@/components/Toast';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useAuthStore } from '@/store/auth.store';
import { getErrorMessage } from '@/utils/http-error';
import { AppIcon, Tappable } from '@/components/a11y';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SearchBar } from '@/components/SearchBar';
import { DS } from '@/constants/tokens';
import { volver } from '@/utils/navegacion';

function MedicamentoForm({
  visible, initial, onSave, onClose,
}: {
  visible: boolean;
  initial: Partial<MedicamentoCatalogo> | null;
  onSave: (data: Omit<MedicamentoCatalogo, 'id'>) => Promise<void>;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [presentacion, setPresentacion] = useState('');
  const [tipo, setTipo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (visible) {
      setConfirmar(false);
      setNombre(initial?.nombre ?? '');
      setPresentacion(initial?.presentacion ?? '');
      setTipo(initial?.tipo ?? '');
      setDescripcion(initial?.descripcion ?? '');
    }
  }, [visible, initial]);

  const pedirConfirmacion = () => {
    Keyboard.dismiss();
    if (nombre.trim().length < 2) return showToast('El nombre es obligatorio (mínimo 2 caracteres)', 'error');
    setConfirmar(true);
  };

  // Si sale bien, onSave cierra el formulario y la lista muestra el aviso; si
  // falla (por ejemplo, el nombre ya existe), el error queda acá.
  const guardar = async () => {
    setConfirmar(false);
    setSaving(true);
    try {
      await onSave({
        nombre: nombre.trim(),
        presentacion: presentacion.trim() || undefined,
        tipo: tipo.trim() || undefined,
        descripcion: descripcion.trim() || undefined,
      });
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo guardar el medicamento'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} accessibilityRole="header">{initial?.id ? 'Editar medicamento' : 'Nuevo medicamento'}</Text>
          <Tappable style={styles.modalClose} centrado accessibilityRole="button" accessibilityLabel="Cerrar el formulario" onPress={onClose}>
            <AppIcon name="close" size={24} color="#475569" />
          </Tappable>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView keyboardShouldPersistTaps="handled">
            <TextInput accessibilityLabel="Nombre" label="Nombre *" value={nombre} onChangeText={setNombre} maxLength={255} mode="outlined" style={styles.input} outlineStyle={styles.inputOutline} />
            <TextInput accessibilityLabel="Presentación (ej: Comprimidos 400mg)" label="Presentación (ej: Comprimidos 400mg)" value={presentacion} onChangeText={setPresentacion} maxLength={255} mode="outlined" style={styles.input} outlineStyle={styles.inputOutline} />
            <TextInput accessibilityLabel="Tipo (ej: Antiinflamatorio)" label="Tipo (ej: Antiinflamatorio)" value={tipo} onChangeText={setTipo} maxLength={100} mode="outlined" style={styles.input} outlineStyle={styles.inputOutline} />
            <TextInput accessibilityLabel="Descripción" label="Descripción" value={descripcion} onChangeText={setDescripcion} mode="outlined" multiline style={styles.input} outlineStyle={styles.inputOutline} />
            <Tappable accessibilityLabel={saving ? 'Guardando' : 'Guardar medicamento'} style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={pedirConfirmacion} disabled={saving} accessibilityRole="button">
              <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
            </Tappable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      <Toast {...toast} onClose={hideToast} />
      <ConfirmDialog
        visible={confirmar}
        title={initial?.id ? '¿Guardar los cambios?' : '¿Crear el medicamento?'}
        message={initial?.id
          ? `Se actualiza "${initial.nombre ?? ''}" en el catálogo.`
          : `Se agrega "${nombre.trim()}" al catálogo de medicamentos.`}
        icon="save-outline"
        confirmLabel={initial?.id ? 'Guardar' : 'Crear'}
        onCancel={() => setConfirmar(false)}
        onConfirm={guardar}
      />
    </Modal>
  );
}

function MedicamentosSkeleton() {
  return (
    <View style={styles.listContent}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} height={64} borderRadius={12} />
      ))}
    </View>
  );
}

export default function MedicamentosScreen() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');
  const { toast, showToast, hideToast } = useToast();
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<MedicamentoCatalogo | null>(null);
  const [eliminarTarget, setEliminarTarget] = useState<MedicamentoCatalogo | null>(null);
  const { user } = useAuthStore();
  // Catálogo único para todos; crearlo y modificarlo es de Administrador y Profesional.
  const canManage = user?.tipoUsuario === 'ADMINISTRADOR' || user?.tipoUsuario === 'PROFESIONAL';

  const cargarLoader = useCallback(
    () => medicamentosApi.getAll(busqueda || undefined),
    [busqueda],
  );
  const { data: medicamentosData, loading, error, reload } = useAsyncData<MedicamentoCatalogo[]>(cargarLoader);
  const medicamentos = medicamentosData ?? [];

  const confirmarEliminar = async () => {
    if (!eliminarTarget) return;
    const target = eliminarTarget;
    setEliminarTarget(null);
    try {
      await medicamentosApi.remove(target.id);
      showToast(`Medicamento "${target.nombre}" eliminado`, 'success');
      void reload();
    } catch (e: any) {
      // Por ejemplo: está asignado a actividades (el backend dice a cuántas).
      showToast(getErrorMessage(e, 'No se pudo eliminar el medicamento'), 'error');
    }
  };

  const guardar = async (data: Omit<MedicamentoCatalogo, 'id'>) => {
    if (editando?.id) {
      await medicamentosApi.update(editando.id, data);
    } else {
      await medicamentosApi.create(data);
    }
    setModalVisible(false);
    showToast(editando?.id ? 'Medicamento actualizado correctamente' : 'Medicamento creado correctamente', 'success');
    void reload();
  };

  return (
    <View style={ls.container}>
      <StatusBar style="dark" />
      <ScreenHeader
        titulo="Medicamentos"
        subtitulo={loading ? undefined : `${medicamentos.length} ${medicamentos.length === 1 ? 'medicamento' : 'medicamentos'}`}
        onVolver={() => volver(router, '/(app)')}
        volverLabel="Volver al inicio"
      />
      <View style={ls.busqueda}>
        <SearchBar
          accessibilityLabel="Buscar medicamento"
          placeholder="Buscar medicamento..."
          value={busqueda}
          onChangeText={setBusqueda}
          onClear={() => setBusqueda('')}
        />
      </View>

      {loading ? (
        <MedicamentosSkeleton />
      ) : error ? (
        <View style={ls.center}>
          <View style={ls.vacioIcono}><AppIcon name="alert-circle-outline" size={32} color={DS.colors.textTertiary} /></View>
          <Text style={ls.vacioTexto}>{error}</Text>
          <Button label="Reintentar" variant="secondary" height={48} onPress={reload} accessibilityLabel="Reintentar cargar los medicamentos" />
        </View>
      ) : medicamentos.length === 0 ? (
        <View style={ls.center}>
          <View style={ls.vacioIcono}><AppIcon name="medkit-outline" size={32} color={DS.colors.textTertiary} /></View>
          <Text style={ls.vacioTexto}>{busqueda ? 'Sin resultados para esa búsqueda' : 'Sin medicamentos'}</Text>
        </View>
      ) : (
        <FlatList
          data={medicamentos}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={ls.lista}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: m }) => (
            <View style={ls.card}>
              <View style={[ls.icono, { backgroundColor: '#FEF3C7' }]}>
                <AppIcon name="medkit-outline" size={24} color="#B45309" />
              </View>
              <View style={ls.flex}>
                <Text style={ls.nombre}>{m.nombre}</Text>
                {m.presentacion ? <Text style={ls.sub}>{m.presentacion}</Text> : null}
                {m.tipo ? <View style={ls.chip}><Text style={ls.chipTexto}>{m.tipo}</Text></View> : null}
              </View>
              {canManage && (
                <View style={ls.acciones}>
                  <Tappable centrado
                    style={ls.accion}
                    onPress={() => { setEditando(m); setModalVisible(true); }}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar ${m.nombre}`}
                  >
                    <AppIcon name="pencil-outline" size={20} color={DS.colors.accent} />
                  </Tappable>
                  <Tappable centrado
                    style={[ls.accion, ls.accionPeligro]}
                    onPress={() => setEliminarTarget(m)}
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar ${m.nombre}`}
                  >
                    <AppIcon name="trash-outline" size={20} color={DS.colors.error} />
                  </Tappable>
                </View>
              )}
            </View>
          )}
        />
      )}

      {canManage && (
        <Tappable
          centrado
          style={ls.nuevo}
          onPress={() => { setEditando(null); setModalVisible(true); }}
          accessibilityRole="button"
          accessibilityLabel="Nuevo medicamento"
        >
          <AppIcon name="add" size={30} color={DS.colors.onPrimary} />
        </Tappable>
      )}

      <MedicamentoForm
        visible={modalVisible}
        initial={editando}
        onSave={guardar}
        onClose={() => setModalVisible(false)}
      />

      <ConfirmDialog
        visible={!!eliminarTarget}
        variant="danger"
        title="¿Eliminar el medicamento?"
        message={`Se elimina "${eliminarTarget?.nombre ?? ''}" del catálogo. No se puede eliminar si está asignado a alguna actividad.`}
        confirmLabel="Eliminar"
        onCancel={() => setEliminarTarget(null)}
        onConfirm={confirmarEliminar}
      />

      <Toast {...toast} onClose={hideToast} style={{ position: 'absolute', bottom: SIZES.lg, left: SIZES.lg, right: SIZES.lg }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  searchRow: { padding: SIZES.lg, paddingBottom: SIZES.sm },
  searchInput: { backgroundColor: '#FFFFFF' },
  inputOutline: { borderRadius: 14 },
  listContent: { paddingHorizontal: SIZES.lg, gap: SIZES.sm, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: SIZES.md,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardLeft: { flex: 1 },
  cardNombre: { ...FONTS.bodyBold, color: '#0F172A', fontWeight: '700', marginBottom: 2 },
  cardSub: { ...FONTS.caption, color: COLORS.textMuted, marginBottom: SIZES.xs },
  badge: { alignSelf: 'flex-start', backgroundColor: '#FFF0E8', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { ...FONTS.small, color: '#C2410C', fontWeight: '700' },
  cardActions: { flexDirection: 'row' },
  iconBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SIZES.sm },
  emptyText: { ...FONTS.body, color: COLORS.textMuted },
  retryBtn: { paddingHorizontal: SIZES.lg, paddingVertical: SIZES.sm, backgroundColor: COLORS.primary, borderRadius: DS.radius.control },
  retryText: { ...FONTS.caption, color: '#FFFFFF', fontWeight: '700' },
  fab: { position: 'absolute', right: SIZES.lg, bottom: SIZES.lg, backgroundColor: COLORS.primary },
  modal: { flex: 1, padding: SIZES.lg, backgroundColor: '#F8FAFC' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.lg },
  modalTitle: { fontFamily: DS.font.bold, fontSize: 24, color: DS.colors.text },
  modalClose: { width: 46, height: 46, borderRadius: 23, backgroundColor: DS.colors.surface, borderWidth: DS.border, borderColor: DS.colors.border, alignItems: 'center', justifyContent: 'center' },
  input: { marginBottom: SIZES.sm, backgroundColor: '#FFFFFF' },
  saveBtn: { backgroundColor: DS.colors.primary, borderRadius: DS.radius.control, minHeight: 54, justifyContent: 'center', alignItems: 'center', marginTop: SIZES.md },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { ...FONTS.bodyBold, color: '#FFFFFF', fontWeight: '700' },
});

/** Estilos de la lista (los formularios de abajo usan `styles`). */
const ls = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: DS.colors.background },
  busqueda: { paddingHorizontal: DS.space.screen, paddingTop: 8, paddingBottom: 4 },
  lista: { paddingHorizontal: DS.space.screen, paddingTop: 12, paddingBottom: 120, gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    backgroundColor: DS.colors.surface, borderRadius: DS.radius.card, borderWidth: DS.border, borderColor: DS.colors.border,
  },
  icono: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  nombre: { fontFamily: DS.font.bold, fontSize: 16, color: DS.colors.text },
  sub: { fontFamily: DS.font.regular, fontSize: 13, lineHeight: 18, color: DS.colors.textSecondary, marginTop: 2 },
  chip: {
    alignSelf: 'flex-start', marginTop: 8, borderRadius: DS.radius.chip, paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: DS.colors.accentSoft,
  },
  chipTexto: { fontFamily: DS.font.semibold, fontSize: 12, color: DS.colors.accent },
  acciones: { flexDirection: 'row', gap: 6 },
  accion: { width: 44, height: 44, borderRadius: 22, backgroundColor: DS.colors.accentSoft },
  accionPeligro: { backgroundColor: DS.colors.errorSoft },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  vacioIcono: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: DS.colors.surface,
    borderWidth: DS.border, borderColor: DS.colors.border, alignItems: 'center', justifyContent: 'center',
  },
  vacioTexto: { fontFamily: DS.font.regular, fontSize: 14, lineHeight: 20, color: DS.colors.textSecondary, textAlign: 'center' },
  nuevo: {
    position: 'absolute', right: DS.space.screen, bottom: 24, width: 58, height: 58,
    borderRadius: DS.radius.fab, backgroundColor: DS.colors.primary,
  },
});
