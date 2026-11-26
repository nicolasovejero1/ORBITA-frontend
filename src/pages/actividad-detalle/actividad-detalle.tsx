import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, FormError as HelperText, FormTextInput as TextInput, OrbitDecor } from '@/components/ds';
import { actividadesApi } from '@/api/actividades';
import { medicamentosApi } from '@/api/medicamentos';
import { terapiasApi } from '@/api/terapias';
import { usePermisosTerapia } from '@/hooks/usePermisosTerapia';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DatePickerField } from '@/components/DatePickerField';
import { NuevoReporteForm } from '@/components/NuevoReporteForm';
import { RecordatorioSwitch } from '@/components/RecordatorioSwitch';
import { Skeleton } from '@/components/Skeleton';
import { TimePickerField } from '@/components/TimePickerField';
import { Toast, useToast } from '@/components/Toast';
import { useAuthStore } from '@/store/auth.store';
import { useToastStore } from '@/store/toast.store';
import { Actividad, ActividadInstancia, DIAS_SEMANA, FrecuenciaActividad, TipoActividad } from '@/types/actividad.types';
import { formatFechaLocal } from '@/utils/date';
import { getErrorMessage } from '@/utils/http-error';
import { volver } from '@/utils/navegacion';
import { diaSiguiente, ErroresActividad, validarActividad } from '@/utils/actividad-validation';
import { buscar } from '@/utils/search';
import { AppIcon, AppTextInput, Tappable } from '@/components/a11y';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ChipTone } from '@/components/ds';
import { FRECUENCIA_LABEL, TIPO_VISUAL } from '@/constants/actividad-visual';
import { DS } from '@/constants/tokens';

interface Medicamento { id: number; nombre: string; presentacion?: string }
interface Terapia { id: number; tipo: string; especialidad?: { id: number } | null }

const FRECUENCIAS: { label: string; value: FrecuenciaActividad }[] = [
  { label: 'Diaria', value: 'DIARIA' },
  { label: 'Semanal', value: 'SEMANAL' },
  { label: 'Mensual', value: 'MENSUAL' },
  { label: 'Días específicos', value: 'DIAS_ESPECIFICOS' },
];

// El backend guarda el horario como TIME y lo devuelve "HH:mm:ss". Antes ese
// valor no era una fecha válida, se devolvía tal cual y el formulario de
// edición mandaba "HH:mm:ss", que el backend rechaza (exige "HH:mm").
function formatHorario(iso: string): string {
  if (!iso) return iso;
  if (/^\d{2}:\d{2}/.test(iso)) return iso.slice(0, 5);
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

const INSTANCIA_VISUAL: Record<string, { label: string; tone: ChipTone; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }> = {
  PENDIENTE: { label: 'Pendiente', tone: 'warning', icon: 'time-outline', bg: '#FEF3C7', fg: '#B45309' },
  REALIZADA: { label: 'Realizada', tone: 'success', icon: 'checkmark-circle-outline', bg: '#CCFBF1', fg: '#0F766E' },
  CANCELADA: { label: 'Cancelada', tone: 'neutral', icon: 'close-circle-outline', bg: '#F1F5F9', fg: '#64748B' },
};

// Fecha y estado van en el primer renglón y los botones en el segundo: en una
// sola fila, "Confirmar" y "Cancelar" aplastaban la fecha hasta dejarla vertical.
function InstanciaItem({ item, canConfirm, canCancel, canReport, onConfirm, onCancel, onReport }: {
  item: ActividadInstancia; canConfirm: boolean; canCancel: boolean; canReport: boolean;
  onConfirm: () => void; onCancel: () => void; onReport: () => void;
}) {
  const cfg = INSTANCIA_VISUAL[item.estado];
  const fecha = formatFechaLocal(item.fechaProgramada, {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const pendiente = item.estado === 'PENDIENTE';
  const mostrarConfirmar = canConfirm && pendiente;
  const mostrarCancelar = canCancel && pendiente;
  const mostrarReportar = canReport && item.estado === 'REALIZADA';

  return (
    <View style={det.sesion}>
      <View style={det.sesionTop}>
        <View style={[det.sesionIcono, { backgroundColor: cfg.bg }]}>
          <AppIcon name={cfg.icon} size={22} color={cfg.fg} />
        </View>
        <Text style={det.sesionFecha}>{fecha}</Text>
        <Chip label={cfg.label} tone={cfg.tone} />
      </View>
      {(mostrarConfirmar || mostrarCancelar || mostrarReportar) && (
        <View style={det.sesionAcciones}>
          {mostrarConfirmar && (
            <View style={det.flex}><Button label="Confirmar" height={46} onPress={onConfirm} accessibilityLabel={`Confirmar sesión del ${fecha}`} /></View>
          )}
          {mostrarCancelar && (
            <Tappable
              centrado
              style={[det.peligroBtn, det.flex]}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={`Cancelar sesión del ${fecha}`}
            >
              <Text style={det.peligroTexto}>Cancelar</Text>
            </Tappable>
          )}
          {mostrarReportar && (
            <View style={det.flex}><Button label="Reportar" variant="secondary" height={46} onPress={onReport} accessibilityLabel={`Crear reporte de la sesión del ${fecha}`} /></View>
          )}
        </View>
      )}
    </View>
  );
}

function FormField({ label, value, onChange, error, ...rest }: {
  label: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; keyboardType?: any; maxLength?: number; error?: string;
}) {
  return (
    <>
      <TextInput accessibilityLabel={label}
        label={label} value={value} onChangeText={onChange} mode="outlined"
        style={styles.input} outlineStyle={styles.inputOutline} error={!!error} {...rest}
      />
      <FieldError text={error} />
    </>
  );
}

function FieldError({ text }: { text?: string }) {
  if (!text) return null;
  return <HelperText type="error" visible style={styles.fieldError}>{text}</HelperText>;
}

function EditarActividadForm({ visible, actividadId, onClose, onSaved }: {
  visible: boolean; actividadId: number | null; onClose: () => void; onSaved: () => void;
}) {
  const { toast, showToast, hideToast } = useToast();
  const showToastRef = useRef(showToast);
  useEffect(() => { showToastRef.current = showToast; });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [terapias, setTerapias] = useState<Terapia[]>([]);
  const { puedeProgramar } = usePermisosTerapia();
  const [pcdIdActividad, setPcdIdActividad] = useState<number | null>(null);
  const [tipo, setTipo] = useState<TipoActividad>('EJERCICIO');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [horarioInicio, setHorarioInicio] = useState('');
  const [horarioFin, setHorarioFin] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [frecuencia, setFrecuencia] = useState<FrecuenciaActividad>('DIARIA');
  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>([]);
  const [medSeleccionado, setMedSeleccionado] = useState<Medicamento | null>(null);
  const [medSearch, setMedSearch] = useState('');
  const [medOpen, setMedOpen] = useState(false);
  const [dosis, setDosis] = useState('');
  const [frecuenciaMed, setFrecuenciaMed] = useState('');
  const [indicacion, setIndicacion] = useState('');
  const [medico, setMedico] = useState('');
  const [terapiaSeleccionada, setTerapiaSeleccionada] = useState<Terapia | null>(null);
  const [terapiaOpen, setTerapiaOpen] = useState(false);
  const [recordarActivo, setRecordarActivo] = useState(false);
  const [recordarAntesMinutos, setRecordarAntesMinutos] = useState('');
  const [errores, setErrores] = useState<ErroresActividad>({});
  const [confirmarGuardar, setConfirmarGuardar] = useState(false);
  const [confirmarDescartar, setConfirmarDescartar] = useState(false);
  // Foto de los valores al abrir, para saber si hay cambios sin guardar.
  const [inicial, setInicial] = useState('');

  useEffect(() => {
    if (!visible || !actividadId) return;
    setLoading(true);
    setErrores({});
    setConfirmarGuardar(false);
    setConfirmarDescartar(false);
    Promise.all([
      actividadesApi.getOne(actividadId),
      medicamentosApi.getAll(),
      terapiasApi.getAll(),
    ]).then(([act, mList, tList]) => {
      setMedicamentos(mList);
      setTerapias(tList);
      setPcdIdActividad(act.pcdId);
      setTipo(act.tipoActividad);
      setTitulo(act.titulo);
      setDescripcion(act.descripcion);
      setFechaInicio(act.fechaInicio.slice(0, 10));
      setFechaFin(act.fechaFin.slice(0, 10));
      setHorarioInicio(act.horarioInicio ? formatHorario(act.horarioInicio) : '');
      setHorarioFin(act.horarioFin ? formatHorario(act.horarioFin) : '');
      setObservaciones(act.observaciones ?? '');
      setRecordarActivo(act.recordarAntesMinutos != null);
      setRecordarAntesMinutos(act.recordarAntesMinutos != null ? String(act.recordarAntesMinutos) : '');
      setFrecuencia(act.frecuencia);
      setDiasSeleccionados((act.diasSemana as string[]) ?? []);
      setMedOpen(false); setTerapiaOpen(false);
      if (act.medicamentos?.length) {
        const m = act.medicamentos[0];
        setMedSeleccionado({ id: m.medicamentoId, nombre: m.medicamento.nombre });
        setDosis(m.dosis ?? '');
        setFrecuenciaMed(m.frecuencia ?? '');
        setIndicacion(m.indicacion ?? '');
        setMedico(m.medicoPrescriptor ?? '');
      } else {
        setMedSeleccionado(null);
        setDosis(''); setFrecuenciaMed(''); setIndicacion(''); setMedico('');
      }
      if (act.terapia) {
        setTerapiaSeleccionada({ id: act.terapia.terapiaId, tipo: act.terapia.terapia.tipo });
      } else {
        setTerapiaSeleccionada(null);
      }
      const m = act.medicamentos?.[0];
      setInicial(JSON.stringify([
        act.titulo, act.descripcion, act.fechaInicio.slice(0, 10), act.fechaFin.slice(0, 10),
        act.horarioInicio ? formatHorario(act.horarioInicio) : '', act.horarioFin ? formatHorario(act.horarioFin) : '',
        act.observaciones ?? '', act.recordarAntesMinutos != null, act.recordarAntesMinutos != null ? String(act.recordarAntesMinutos) : '',
        act.frecuencia, (act.diasSemana as string[]) ?? [],
        m?.medicamentoId ?? null, m?.dosis ?? '', m?.frecuencia ?? '', m?.indicacion ?? '', m?.medicoPrescriptor ?? '',
        act.terapia?.terapiaId ?? null,
      ]));
    }).catch(() => showToastRef.current('No se pudo cargar la actividad', 'error'))
    .finally(() => setLoading(false));
  }, [visible, actividadId]);

  const toggleDia = (dia: string) =>
    setDiasSeleccionados((prev) => prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]);

  const actual = JSON.stringify([
    titulo, descripcion, fechaInicio, fechaFin, horarioInicio, horarioFin, observaciones, recordarActivo,
    recordarActivo ? recordarAntesMinutos : '',
    frecuencia, diasSeleccionados, medSeleccionado?.id ?? null, dosis, frecuenciaMed, indicacion, medico,
    terapiaSeleccionada?.id ?? null,
  ]);
  const hayCambios = !loading && inicial !== '' && actual !== inicial;

  const limpiarError = (campo: keyof ErroresActividad) =>
    setErrores((prev) => (prev[campo] ? { ...prev, [campo]: undefined } : prev));

  const cambiarFechaInicio = (f: string) => {
    setFechaInicio(f);
    limpiarError('fechaInicio');
    if (fechaFin && fechaFin <= f) setFechaFin('');
  };

  const cerrar = () => {
    if (hayCambios) setConfirmarDescartar(true);
    else onClose();
  };

  // Primero valida; si está todo bien, pide confirmación antes de guardar.
  const pedirConfirmacion = () => {
    Keyboard.dismiss();
    const e = validarActividad({
      titulo, descripcion, fechaInicio, fechaFin, horarioInicio, horarioFin, recordarActivo, recordarAntesMinutos,
      frecuencia, diasSeleccionados, tipo,
      medicamentoSeleccionado: medSeleccionado !== null, terapiaSeleccionada: terapiaSeleccionada !== null,
    });
    setErrores(e);
    if (Object.keys(e).length > 0) return showToast('Revisá los campos marcados en rojo', 'error');
    if (!hayCambios) return showToast('No hay cambios para guardar', 'error');
    setConfirmarGuardar(true);
  };

  const guardar = async () => {
    if (!actividadId) return;
    setConfirmarGuardar(false);
    setSaving(true);
    try {
      await actividadesApi.update(actividadId, {
        titulo, descripcion, fechaInicio, fechaFin, frecuencia,
        ...(horarioInicio && { horarioInicio: horarioInicio.slice(0, 5) }),
        ...(horarioFin && { horarioFin: horarioFin.slice(0, 5) }),
        ...(observaciones && { observaciones }),
        // Apagado manda null: el backend lo interpreta como "sin recordatorio".
        recordarAntesMinutos: recordarActivo ? Number(recordarAntesMinutos) : null,
        ...(frecuencia === 'DIAS_ESPECIFICOS' && { diasSemana: diasSeleccionados }),
        ...(tipo === 'MEDICAMENTO' && medSeleccionado && {
          medicamentos: [{
            medicamentoId: medSeleccionado.id,
            ...(dosis && { dosis }),
            ...(frecuenciaMed && { frecuencia: frecuenciaMed }),
            ...(indicacion && { indicacion }),
            ...(medico && { medicoPrescriptor: medico }),
          }],
        }),
        ...(tipo === 'TERAPIA' && terapiaSeleccionada && { terapiaId: terapiaSeleccionada.id }),
      });
      showToast('Actividad actualizada correctamente', 'success');
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo actualizar'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToastClose = () => {
    hideToast();
    if (toast.type === 'success') { onClose(); onSaved(); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={cerrar}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} accessibilityRole="header">Editar actividad</Text>
          <Tappable style={styles.modalClose} centrado onPress={cerrar} accessibilityRole="button" accessibilityLabel="Cerrar">
            <AppIcon name="close" size={24} color="#475569" />
          </Tappable>
        </View>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator accessibilityLabel="Cargando" size="large" color={COLORS.primary} />
          </View>
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">

              <View style={styles.tipoTag}>
                <Text style={styles.tipoTagText}>{tipo}</Text>
              </View>

              <Text style={styles.editSectionTitle} accessibilityRole="header">DATOS DE LA ACTIVIDAD</Text>
              <FormField label="Título *" value={titulo} onChange={(v) => { setTitulo(v); limpiarError('titulo'); }} maxLength={100} error={errores.titulo} />
              <FormField label="Descripción *" value={descripcion} onChange={(v) => { setDescripcion(v); limpiarError('descripcion'); }} multiline error={errores.descripcion} />
              <DatePickerField label="Fecha inicio *" value={fechaInicio} onChange={cambiarFechaInicio} />
              <FieldError text={errores.fechaInicio} />
              <DatePickerField
                label="Fecha fin *"
                value={fechaFin}
                onChange={(f) => { setFechaFin(f); limpiarError('fechaFin'); }}
                minDate={diaSiguiente(fechaInicio)}
              />
              <FieldError text={errores.fechaFin} />
              <TimePickerField label="Horario inicio" value={horarioInicio} onChange={(h) => { setHorarioInicio(h); limpiarError('horario'); }} />
              <TimePickerField label="Horario fin" value={horarioFin} onChange={(h) => { setHorarioFin(h); limpiarError('horario'); }} />
              <FieldError text={errores.horario} />
              <RecordatorioSwitch value={recordarActivo} onChange={(v) => { setRecordarActivo(v); limpiarError('recordar'); }} />
              {recordarActivo && (
                <FormField
                  label="Minutos antes *"
                  value={recordarAntesMinutos}
                  onChange={(v) => { setRecordarAntesMinutos(v.replace(/\D/g, '')); limpiarError('recordar'); }}
                  keyboardType="number-pad"
                  maxLength={4}
                  error={errores.recordar}
                />
              )}
              <FormField label="Observaciones" value={observaciones} onChange={setObservaciones} multiline />

              <Text style={styles.editSectionTitle} accessibilityRole="header">FRECUENCIA</Text>
              <View style={styles.frecRow}>
                {FRECUENCIAS.map((f) => (
                  <Tappable
                    accessibilityRole="radio"
                    accessibilityLabel={f.label}
                    selected={frecuencia === f.value}
                    key={f.value}
                    style={[styles.frecChip, frecuencia === f.value && styles.frecChipActive]}
                    onPress={() => setFrecuencia(f.value)}
                  >
                    <Text style={[styles.frecText, frecuencia === f.value && styles.frecTextActive]}>{f.label}</Text>
                  </Tappable>
                ))}
              </View>

              {frecuencia === 'DIAS_ESPECIFICOS' && (
                <>
                  <Text style={styles.editSectionTitle} accessibilityRole="header">DÍAS DE LA SEMANA *</Text>
                  <FieldError text={errores.dias} />
                  <View style={styles.diasRow}>
                    {DIAS_SEMANA.map((dia) => (
                      <Tappable
                        accessibilityRole="checkbox"
                        accessibilityLabel={dia}
                        checked={diasSeleccionados.includes(dia)}
                        key={dia}
                        style={[styles.diaChip, diasSeleccionados.includes(dia) && styles.diaChipActive]}
                        onPress={() => { toggleDia(dia); limpiarError('dias'); }}
                      >
                        <Text style={[styles.diaText, diasSeleccionados.includes(dia) && styles.diaTextActive]}>
                          {dia.slice(0, 3)}
                        </Text>
                      </Tappable>
                    ))}
                  </View>
                </>
              )}

              {tipo === 'MEDICAMENTO' && (
                <>
                  <Text style={styles.editSectionTitle} accessibilityRole="header">MEDICAMENTO *</Text>
                  <FieldError text={errores.medicamento} />
                  {medSeleccionado ? (
                    <View style={styles.medChip}>
                      <AppIcon name="medkit-outline" size={14} color="#C2410C" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.medChipText} numberOfLines={1}>{medSeleccionado.nombre}</Text>
                        {medSeleccionado.presentacion && (
                          <Text style={styles.medChipSub} numberOfLines={1}>{medSeleccionado.presentacion}</Text>
                        )}
                      </View>
                      <Tappable centrado accessibilityRole="button" accessibilityLabel="Quitar el medicamento elegido" onPress={() => { setMedSeleccionado(null); setMedSearch(''); }}>
                        <AppIcon name="close-circle" size={16} color="#C2410C" />
                      </Tappable>
                    </View>
                  ) : (
                    <View style={styles.medSearchWrap}>
                      <AppIcon name="search-outline" size={16} color="#556274" />
                      <AppTextInput
                        accessibilityLabel="Buscar medicamento"
                        placeholder="Buscar medicamento..."
                        placeholderTextColor={COLORS.textMuted}
                        value={medSearch}
                        onChangeText={(t) => { setMedSearch(t); setMedOpen(true); }}
                        onFocus={() => setMedOpen(true)}
                        onBlur={() => setTimeout(() => setMedOpen(false), 150)}
                        style={styles.medSearchInput}
                      />
                      {medSearch.length > 0 && (
                        <Tappable centrado accessibilityRole="button" accessibilityLabel="Borrar la búsqueda de medicamento" onPress={() => { setMedSearch(''); setMedOpen(false); }}>
                          <AppIcon name="close" size={16} color="#556274" />
                        </Tappable>
                      )}
                    </View>
                  )}
                  {(() => {
                    // Hasta MAX_RESULTADOS: el catálogo crece y la lista no puede ser infinita.
                    const { visibles: filtrados, hayMas } = buscar(medicamentos, medSearch, (m) => m.nombre, 0);
                    if (!medOpen || medSeleccionado) return null;
                    if (filtrados.length > 0) return (
                      <View style={styles.medDropdown}>
                        {hayMas && <Text style={styles.medDropdownEmpty}>Hay más resultados. Escribí más para afinar la búsqueda.</Text>}
                        {filtrados.map((m) => (
                          <Tappable
                            accessibilityRole="button"
                            accessibilityLabel={m.nombre}
                            key={m.id}
                            style={styles.medDropdownItem}
                            onPress={() => { setMedSeleccionado(m); setMedOpen(false); setMedSearch(''); limpiarError('medicamento'); }}
                          >
                            <AppIcon name="medkit-outline" size={16} color="#C2410C" />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.medDropdownText}>{m.nombre}</Text>
                              {m.presentacion ? <Text style={styles.medDropdownSub}>{m.presentacion}</Text> : null}
                            </View>
                          </Tappable>
                        ))}
                      </View>
                    );
                    if (medSearch.length > 0) return (
                      <View style={styles.medDropdown}>
                        <Text style={styles.medDropdownEmpty}>Sin resultados</Text>
                      </View>
                    );
                    return null;
                  })()}
                  <FormField label="Dosis" value={dosis} onChange={setDosis} maxLength={100} />
                  <FormField label="Frecuencia" value={frecuenciaMed} onChange={setFrecuenciaMed} maxLength={100} />
                  <FormField label="Indicación" value={indicacion} onChange={setIndicacion} />
                  <FormField label="Médico prescriptor" value={medico} onChange={setMedico} maxLength={100} />
                </>
              )}

              {tipo === 'TERAPIA' && (
                <>
                  <Text style={styles.editSectionTitle} accessibilityRole="header">TERAPIA *</Text>
                  <FieldError text={errores.terapia} />
                  <Tappable accessibilityRole="button" accessibilityLabel={`Terapia: ${terapiaSeleccionada ? terapiaSeleccionada.tipo : 'sin seleccionar'}`} expanded={terapiaOpen} style={styles.dropdownBtn} onPress={() => setTerapiaOpen((v) => !v)}>
                    <AppIcon name="pulse-outline" size={18} color="#4338CA" />
                    <Text style={[styles.dropdownBtnText, !terapiaSeleccionada && styles.placeholder]}>
                      {terapiaSeleccionada ? terapiaSeleccionada.tipo : 'Seleccionar terapia...'}
                    </Text>
                    <AppIcon name={terapiaOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#556274" />
                  </Tappable>
                  {terapiaOpen && (
                    <View style={styles.dropdown}>
                      {terapias.filter((t) => puedeProgramar(t, pcdIdActividad)).map((t) => (
                        <Tappable
                          accessibilityRole="radio"
                          accessibilityLabel={t.tipo}
                          selected={terapiaSeleccionada?.id === t.id}
                          key={t.id}
                          style={[styles.dropdownItem, terapiaSeleccionada?.id === t.id && styles.dropdownItemActive]}
                          onPress={() => { setTerapiaSeleccionada(t); setTerapiaOpen(false); limpiarError('terapia'); }}
                        >
                          <Text style={styles.dropdownItemText}>{t.tipo}</Text>
                        </Tappable>
                      ))}
                    </View>
                  )}
                </>
              )}

              <Tappable
                accessibilityLabel={saving ? 'Guardando' : 'Guardar cambios'}
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={pedirConfirmacion} disabled={saving || (toast.visible && toast.type === 'success')}
                accessibilityRole="button"
              >
                <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
              </Tappable>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
        <Toast {...toast} onClose={handleToastClose} />
      </View>

      <ConfirmDialog
        visible={confirmarGuardar}
        title="¿Guardar los cambios?"
        message="Si cambiaste las fechas o la frecuencia, se ajustan las sesiones pendientes. Las realizadas y canceladas no se tocan."
        icon="save-outline"
        confirmLabel="Guardar"
        onCancel={() => setConfirmarGuardar(false)}
        onConfirm={guardar}
      />
      <ConfirmDialog
        visible={confirmarDescartar}
        variant="warning"
        title="¿Descartar los cambios?"
        message="Si cerrás ahora, los cambios que hiciste en la actividad se pierden."
        cancelLabel="Seguir editando"
        confirmLabel="Descartar"
        onCancel={() => setConfirmarDescartar(false)}
        onConfirm={() => { setConfirmarDescartar(false); onClose(); }}
      />
    </Modal>
  );
}

function ActividadDetalleSkeleton() {
  return (
    <View style={det.container}>
      <View style={det.skeleton}>
        <Skeleton height={190} borderRadius={DS.radius.featured} />
        <Skeleton height={52} borderRadius={DS.radius.control} />
        <Skeleton height={86} borderRadius={DS.radius.card} />
        <Skeleton height={180} borderRadius={DS.radius.card} />
      </View>
    </View>
  );
}

/** Fila de dato con ícono de color. */
function Dato({ icon, tono, label, value, ultimo }: {
  icon: keyof typeof Ionicons.glyphMap; tono: 'indigo' | 'teal' | 'rosa' | 'ambar';
  label: string; value?: string | null; ultimo?: boolean;
}) {
  if (!value) return null;
  const t = TONOS_DATO[tono];
  return (
    <View style={[det.dato, !ultimo && det.datoBorde]}>
      <View style={[det.datoIcono, { backgroundColor: t.bg }]}>
        <AppIcon name={icon} size={20} color={t.fg} />
      </View>
      <View style={det.flex}>
        <Text style={det.datoLabel}>{label}</Text>
        <Text style={det.datoValor}>{value}</Text>
      </View>
    </View>
  );
}

const TONOS_DATO = {
  indigo: { bg: '#EEF2FF', fg: '#4338CA' },
  teal: { bg: '#CCFBF1', fg: '#0F766E' },
  rosa: { bg: '#FCE7F3', fg: '#BE185D' },
  ambar: { bg: '#FEF3C7', fg: '#B45309' },
};

export default function ActividadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { toast, showToast, hideToast } = useToast();
  const showToastRef = useRef(showToast);
  useEffect(() => { showToastRef.current = showToast; });
  const [actividad, setActividad] = useState<Actividad | null>(null);
  const [instancias, setInstancias] = useState<ActividadInstancia[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingInst, setLoadingInst] = useState(false);
  const [tab, setTab] = useState<'info' | 'instancias'>('info');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [reporteModal, setReporteModal] = useState<{ instanciaId: number | null } | null>(null);

  
  const [completarConfirm, setCompletarConfirm] = useState(false);
  const [eliminarConfirm, setEliminarConfirm] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [confirmarInstanciaTarget, setConfirmarInstanciaTarget] = useState<number | null>(null);
  const [cancelarInstanciaTarget, setCancelarInstanciaTarget] = useState<number | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');

  // Solo el creador gestiona la actividad (editar, completar, eliminar, cancelar
  // sesiones), tenga o no permisos de administrador. Las sesiones de TERAPIA
  // solo las confirma un Profesional.
  const canEdit = user?.id === actividad?.creadoPorUserId;
  // El médico de cabecera ve las actividades de otros, pero no confirma sus sesiones.
  const canConfirm =
    (user?.tipoUsuario === 'PROFESIONAL' && (canEdit || !!user.esAdministrador)) ||
    (user?.tipoUsuario === 'TUTOR' && actividad?.tipoActividad !== 'TERAPIA');
  // Los reportes los crea un Profesional (el backend exige además vínculo activo con el PCD).
  const canReport = user?.tipoUsuario === 'PROFESIONAL';

  const cargarActividad = useCallback(() => {
    actividadesApi.getOne(Number(id))
      .then(setActividad)
      .catch(() => showToastRef.current('No se pudo cargar la actividad', 'error'))
      .finally(() => setLoading(false));
  }, [id]);

  const cargarInstancias = useCallback(async () => {
    if (!id) return;
    setLoadingInst(true);
    try {
      setInstancias(await actividadesApi.getInstancias(Number(id)));
    } finally {
      setLoadingInst(false);
    }
  }, [id]);

  useEffect(() => { cargarActividad(); }, [cargarActividad]);
  useEffect(() => { if (tab === 'instancias') cargarInstancias(); }, [tab, cargarInstancias]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setCompletarConfirm(false);
        setEliminarConfirm(false);
        setConfirmarInstanciaTarget(null);
        setCancelarInstanciaTarget(null);
        setMotivoCancelacion('');
      };
    }, [])
  );

  const confirmarInstancia = async (instanciaId: number) => {
    setConfirmarInstanciaTarget(null);
    try {
      await actividadesApi.confirmarInstancia(Number(id), instanciaId);
      cargarInstancias();
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo confirmar la sesión'), 'error');
    }
  };

  const cancelarInstancia = async (instanciaId: number) => {
    setCancelarInstanciaTarget(null);
    const motivo = motivoCancelacion.trim();
    setMotivoCancelacion('');
    try {
      await actividadesApi.cancelarInstancia(Number(id), instanciaId, motivo || undefined);
      cargarInstancias();
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo cancelar la sesión'), 'error');
    }
  };

  const completar = async () => {
    setCompletarConfirm(false);
    try {
      const updated = await actividadesApi.updateEstado(Number(id), 'COMPLETADA');
      setActividad(updated);
      showToast('Actividad marcada como completada', 'success');
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo completar la actividad'), 'error');
    }
  };

  const eliminar = async () => {
    setEliminando(true);
    try {
      await actividadesApi.remove(Number(id));
      setEliminarConfirm(false);
      // Aviso global: esta pantalla se cierra y el mensaje se ve en la lista.
      useToastStore.getState().show(`Actividad "${actividad?.titulo ?? ''}" eliminada correctamente`, 'success');
      volver(router, '/(app)/actividades');
    } catch (e: any) {
      setEliminarConfirm(false);
      showToast(getErrorMessage(e, 'No se pudo eliminar la actividad'), 'error');
    } finally {
      setEliminando(false);
    }
  };

  if (loading) return <ActividadDetalleSkeleton />;
  if (!actividad) return null;

  const visual = TIPO_VISUAL[actividad.tipoActividad];
  const completada = actividad.estado === 'COMPLETADA';
  const persona = `${actividad.pcd.usuario.nombre} ${actividad.pcd.usuario.apellido}`;
  const horario = actividad.horarioInicio
    ? `${formatHorario(actividad.horarioInicio)}${actividad.horarioFin ? ` – ${formatHorario(actividad.horarioFin)}` : ''}`
    : 'Sin horario';
  const fechaCorta = (iso: string) => formatFechaLocal(iso, { day: '2-digit', month: '2-digit' });

  // Avance de las sesiones: con las ya cargadas, o con las que trae la actividad.
  const sesiones = instancias.length > 0 ? instancias : (actividad.instancias ?? []);
  const validas = sesiones.filter((s) => s.estado !== 'CANCELADA');
  const realizadas = validas.filter((s) => s.estado === 'REALIZADA').length;
  const avance = validas.length > 0 ? realizadas / validas.length : 0;

  return (
    <View style={det.container}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={det.scroll}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[]}
      >
        <Card dark featured style={[det.hero, { paddingTop: insets.top + 14 }]}>
          <OrbitDecor />
          <View style={det.heroTop}>
            <Tappable
              centrado
              onPress={() => volver(router, '/(app)/actividades')}
              accessibilityRole="button"
              accessibilityLabel="Volver a las actividades"
              style={det.volver}
            >
              <AppIcon name="chevron-back" size={22} color={DS.colors.onPrimary} />
            </Tappable>
            <Chip label={completada ? 'Completada' : 'Pendiente'} tone={completada ? 'success' : 'warning'} />
          </View>

          <View style={[det.heroIcono, { backgroundColor: visual.bg }]}>
            <AppIcon name={visual.icon} size={32} color={visual.fg} />
          </View>
          <Text style={det.heroTitulo} accessibilityRole="header">{actividad.titulo}</Text>
          <View style={det.heroPersona}>
            <AppIcon name="person-outline" size={16} color={DS.colors.onPrimaryMuted} />
            <Text style={det.heroPersonaTexto}>{persona}</Text>
          </View>
          <Chip label={visual.label} tone="accent" />

          {validas.length > 0 && (
            <View style={det.avance}>
              <View style={det.avanceFila}>
                <Text style={det.avanceTexto}>Sesiones realizadas</Text>
                <Text style={det.avanceTexto}>{realizadas} de {validas.length}</Text>
              </View>
              <View style={det.barra}>
                <View style={[det.barraRelleno, { width: `${Math.round(avance * 100)}%` }]} />
              </View>
            </View>
          )}
        </Card>

        <View style={det.datos}>
          <View style={det.dato3}>
            <AppIcon name="repeat-outline" size={22} color={DS.colors.accent} />
            <Text style={det.dato3Valor} numberOfLines={1}>{FRECUENCIA_LABEL[actividad.frecuencia]}</Text>
            <Text style={det.dato3Label}>Frecuencia</Text>
          </View>
          <View style={det.dato3}>
            <AppIcon name="time-outline" size={22} color={DS.colors.accent} />
            <Text style={det.dato3Valor} numberOfLines={1}>{horario}</Text>
            <Text style={det.dato3Label}>Horario</Text>
          </View>
          <View style={det.dato3}>
            <AppIcon name="calendar-outline" size={22} color={DS.colors.accent} />
            <Text style={det.dato3Valor} numberOfLines={1}>{fechaCorta(actividad.fechaInicio)} – {fechaCorta(actividad.fechaFin)}</Text>
            <Text style={det.dato3Label}>Vigencia</Text>
          </View>
        </View>

        <View style={det.segmentado} accessibilityRole="tablist">
          {(['info', 'instancias'] as const).map((t) => (
            <Tappable
              centrado
              accessibilityRole="tab"
              accessibilityLabel={t === 'info' ? 'Información' : 'Sesiones'}
              selected={tab === t}
              key={t}
              style={[det.segmento, tab === t && det.segmentoActivo]}
              onPress={() => setTab(t)}
            >
              <Text style={[det.segmentoTexto, tab === t && det.segmentoTextoActivo]}>
                {t === 'info' ? 'Información' : 'Sesiones'}
              </Text>
            </Tappable>
          ))}
        </View>

        {tab === 'info' ? (
          <>
            <View>
              <Text style={det.seccion} accessibilityRole="header">Detalles</Text>
              <Card style={det.card}>
                <Dato icon="document-text-outline" tono="indigo" label="Descripción" value={actividad.descripcion} />
                {actividad.diasSemana && (
                  <Dato icon="calendar-number-outline" tono="teal" label="Días" value={(actividad.diasSemana as string[]).join(', ')} />
                )}
                {actividad.recordarAntesMinutos != null && (
                  <Dato icon="notifications-outline" tono="ambar" label="Recordatorio" value={`${actividad.recordarAntesMinutos} minutos antes`} />
                )}
                <Dato icon="person-circle-outline" tono="rosa" label="Creada por" value={`${actividad.creadoPor.nombre} ${actividad.creadoPor.apellido}`} ultimo={!actividad.observaciones} />
                <Dato icon="chatbox-ellipses-outline" tono="indigo" label="Observaciones" value={actividad.observaciones} ultimo />
              </Card>
            </View>

            {actividad.medicamentos && actividad.medicamentos.length > 0 && (
              <View>
                <Text style={det.seccion} accessibilityRole="header">Medicamentos</Text>
                <View style={det.lista}>
                  {actividad.medicamentos.map((m) => (
                    <Card key={m.medicamentoId} style={det.card}>
                      <Dato icon="medkit-outline" tono="ambar" label="Medicamento" value={m.medicamento.nombre} />
                      <Dato icon="water-outline" tono="teal" label="Dosis" value={m.dosis} />
                      <Dato icon="repeat-outline" tono="indigo" label="Frecuencia" value={m.frecuencia} />
                      <Dato icon="information-circle-outline" tono="rosa" label="Indicación" value={m.indicacion} />
                      <Dato icon="person-outline" tono="indigo" label="Médico" value={m.medicoPrescriptor} ultimo />
                    </Card>
                  ))}
                </View>
              </View>
            )}

            {actividad.terapia && (
              <View>
                <Text style={det.seccion} accessibilityRole="header">Terapia</Text>
                <Card style={det.card}>
                  <Dato icon="pulse-outline" tono="indigo" label="Tipo" value={actividad.terapia.terapia.tipo} />
                  <Dato icon="document-text-outline" tono="teal" label="Descripción" value={actividad.terapia.terapia.descripcion} ultimo />
                </Card>
              </View>
            )}

            <View style={det.acciones}>
              <Text style={det.seccion} accessibilityRole="header">Acciones</Text>
              {canReport && (
                <Button label="Crear reporte" onPress={() => setReporteModal({ instanciaId: null })} />
              )}
              <Button
                label="Ver reportes de esta actividad"
                variant="secondary"
                onPress={() => router.navigate({ pathname: '/(app)/reportes', params: { actividadId: id } } as any)}
              />
              {canEdit && actividad.estado === 'PENDIENTE' && (
                <Button label="Editar actividad" variant="secondary" onPress={() => setEditModalVisible(true)} />
              )}
              {canEdit && actividad.estado === 'PENDIENTE' && (
                <Button label="Marcar como completada" variant="secondary" onPress={() => setCompletarConfirm(true)} />
              )}
              {canEdit && (
                <Tappable
                  centrado
                  style={det.eliminar}
                  onPress={() => setEliminarConfirm(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Eliminar actividad"
                >
                  <AppIcon name="trash-outline" size={20} color={DS.colors.error} />
                  <Text style={det.eliminarTexto}>Eliminar actividad</Text>
                </Tappable>
              )}
            </View>
          </>
        ) : loadingInst ? (
          <View style={det.centro}><ActivityIndicator accessibilityLabel="Cargando" size="large" color={DS.colors.primary} /></View>
        ) : instancias.length === 0 ? (
          <View style={det.centro}>
            <View style={det.vacioIcono}><AppIcon name="calendar-outline" size={32} color={DS.colors.textTertiary} /></View>
            <Text style={det.vacioTexto}>Sin sesiones registradas</Text>
          </View>
        ) : (
          <View style={det.lista}>
            {instancias.map((item) => (
              <InstanciaItem
                key={item.id}
                item={item}
                canConfirm={canConfirm}
                canCancel={canEdit}
                canReport={canReport}
                onReport={() => setReporteModal({ instanciaId: item.id })}
                onConfirm={() => setConfirmarInstanciaTarget(item.id)}
                onCancel={() => { setMotivoCancelacion(''); setCancelarInstanciaTarget(item.id); }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={completarConfirm}
        title="¿Marcar como completada?"
        message="La actividad pasa a completada. Requiere que no queden sesiones pendientes."
        icon="checkmark-circle-outline"
        confirmLabel="Completar"
        onCancel={() => setCompletarConfirm(false)}
        onConfirm={completar}
      />
      <ConfirmDialog
        visible={eliminarConfirm}
        variant="danger"
        title="¿Eliminar la actividad?"
        message="Se eliminan la actividad y todas sus sesiones. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        loading={eliminando}
        onCancel={() => setEliminarConfirm(false)}
        onConfirm={eliminar}
      />
      <ConfirmDialog
        visible={confirmarInstanciaTarget !== null}
        title="¿Confirmar la sesión?"
        message="La sesión queda marcada como realizada."
        icon="checkmark-done-outline"
        confirmLabel="Confirmar"
        onCancel={() => setConfirmarInstanciaTarget(null)}
        onConfirm={() => { if (confirmarInstanciaTarget !== null) void confirmarInstancia(confirmarInstanciaTarget); }}
      />
      <ConfirmDialog
        visible={cancelarInstanciaTarget !== null}
        variant="danger"
        icon="close-circle-outline"
        title="¿Cancelar la sesión?"
        message="La sesión pendiente queda cancelada y no se puede volver a confirmar."
        cancelLabel="Volver"
        confirmLabel="Cancelar sesión"
        onCancel={() => { setCancelarInstanciaTarget(null); setMotivoCancelacion(''); }}
        onConfirm={() => { if (cancelarInstanciaTarget !== null) void cancelarInstancia(cancelarInstanciaTarget); }}
      >
        <AppTextInput
          placeholder="Motivo (opcional)"
          placeholderTextColor={COLORS.textMuted}
          value={motivoCancelacion}
          onChangeText={setMotivoCancelacion}
          maxLength={255}
          style={styles.motivoInput}
          accessibilityLabel="Motivo de la cancelación (opcional)"
        />
      </ConfirmDialog>

      <EditarActividadForm
        visible={editModalVisible}
        actividadId={Number(id)}
        onClose={() => setEditModalVisible(false)}
        onSaved={() => {
          setLoading(true);
          cargarActividad();
        }}
      />
      <NuevoReporteForm
        visible={reporteModal !== null}
        actividadInicial={actividad}
        instanciaInicialId={reporteModal?.instanciaId ?? null}
        onClose={() => setReporteModal(null)}
        onSaved={() => showToast('Reporte creado. Lo encontrás en "Ver reportes de esta actividad".', 'success')}
      />
      <Toast {...toast} onClose={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SIZES.sm },
  emptyText: { ...FONTS.body, color: COLORS.textMuted },

  headerCard: {
    backgroundColor: '#FFFFFF', padding: SIZES.lg, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  headerIcon: {
    width: 64, height: 64, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginBottom: SIZES.sm,
  },
  headerTitle: { ...FONTS.h4, color: '#0F172A', fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  headerPcd: { ...FONTS.caption, color: COLORS.textMuted, marginBottom: SIZES.sm },
  headerBadges: { flexDirection: 'row', gap: SIZES.sm },

  tabs: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { ...FONTS.caption, color: '#556274', fontWeight: '600' },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },

  content: { padding: SIZES.lg, paddingBottom: SIZES.xl },
  sectionTitle: {
    ...FONTS.small, fontWeight: '700', color: '#556274',
    letterSpacing: 0.5, marginBottom: SIZES.xs, marginTop: SIZES.sm, paddingHorizontal: 2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: SIZES.md,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { ...FONTS.small, fontWeight: '700' },

  instanciaCard: {
    backgroundColor: '#FFFFFF', borderRadius: DS.radius.control, padding: SIZES.md,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: SIZES.sm, gap: SIZES.sm,
  },
  instanciaTop: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  instanciaIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  instanciaFecha: { ...FONTS.bodyBold, color: '#0F172A', flex: 1, textTransform: 'capitalize' },
  instanciaActions: { flexDirection: 'row', gap: SIZES.sm },
  confirmarBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: 10, minHeight: 48,
  },
  confirmarText: { ...FONTS.bodyBold, color: '#FFFFFF', fontWeight: '700' },
  cancelarInstanciaBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#FFFFFF', borderRadius: 10, minHeight: 48,
    borderWidth: 1.5, borderColor: COLORS.error,
  },
  cancelarInstanciaText: { ...FONTS.bodyBold, color: COLORS.error, fontWeight: '700' },
  reportarBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#FFFFFF', borderRadius: 10, minHeight: 48,
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  reportarText: { ...FONTS.bodyBold, color: COLORS.primary, fontWeight: '700' },
  fieldError: { marginTop: -4, marginBottom: 4, paddingHorizontal: 4 },
  motivoInput: {
    alignSelf: 'stretch', minHeight: 48,
    backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: SIZES.sm, paddingVertical: 8, ...FONTS.caption, color: '#0F172A',
  },


  modal: { flex: 1, padding: SIZES.lg, backgroundColor: '#F8FAFC' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.lg },
  modalTitle: { fontFamily: DS.font.bold, fontSize: 24, color: DS.colors.text },
  modalClose: { width: 46, height: 46, borderRadius: 23, backgroundColor: DS.colors.surface, borderWidth: DS.border, borderColor: DS.colors.border, alignItems: 'center', justifyContent: 'center' },
  modalContent: { paddingBottom: SIZES.xl },
  tipoTag: {
    alignSelf: 'flex-start', backgroundColor: '#EEF2FF',
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginBottom: SIZES.sm,
  },
  tipoTagText: { ...FONTS.caption, color: '#4338CA', fontWeight: '700' },
  editSectionTitle: {
    ...FONTS.small, fontWeight: '700', color: '#556274',
    letterSpacing: 0.5, marginTop: SIZES.lg, marginBottom: SIZES.xs,
  },
  input: { marginBottom: SIZES.xs, backgroundColor: '#FFFFFF' },
  inputOutline: { borderRadius: 14 },
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: SIZES.md,
    borderWidth: DS.border, borderColor: DS.colors.border, marginBottom: 4,
  },
  dropdownBtnText: { ...FONTS.body, color: '#0F172A', flex: 1 },
  placeholder: { color: COLORS.textMuted },
  dropdown: {
    backgroundColor: '#FFFFFF', borderRadius: 14, marginBottom: SIZES.sm,
    borderWidth: DS.border, borderColor: DS.colors.border, overflow: 'hidden',
  },
  dropdownItem: { padding: SIZES.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownItemActive: { backgroundColor: '#EEF2FF' },
  dropdownItemText: { ...FONTS.body, color: '#0F172A', fontWeight: '600' },
  dropdownItemSub: { ...FONTS.small, color: COLORS.textMuted, marginTop: 2 },
  medSearchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.xs,
    backgroundColor: '#FFFFFF', borderRadius: DS.radius.control, paddingHorizontal: SIZES.md, paddingVertical: 10,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  medSearchInput: { flex: 1, ...FONTS.body, color: '#0F172A', padding: 0 },
  medChip: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.xs,
    backgroundColor: '#FFF0E8', borderRadius: DS.radius.control, paddingHorizontal: SIZES.md, paddingVertical: 10,
    borderWidth: 1, borderColor: '#FCCBAB',
  },
  medChipText: { ...FONTS.caption, color: '#C2410C', fontWeight: '700' as const },
  medChipSub: { ...FONTS.small, color: '#C2410C', opacity: 0.7 },
  medDropdown: {
    backgroundColor: '#FFFFFF', borderRadius: DS.radius.control, borderWidth: DS.border, borderColor: DS.colors.border,
    marginTop: 4, overflow: 'hidden',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 5,
  },
  medDropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    padding: SIZES.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  medDropdownText: { ...FONTS.body, color: '#0F172A', fontWeight: '600' as const },
  medDropdownSub: { ...FONTS.small, color: COLORS.textMuted, marginTop: 2 },
  medDropdownEmpty: { ...FONTS.caption, color: COLORS.textMuted, padding: SIZES.md, textAlign: 'center' as const },
  frecRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.xs },
  frecChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: '#FFFFFF', borderWidth: DS.border, borderColor: DS.colors.border,
  },
  frecChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  frecText: { ...FONTS.caption, color: COLORS.primary, fontWeight: '600' },
  frecTextActive: { color: '#FFFFFF' },
  diasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.xs },
  diaChip: {
    width: 46, height: 46, borderRadius: 23,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderWidth: DS.border, borderColor: DS.colors.border,
  },
  diaChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  diaText: { ...FONTS.small, color: COLORS.primary, fontWeight: '700' },
  diaTextActive: { color: '#FFFFFF' },
  saveBtn: { backgroundColor: DS.colors.primary, borderRadius: DS.radius.control, minHeight: 54, justifyContent: 'center', alignItems: 'center', marginTop: SIZES.md },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { ...FONTS.bodyBold, color: '#FFFFFF', fontWeight: '700' },
});

/** Estilos de la pantalla de detalle (el formulario de edición usa `styles`). */
const det = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: DS.colors.background },
  scroll: { paddingBottom: 56, gap: DS.space.section },
  skeleton: { padding: DS.space.screen, paddingTop: 64, gap: 16 },

  hero: {
    marginHorizontal: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderRadius: 0,
    borderBottomLeftRadius: DS.radius.featured + 6, borderBottomRightRadius: DS.radius.featured + 6,
    paddingHorizontal: DS.space.screen, paddingBottom: 24, alignItems: 'center', gap: 10, overflow: 'hidden',
  },
  heroTop: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  volver: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.12)' },
  heroIcono: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  heroTitulo: { fontFamily: DS.font.bold, fontSize: 24, lineHeight: 30, color: DS.colors.onPrimary, textAlign: 'center' },
  heroPersona: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroPersonaTexto: { fontFamily: DS.font.medium, fontSize: 15, color: DS.colors.onPrimaryMuted },
  avance: { width: '100%', gap: 8, marginTop: 8 },
  avanceFila: { flexDirection: 'row', justifyContent: 'space-between' },
  avanceTexto: { fontFamily: DS.font.medium, fontSize: 13, color: DS.colors.onPrimaryMuted },
  barra: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' },
  barraRelleno: { height: 8, borderRadius: 4, backgroundColor: '#14B8A6' },

  datos: { flexDirection: 'row', gap: 10, paddingHorizontal: DS.space.screen },
  dato3: {
    flex: 1, alignItems: 'center', gap: 4, padding: 12, backgroundColor: DS.colors.surface,
    borderRadius: DS.radius.card, borderWidth: DS.border, borderColor: DS.colors.border,
  },
  dato3Valor: { fontFamily: DS.font.bold, fontSize: 13, color: DS.colors.text, textAlign: 'center' },
  dato3Label: { fontFamily: DS.font.regular, fontSize: 12, color: DS.colors.textTertiary },

  segmentado: {
    flexDirection: 'row', padding: 4, gap: 4, marginHorizontal: DS.space.screen, borderRadius: DS.radius.control,
    backgroundColor: '#EEF2F6', borderWidth: DS.border, borderColor: DS.colors.border,
  },
  segmento: { flex: 1, minHeight: 44, borderRadius: DS.radius.control - 4 },
  segmentoActivo: { backgroundColor: DS.colors.surface },
  segmentoTexto: { fontFamily: DS.font.semibold, fontSize: 14, color: DS.colors.textSecondary },
  segmentoTextoActivo: { color: DS.colors.text, fontFamily: DS.font.bold },

  seccion: { fontFamily: DS.font.bold, fontSize: 18, color: DS.colors.text, marginBottom: 10, marginHorizontal: DS.space.screen },
  card: { marginHorizontal: DS.space.screen, overflow: 'hidden' },
  lista: { gap: 12, paddingHorizontal: DS.space.screen },
  dato: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, minHeight: 64 },
  datoBorde: { borderBottomWidth: DS.border, borderBottomColor: DS.colors.border },
  datoIcono: { width: 40, height: 40, borderRadius: DS.radius.control, alignItems: 'center', justifyContent: 'center' },
  datoLabel: { fontFamily: DS.font.medium, fontSize: 12, color: DS.colors.textTertiary },
  datoValor: { fontFamily: DS.font.semibold, fontSize: 15, lineHeight: 21, color: DS.colors.text },

  acciones: { gap: 10, paddingHorizontal: DS.space.screen },
  eliminar: {
    flexDirection: 'row', gap: 8, height: 54, borderRadius: DS.radius.control, marginTop: 8,
    borderWidth: DS.border, borderColor: '#FECACA', backgroundColor: DS.colors.errorSoft,
  },
  eliminarTexto: { fontFamily: DS.font.semibold, fontSize: 16, color: DS.colors.error },

  sesion: {
    backgroundColor: DS.colors.surface, borderRadius: DS.radius.card, padding: 14, gap: 12,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  sesionTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sesionIcono: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sesionFecha: { flex: 1, fontFamily: DS.font.semibold, fontSize: 15, color: DS.colors.text, textTransform: 'capitalize' },
  sesionAcciones: { flexDirection: 'row', gap: 10 },
  peligroBtn: {
    height: 46, borderRadius: DS.radius.control, borderWidth: DS.border, borderColor: '#FECACA',
    backgroundColor: DS.colors.errorSoft,
  },
  peligroTexto: { fontFamily: DS.font.semibold, fontSize: 16, color: DS.colors.error },

  centro: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  vacioIcono: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: DS.colors.surface,
    borderWidth: DS.border, borderColor: DS.colors.border, alignItems: 'center', justifyContent: 'center',
  },
  vacioTexto: { fontFamily: DS.font.regular, fontSize: 14, color: DS.colors.textSecondary, textAlign: 'center' },
});
