import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { actividadesApi } from '@/api/actividades';
import { reportesApi } from '@/api/reportes';
import { Button, Card, Input } from '@/components/ds';
import { Toast, useToast } from '@/components/Toast';
import { DS } from '@/constants/tokens';
import { Actividad, ActividadInstancia } from '@/types/actividad.types';
import { TipoReporte } from '@/types/reporte.types';
import { formatFechaLocal } from '@/utils/date';
import { getErrorMessage } from '@/utils/http-error';
import { buscar } from '@/utils/search';
import { AppIcon, AppTextInput, Tappable } from '@/components/a11y';

const TIPOS_REPORTE: { label: string; value: TipoReporte; desc: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }[] = [
  { label: 'De actividad', value: 'DE_ACTIVIDAD', desc: 'Reporte de una sesión o actividad concreta', icon: 'clipboard-outline', bg: '#EEF2FF', fg: '#4338CA' },
  { label: 'Mensual', value: 'MENSUAL', desc: 'Resumen mensual de progreso', icon: 'calendar-outline', bg: '#CCFBF1', fg: '#0F766E' },
  { label: 'Final', value: 'FINAL', desc: 'Reporte de cierre del tratamiento', icon: 'flag-outline', bg: '#FCE7F3', fg: '#BE185D' },
];

const TITULO_MAX = 100;

/**
 * Formulario "Nuevo reporte". Desde Reportes se elige la actividad; desde el
 * detalle de una actividad (o de una de sus sesiones) llega ya precargada y
 * fija, para no volver a pedir un dato conocido.
 */
export function NuevoReporteForm({ visible, onClose, onSaved, actividadInicial, instanciaInicialId }: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  actividadInicial?: Actividad | null;
  instanciaInicialId?: number | null;
}) {
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [instancias, setInstancias] = useState<ActividadInstancia[]>([]);
  const [tipo, setTipo] = useState<TipoReporte>('DE_ACTIVIDAD');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [actividadSeleccionada, setActividadSeleccionada] = useState<Actividad | null>(null);
  const [actSearch, setActSearch] = useState('');
  const [actOpen, setActOpen] = useState(false);
  const [instanciaSeleccionada, setInstanciaSeleccionada] = useState<ActividadInstancia | null>(null);
  const [instOpen, setInstOpen] = useState(false);
  const [loadingInst, setLoadingInst] = useState(false);

  const actividadFija = !!actividadInicial;

  const seleccionarActividad = async (act: Actividad, instanciaId: number | null = null) => {
    setActividadSeleccionada(act);
    setInstanciaSeleccionada(null);
    setActOpen(false);
    setActSearch('');
    setLoadingInst(true);
    try {
      const list = await actividadesApi.getInstancias(act.id);
      setInstancias(list);
      if (instanciaId) setInstanciaSeleccionada(list.find((i) => i.id === instanciaId) ?? null);
    } catch {
      setInstancias([]);
    } finally {
      setLoadingInst(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    setTipo('DE_ACTIVIDAD');
    setTitulo('');
    setDescripcion('');
    setActividadSeleccionada(null);
    setInstanciaSeleccionada(null);
    setActSearch('');
    setActOpen(false);
    setInstOpen(false);
    if (actividadInicial) {
      setLoading(false);
      void seleccionarActividad(actividadInicial, instanciaInicialId ?? null);
      return;
    }
    setLoading(true);
    actividadesApi.getAll()
      .then(setActividades)
      .catch(() => showToast('No se pudieron cargar las actividades', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const guardar = async () => {
    Keyboard.dismiss();
    if (titulo.trim().length < 2) return showToast('El título debe tener al menos 2 caracteres', 'error');
    if (!actividadSeleccionada) return showToast('Seleccioná una actividad', 'error');
    setSaving(true);
    try {
      await reportesApi.create({
        titulo: titulo.trim(),
        descripcionDetallada: descripcion.trim() || undefined,
        tipo,
        actividadId: actividadSeleccionada.id,
        instanciaId: tipo === 'DE_ACTIVIDAD' ? instanciaSeleccionada?.id : undefined,
      });
      showToast('Reporte creado correctamente', 'success');
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo crear el reporte'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToastClose = () => {
    hideToast();
    if (toast.type === 'success') { onClose(); onSaved(); }
  };

  const busqueda = buscar(actividades, actSearch, (a) => `${a.titulo} ${a.pcd.usuario.nombre} ${a.pcd.usuario.apellido}`, 0);
  const fechaSesion = (iso: string) => formatFechaLocal(iso, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <View style={styles.flex}>
            <Text style={styles.modalTitle} accessibilityRole="header">Nuevo reporte</Text>
            <Text style={styles.modalSub}>Completá los datos y elegí la actividad</Text>
          </View>
          <Tappable centrado onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" style={styles.cerrar}>
            <AppIcon name="close" size={22} color={DS.colors.textSecondary} />
          </Tappable>
        </View>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator accessibilityLabel="Cargando" size="large" color={DS.colors.primary} />
          </View>
        ) : (
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              <Text style={styles.seccion} accessibilityRole="header">Tipo de reporte</Text>
              <View style={styles.tipos}>
                {TIPOS_REPORTE.map((t) => {
                  const activo = tipo === t.value;
                  return (
                    <Tappable
                      accessibilityLabel={`${t.label}. ${t.desc}`}
                      key={t.value}
                      style={[styles.tipoCard, activo && styles.tipoCardActive]}
                      onPress={() => {
                        setTipo(t.value);
                        // Mensual y Final resumen un período: no van atados a una sesión.
                        if (t.value !== 'DE_ACTIVIDAD') { setInstanciaSeleccionada(null); setInstOpen(false); }
                      }}
                      accessibilityRole="radio"
                      selected={activo}
                    >
                      <View style={[styles.tipoIcono, { backgroundColor: t.bg }]}>
                        <AppIcon name={t.icon} size={22} color={t.fg} />
                      </View>
                      <View style={styles.flex}>
                        <Text style={[styles.tipoTitle, activo && styles.tipoTitleActive]}>{t.label}</Text>
                        <Text style={styles.tipoDesc}>{t.desc}</Text>
                      </View>
                      <View style={[styles.radio, activo && styles.radioActive]}>
                        {activo && <View style={styles.radioInner} />}
                      </View>
                    </Tappable>
                  );
                })}
              </View>

              <Text style={styles.seccion} accessibilityRole="header">Actividad *</Text>
              {actividadSeleccionada ? (
                <View style={styles.elegida}>
                  <View style={[styles.tipoIcono, { backgroundColor: '#EEF2FF' }]}>
                    <AppIcon name="clipboard-outline" size={22} color={DS.colors.accent} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.elegidaTitulo}>{actividadSeleccionada.titulo}</Text>
                    <Text style={styles.elegidaSub}>
                      {actividadSeleccionada.pcd.usuario.nombre} {actividadSeleccionada.pcd.usuario.apellido}
                    </Text>
                  </View>
                  {!actividadFija && (
                    <Tappable centrado
                      onPress={() => { setActividadSeleccionada(null); setInstanciaSeleccionada(null); }}
                      accessibilityRole="button"
                      accessibilityLabel="Quitar actividad"
                    >
                      <AppIcon name="close-circle" size={24} color={DS.colors.accent} />
                    </Tappable>
                  )}
                </View>
              ) : (
                <>
                  <View style={styles.buscador}>
                    <AppIcon name="search-outline" size={20} color={DS.colors.textTertiary} />
                    <AppTextInput
                      accessibilityLabel="Buscar actividad o PCD"
                      placeholder="Buscar actividad o PCD..."
                      placeholderTextColor={DS.colors.textTertiary}
                      value={actSearch}
                      onChangeText={(t) => { setActSearch(t); setActOpen(true); }}
                      onFocus={() => setActOpen(true)}
                      style={styles.buscadorInput}
                    />
                  </View>
                  {actOpen && (
                    <View style={styles.dropdown}>
                      {busqueda.visibles.length === 0 ? (
                        <Text style={styles.dropdownVacio}>
                          {actividades.length === 0 ? 'Sin actividades disponibles' : 'Sin resultados'}
                        </Text>
                      ) : busqueda.visibles.map((a) => (
                        <Tappable
                          accessibilityRole="button"
                          accessibilityLabel={`${a.titulo}, ${a.pcd.usuario.nombre} ${a.pcd.usuario.apellido}`}
                          key={a.id}
                          style={styles.dropdownItem}
                          onPress={() => seleccionarActividad(a)}
                        >
                          <Text style={styles.dropdownTexto}>{a.titulo}</Text>
                          <Text style={styles.dropdownSub}>
                            {a.pcd.usuario.nombre} {a.pcd.usuario.apellido} · {a.tipoActividad}
                          </Text>
                        </Tappable>
                      ))}
                      {busqueda.hayMas && (
                        <Text style={styles.dropdownPista}>Hay más resultados. Escribí más para afinar la búsqueda.</Text>
                      )}
                    </View>
                  )}
                </>
              )}

              {actividadSeleccionada && tipo === 'DE_ACTIVIDAD' && (
                <>
                  <Text style={styles.seccion} accessibilityRole="header">Sesión específica (opcional)</Text>
                  {loadingInst ? (
                    <ActivityIndicator accessibilityLabel="Cargando" animating color={DS.colors.primary} style={styles.cargandoSesion} />
                  ) : (
                    <>
                      <Tappable
                        accessibilityRole="button"
                        accessibilityLabel={`Sesión: ${instanciaSeleccionada ? formatFechaLocal(instanciaSeleccionada.fechaProgramada) : 'sin sesión específica'}`}
                        expanded={instOpen}
                        style={styles.selector}
                        onPress={() => setInstOpen((v) => !v)}
                      >
                        <AppIcon name="time-outline" size={20} color={DS.colors.textTertiary} />
                        <Text style={[styles.selectorTexto, !instanciaSeleccionada && styles.placeholder]} numberOfLines={1}>
                          {instanciaSeleccionada
                            ? formatFechaLocal(instanciaSeleccionada.fechaProgramada)
                            : 'Sin sesión específica (reporte general)'}
                        </Text>
                        <AppIcon name={instOpen ? 'chevron-up' : 'chevron-down'} size={20} color={DS.colors.textTertiary} />
                      </Tappable>
                      {instOpen && (
                        <ScrollView style={styles.dropdownScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                          <Tappable
                            accessibilityRole="radio"
                            accessibilityLabel="Reporte general, sin sesión"
                            selected={!instanciaSeleccionada}
                            style={[styles.dropdownItem, !instanciaSeleccionada && styles.dropdownItemActivo]}
                            onPress={() => { setInstanciaSeleccionada(null); setInstOpen(false); }}
                          >
                            <Text style={styles.dropdownTexto}>Reporte general (sin sesión)</Text>
                          </Tappable>
                          {instancias.map((inst) => (
                            <Tappable
                              accessibilityRole="radio"
                              accessibilityLabel={fechaSesion(inst.fechaProgramada)}
                              selected={instanciaSeleccionada?.id === inst.id}
                              key={inst.id}
                              style={[styles.dropdownItem, instanciaSeleccionada?.id === inst.id && styles.dropdownItemActivo]}
                              onPress={() => { setInstanciaSeleccionada(inst); setInstOpen(false); }}
                            >
                              <Text style={styles.dropdownTexto}>{fechaSesion(inst.fechaProgramada)}</Text>
                              <Text style={[styles.dropdownSub, styles.capitalizar]}>{inst.estado.toLowerCase()}</Text>
                            </Tappable>
                          ))}
                        </ScrollView>
                      )}
                    </>
                  )}
                </>
              )}

              <Text style={styles.seccion} accessibilityRole="header">Datos del reporte</Text>
              <Card style={styles.datos}>
                <Input
                  label="Título *"
                  accessibilityLabel="Título"
                  value={titulo}
                  onChangeText={setTitulo}
                  maxLength={TITULO_MAX}
                  left={<AppIcon name="create-outline" size={22} color={DS.colors.textTertiary} />}
                />
                <Text style={styles.campoLabel}>Descripción detallada</Text>
                <AppTextInput
                  accessibilityLabel="Descripción detallada"
                  value={descripcion}
                  onChangeText={setDescripcion}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  style={styles.textarea}
                />
              </Card>

              <View style={styles.guardar}>
                <Button
                  label="Crear reporte"
                  loading={saving}
                  disabled={toast.visible && toast.type === 'success'}
                  onPress={guardar}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
        <Toast {...toast} onClose={handleToastClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  modal: { flex: 1, padding: DS.space.screen, backgroundColor: DS.colors.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  modalTitle: { fontFamily: DS.font.bold, fontSize: 24, color: DS.colors.text },
  modalSub: { fontFamily: DS.font.regular, fontSize: 14, color: DS.colors.textTertiary, marginTop: 2 },
  cerrar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: DS.colors.surface,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  modalContent: { paddingBottom: 40 },
  seccion: { fontFamily: DS.font.bold, fontSize: 17, color: DS.colors.text, marginTop: DS.space.section, marginBottom: 10 },

  tipos: { gap: 10 },
  tipoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: DS.colors.surface,
    borderRadius: DS.radius.card, padding: 14, borderWidth: DS.border, borderColor: DS.colors.border,
  },
  tipoCardActive: { borderColor: DS.colors.focus, backgroundColor: DS.colors.accentSoft },
  tipoIcono: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tipoTitle: { fontFamily: DS.font.semibold, fontSize: 16, color: DS.colors.textSecondary },
  tipoTitleActive: { color: DS.colors.text, fontFamily: DS.font.bold },
  tipoDesc: { fontFamily: DS.font.regular, fontSize: 13, lineHeight: 18, color: DS.colors.textTertiary, marginTop: 2 },
  radio: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: DS.colors.textTertiary,
    justifyContent: 'center', alignItems: 'center',
  },
  radioActive: { borderColor: DS.colors.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: DS.colors.primary },

  elegida: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: DS.colors.accentSoft,
    borderRadius: DS.radius.card, padding: 14, borderWidth: DS.border, borderColor: '#C7D2FE',
  },
  elegidaTitulo: { fontFamily: DS.font.bold, fontSize: 16, color: DS.colors.text },
  elegidaSub: { fontFamily: DS.font.regular, fontSize: 13, color: DS.colors.textSecondary, marginTop: 2 },

  buscador: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 14,
    backgroundColor: DS.colors.surface, borderRadius: DS.radius.control, borderWidth: DS.border, borderColor: DS.colors.border,
  },
  buscadorInput: { flex: 1, fontFamily: DS.font.regular, fontSize: 16, color: DS.colors.text, paddingVertical: 0 },
  selector: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 14,
    backgroundColor: DS.colors.surface, borderRadius: DS.radius.control, borderWidth: DS.border, borderColor: DS.colors.border,
  },
  selectorTexto: { flex: 1, fontFamily: DS.font.medium, fontSize: 15, color: DS.colors.text },
  placeholder: { color: DS.colors.textTertiary, fontFamily: DS.font.regular },
  cargandoSesion: { marginVertical: 12 },

  dropdown: {
    backgroundColor: DS.colors.surface, borderRadius: DS.radius.card, marginTop: 8,
    borderWidth: DS.border, borderColor: DS.colors.border, overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 280, backgroundColor: DS.colors.surface, borderRadius: DS.radius.card, marginTop: 8,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  dropdownItem: { padding: 14, borderBottomWidth: DS.border, borderBottomColor: DS.colors.border },
  dropdownItemActivo: { backgroundColor: DS.colors.accentSoft },
  dropdownTexto: { fontFamily: DS.font.semibold, fontSize: 15, color: DS.colors.text },
  dropdownSub: { fontFamily: DS.font.regular, fontSize: 13, color: DS.colors.textTertiary, marginTop: 2 },
  capitalizar: { textTransform: 'capitalize' },
  dropdownVacio: { fontFamily: DS.font.regular, fontSize: 14, color: DS.colors.textTertiary, padding: 16, textAlign: 'center' },
  dropdownPista: {
    fontFamily: DS.font.regular, fontSize: 13, color: DS.colors.textTertiary, padding: 12,
    textAlign: 'center', backgroundColor: DS.colors.background,
  },

  datos: { padding: 16 },
  campoLabel: { fontFamily: DS.font.medium, fontSize: 13, color: DS.colors.textSecondary, marginBottom: 6 },
  textarea: {
    minHeight: 130, padding: 14, backgroundColor: DS.colors.background, borderRadius: DS.radius.control,
    borderWidth: DS.border, borderColor: DS.colors.border, fontFamily: DS.font.regular, fontSize: 16, color: DS.colors.text,
  },
  guardar: { marginTop: DS.space.section },
});
