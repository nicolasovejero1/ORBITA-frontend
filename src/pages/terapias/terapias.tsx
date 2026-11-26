import { useCallback, useEffect, useState } from 'react';
import { FlatList, Keyboard, KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, FormTextInput as TextInput, ScreenHeader } from '@/components/ds';
import { TerapiaCatalogo, TerapiaDto, terapiasApi } from '@/api/terapias';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Skeleton } from '@/components/Skeleton';
import { Toast, useToast } from '@/components/Toast';
import { SelectField } from '@/components/SelectField';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useEspecialidades } from '@/hooks/useEspecialidades';
import { usePermisosTerapia } from '@/hooks/usePermisosTerapia';
import { useAuthStore } from '@/store/auth.store';
import { getErrorMessage } from '@/utils/http-error';
import { AppIcon, Tappable } from '@/components/a11y';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DS } from '@/constants/tokens';
import { volver } from '@/utils/navegacion';

function TerapiaForm({
  visible, initial, onSave, onClose,
}: {
  visible: boolean;
  initial: TerapiaCatalogo | null;
  onSave: (data: TerapiaDto) => Promise<void>;
  onClose: () => void;
}) {
  const [tipo, setTipo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const { user } = useAuthStore();
  const { miEspecialidad } = usePermisosTerapia();
  const { nombres: todasLasEspecialidades, idDe: especialidadIdDe } = useEspecialidades(visible);
  // Un Profesional solo puede usar la suya; el Administrador, cualquiera.
  const puedeElegir = user?.tipoUsuario === 'ADMINISTRADOR' || !!user?.esAdministrador;
  const opcionesEspecialidad = puedeElegir ? todasLasEspecialidades : miEspecialidad ? [miEspecialidad.nombre] : [];
  const [saving, setSaving] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    if (visible) {
      setConfirmar(false);
      setTipo(initial?.tipo ?? '');
      setDescripcion(initial?.descripcion ?? '');
      setEspecialidad(initial?.especialidad?.nombre ?? (puedeElegir ? '' : miEspecialidad?.nombre ?? ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initial]);

  const pedirConfirmacion = () => {
    Keyboard.dismiss();
    if (tipo.trim().length < 2 || descripcion.trim().length < 2)
      return showToast('Tipo y descripción son obligatorios (mínimo 2 caracteres)', 'error');
    setConfirmar(true);
  };

  // Si sale bien, onSave cierra el formulario y la lista muestra el aviso de
  // éxito; si falla (por ejemplo, tipo repetido), el error queda acá.
  const guardar = async () => {
    setConfirmar(false);
    setSaving(true);
    try {
      const especialidadId = especialidad ? especialidadIdDe(especialidad) : undefined;
      await onSave({ tipo: tipo.trim(), descripcion: descripcion.trim(), ...(especialidadId && { especialidadId }) });
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo guardar la terapia'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} accessibilityRole="header">{initial?.id ? 'Editar terapia' : 'Nueva terapia'}</Text>
          <Tappable style={styles.modalClose} centrado accessibilityRole="button" accessibilityLabel="Cerrar el formulario" onPress={onClose}>
            <AppIcon name="close" size={24} color="#475569" />
          </Tappable>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView keyboardShouldPersistTaps="handled">
            <TextInput accessibilityLabel="Tipo (ej: Kinesiología)" label="Tipo * (ej: Kinesiología)" value={tipo} onChangeText={setTipo} maxLength={50} mode="outlined" style={styles.input} outlineStyle={styles.inputOutline} />
            <View style={styles.selectWrap}>
              <SelectField label="Especialidad" value={especialidad} options={opcionesEspecialidad} onSelect={setEspecialidad} placeholder="Sin especialidad" />
            </View>
            <TextInput accessibilityLabel="Descripción" label="Descripción *" value={descripcion} onChangeText={setDescripcion} maxLength={255} mode="outlined" multiline style={styles.input} outlineStyle={styles.inputOutline} />
            <Tappable accessibilityLabel={saving ? 'Guardando' : 'Guardar terapia'} style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={pedirConfirmacion} disabled={saving} accessibilityRole="button">
              <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
            </Tappable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      <Toast {...toast} onClose={hideToast} />
      <ConfirmDialog
        visible={confirmar}
        title={initial?.id ? '¿Guardar los cambios?' : '¿Crear la terapia?'}
        message={initial?.id
          ? `Se actualiza "${initial.tipo}" en el catálogo. Las actividades que la usan muestran los datos nuevos.`
          : `Se agrega "${tipo.trim()}" al catálogo de terapias.`}
        icon="save-outline"
        confirmLabel={initial?.id ? 'Guardar' : 'Crear'}
        onCancel={() => setConfirmar(false)}
        onConfirm={guardar}
      />
    </Modal>
  );
}

function TerapiasSkeleton() {
  return (
    <View style={styles.listContent}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} height={64} borderRadius={12} />
      ))}
    </View>
  );
}

export default function TerapiasScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  // El loader tiene que ser estable: useAsyncData recarga cada vez que cambia su
  // identidad. Antes era una función nueva en cada render y la lista se
  // recargaba sin fin (por eso el aviso aparecía una y otra vez).
  const cargar = useCallback(() => terapiasApi.getAll(), []);
  const { data: terapiasData, loading, error, reload } = useAsyncData<TerapiaCatalogo[]>(cargar);
  const terapias = terapiasData ?? [];
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<TerapiaCatalogo | null>(null);
  const [eliminarTarget, setEliminarTarget] = useState<TerapiaCatalogo | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  // El catálogo es uno solo para todos; crearlo y modificarlo es de Administrador y Profesional.
  const canManage = user?.tipoUsuario === 'ADMINISTRADOR' || user?.tipoUsuario === 'PROFESIONAL';
  // Un Profesional solo edita y borra las terapias de su especialidad.
  const { puedeGestionar } = usePermisosTerapia();

  const confirmarEliminar = async () => {
    if (!eliminarTarget) return;
    setEliminando(true);
    try {
      await terapiasApi.remove(eliminarTarget.id);
      showToast(`Terapia "${eliminarTarget.tipo}" eliminada`, 'success');
      void reload();
    } catch (e: any) {
      // Por ejemplo: está asignada a actividades (el backend dice a cuántas).
      showToast(getErrorMessage(e, 'No se pudo eliminar la terapia'), 'error');
    } finally {
      setEliminando(false);
      setEliminarTarget(null);
    }
  };

  const guardar = async (data: TerapiaDto) => {
    if (editando?.id) { await terapiasApi.update(editando.id, data); }
    else { await terapiasApi.create(data); }
    setModalVisible(false);
    showToast(editando?.id ? 'Terapia actualizada correctamente' : 'Terapia creada correctamente', 'success');
    void reload();
  };

  return (
    <View style={ls.container}>
      <StatusBar style="dark" />
      <ScreenHeader
        titulo="Terapias"
        subtitulo={loading ? undefined : `${terapias.length} ${terapias.length === 1 ? 'terapia' : 'terapias'}`}
        onVolver={() => volver(router, '/(app)')}
        volverLabel="Volver al inicio"
      />
      {loading ? (
        <TerapiasSkeleton />
      ) : error ? (
        <View style={ls.center}>
          <View style={ls.vacioIcono}><AppIcon name="alert-circle-outline" size={32} color={DS.colors.textTertiary} /></View>
          <Text style={ls.vacioTexto}>{error}</Text>
          <Button label="Reintentar" variant="secondary" height={48} onPress={reload} accessibilityLabel="Reintentar cargar las terapias" />
        </View>
      ) : terapias.length === 0 ? (
        <View style={ls.center}>
          <View style={ls.vacioIcono}><AppIcon name="pulse-outline" size={32} color={DS.colors.textTertiary} /></View>
          <Text style={ls.vacioTexto}>Sin terapias</Text>
        </View>
      ) : (
        <FlatList
          data={terapias}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={ls.lista}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: t }) => (
            <View style={ls.card}>
              <View style={[ls.icono, { backgroundColor: '#EEF2FF' }]}>
                <AppIcon name="pulse-outline" size={24} color="#4338CA" />
              </View>
              <View style={ls.flex}>
                <Text style={ls.nombre}>{t.tipo}</Text>
                <Text style={ls.sub} numberOfLines={2}>{t.descripcion}</Text>
                <View style={ls.chip}><Text style={ls.chipTexto}>{t.especialidad ? t.especialidad.nombre : 'Sin especialidad'}</Text></View>
              </View>
              {canManage && puedeGestionar(t) && (
                <View style={ls.acciones}>
                  <Tappable centrado
                    style={ls.accion}
                    onPress={() => { setEditando(t); setModalVisible(true); }}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar ${t.tipo}`}
                  >
                    <AppIcon name="pencil-outline" size={20} color={DS.colors.accent} />
                  </Tappable>
                  <Tappable centrado
                    style={[ls.accion, ls.accionPeligro]}
                    onPress={() => setEliminarTarget(t)}
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar ${t.tipo}`}
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
          accessibilityLabel="Nueva terapia"
        >
          <AppIcon name="add" size={30} color={DS.colors.onPrimary} />
        </Tappable>
      )}
      <TerapiaForm visible={modalVisible} initial={editando} onSave={guardar} onClose={() => setModalVisible(false)} />
      <ConfirmDialog
        visible={!!eliminarTarget}
        variant="danger"
        title="¿Eliminar la terapia?"
        message={`Se elimina "${eliminarTarget?.tipo ?? ''}" del catálogo. No se puede eliminar si está asignada a alguna actividad.`}
        confirmLabel="Eliminar"
        loading={eliminando}
        onCancel={() => setEliminarTarget(null)}
        onConfirm={confirmarEliminar}
      />
      <Toast {...toast} onClose={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  listContent: { padding: SIZES.lg, gap: SIZES.sm, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.md,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: SIZES.md,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardIcon: { width: 44, height: 44, borderRadius: DS.radius.control, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardTipo: { ...FONTS.bodyBold, color: '#0F172A', fontWeight: '700', marginBottom: 2 },
  cardDesc: { ...FONTS.caption, color: '#475569' },
  cardEspecialidad: { ...FONTS.small, color: '#556274', marginTop: 2 },
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
  selectWrap: { marginBottom: SIZES.sm },
  inputOutline: { borderRadius: 14 },
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
