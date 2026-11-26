import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Button, Card, Chip, Entrar, FormError as HelperText, FormTextInput as TextInput, OrbitDecor, ProgressRing, ScreenHeader } from '@/components/ds';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Toast, useToast } from '@/components/Toast';
import { Skeleton } from '@/components/Skeleton';
import { actividadesApi } from '@/api/actividades';
import { medicamentosApi } from '@/api/medicamentos';
import { terapiasApi } from '@/api/terapias';
import { usePermisosTerapia } from '@/hooks/usePermisosTerapia';
import { tutorPcdApi } from '@/api/tutor-pcd';
import { usuariosApi } from '@/api/usuarios';
import { vinculosApi } from '@/api/vinculos';
import { DatePickerField } from '@/components/DatePickerField';
import { RecordatorioSwitch } from '@/components/RecordatorioSwitch';
import { TimePickerField } from '@/components/TimePickerField';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { useAsyncData, useRecargarAlEnfocar } from '@/hooks/useAsyncData';
import { useAuthStore } from '@/store/auth.store';
import { Actividad, DIAS_SEMANA, FrecuenciaActividad, TipoActividad } from '@/types/actividad.types';
import { getErrorMessage } from '@/utils/http-error';
import { diaSiguiente, ErroresActividad, validarActividad } from '@/utils/actividad-validation';
import { buscar } from '@/utils/search';
import { AppIcon, AppTextInput, Tappable } from '@/components/a11y';
import { SearchBar } from '@/components/SearchBar';
import { FRECUENCIA_LABEL, TIPO_VISUAL } from '@/constants/actividad-visual';
import { DS } from '@/constants/tokens';
import { volver } from '@/utils/navegacion';

interface Medicamento { id: number; nombre: string; presentacion?: string }
interface Terapia { id: number; tipo: string; especialidad?: { id: number } | null }
interface PcdItem { id: number; nombre: string; apellido: string }

const TIPO_CONFIG: Record<TipoActividad, { icon: any; bg: string; color: string; label: string }> = {
  EJERCICIO:    { icon: 'barbell-outline',   bg: '#CCFBF1', color: '#0F766E', label: 'Ejercicio' },
  MEDICAMENTO:  { icon: 'medkit-outline',    bg: '#FFF0E8', color: '#C2410C', label: 'Medicamento' },
  TERAPIA:      { icon: 'pulse-outline',     bg: '#EEF2FF', color: '#4338CA', label: 'Terapia' },
  PERSONALIZADA:{ icon: 'star-outline',      bg: '#EEF2FF', color: '#4338CA', label: 'Personalizada' },
};

const FILTROS_TIPO: { label: string; value: TipoActividad | 'TODOS' }[] = [
  { label: 'Todos', value: 'TODOS' },
  { label: 'Ejercicio', value: 'EJERCICIO' },
  { label: 'Medicamento', value: 'MEDICAMENTO' },
  { label: 'Terapia', value: 'TERAPIA' },
  { label: 'Personalizada', value: 'PERSONALIZADA' },
];

const FILTROS_ESTADO: { label: string; value: 'TODAS' | 'PENDIENTE' | 'COMPLETADA' }[] = [
  { label: 'Todas', value: 'TODAS' },
  { label: 'Pendientes', value: 'PENDIENTE' },
  { label: 'Completadas', value: 'COMPLETADA' },
];

const TIPOS_FORM: { label: string; value: TipoActividad; icon: any; color: string }[] = [
  { label: 'Ejercicio',     value: 'EJERCICIO',     icon: 'barbell-outline', color: '#0F766E' },
  { label: 'Medicamento',   value: 'MEDICAMENTO',   icon: 'medkit-outline',  color: '#C2410C' },
  { label: 'Terapia',       value: 'TERAPIA',       icon: 'pulse-outline',   color: '#4338CA' },
  { label: 'Personalizada', value: 'PERSONALIZADA', icon: 'star-outline',    color: '#4338CA' },
];

const FRECUENCIAS: { label: string; value: FrecuenciaActividad }[] = [
  { label: 'Diaria',           value: 'DIARIA' },
  { label: 'Semanal',          value: 'SEMANAL' },
  { label: 'Mensual',          value: 'MENSUAL' },
  { label: 'Días específicos', value: 'DIAS_ESPECIFICOS' },
];

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

/** Mensaje de error debajo de un campo, con el estilo de la app (en vez de Alert.alert). */
function FieldError({ text }: { text?: string }) {
  if (!text) return null;
  return <HelperText type="error" visible style={styles.fieldError}>{text}</HelperText>;
}

function ActividadCard({ item, onPress }: { item: Actividad; onPress: () => void }) {
  const { label } = TIPO_CONFIG[item.tipoActividad];
  const visual = TIPO_VISUAL[item.tipoActividad];
  const completada = item.estado === 'COMPLETADA';
  const { user } = useAuthStore();
  // El médico de cabecera ve también las actividades que crearon otros.
  const creadaPorOtro = user?.tipoUsuario === 'PROFESIONAL' && item.creadoPorUserId !== user.id;
  const persona = `${item.pcd.usuario.nombre} ${item.pcd.usuario.apellido}`;
  const horario = item.horarioInicio
    ? `${item.horarioInicio.slice(0, 5)}${item.horarioFin ? ` – ${item.horarioFin.slice(0, 5)}` : ''}`
    : null;

  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={`${item.titulo}, ${persona}, ${completada ? 'completada' : 'pendiente'}`}
      style={lst.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={lst.cardTop}>
        <View style={[lst.cardIcono, { backgroundColor: visual.bg }]}>
          <AppIcon name={visual.icon} size={24} color={visual.fg} />
        </View>
        <View style={lst.flex}>
          <Text style={lst.cardTitulo} numberOfLines={2}>{item.titulo}</Text>
          <View style={lst.cardPersona}>
            <AppIcon name="person-outline" size={14} color={DS.colors.textTertiary} />
            <Text style={lst.cardPersonaTexto} numberOfLines={1}>{persona}</Text>
          </View>
          {creadaPorOtro && (
            <Text style={lst.cardPersonaTexto} numberOfLines={1}>
              Creada por {item.creadoPor.nombre} {item.creadoPor.apellido}
            </Text>
          )}
        </View>
        <AppIcon name="chevron-forward" size={20} color={DS.colors.textTertiary} />
      </View>

      <View style={lst.cardPie}>
        <View style={lst.cardChips}>
          <Chip label={completada ? 'Completada' : 'Pendiente'} tone={completada ? 'success' : 'warning'} />
          <Chip label={label} tone="neutral" />
        </View>
        <View style={lst.cardHora}>
          <AppIcon name={horario ? 'time-outline' : 'repeat-outline'} size={14} color={DS.colors.textTertiary} />
          <Text style={lst.cardHoraTexto}>{horario ?? FRECUENCIA_LABEL[item.frecuencia]}</Text>
        </View>
      </View>
    </Tappable>
  );
}

function ActividadesListSkeleton() {
  return (
    <View style={lst.lista}>
      <Skeleton height={112} borderRadius={DS.radius.featured} />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} height={120} borderRadius={DS.radius.card} />
      ))}
    </View>
  );
}

function Resumen({ actividades }: { actividades: Actividad[] }) {
  const completadas = actividades.filter((a) => a.estado === 'COMPLETADA').length;
  const pendientes = actividades.length - completadas;
  const porcentaje = actividades.length > 0 ? (completadas / actividades.length) * 100 : 0;
  return (
    <Card dark featured style={lst.resumen}>
      <OrbitDecor />
      <ProgressRing percent={porcentaje} size={92} stroke={9} />
      <View style={lst.flex}>
        <Text style={lst.resumenTitulo}>Avance general</Text>
        <View style={lst.resumenNumeros}>
          <View>
            <Text style={lst.resumenValor}>{actividades.length}</Text>
            <Text style={lst.resumenLabel}>Total</Text>
          </View>
          <View>
            <Text style={lst.resumenValor}>{pendientes}</Text>
            <Text style={lst.resumenLabel}>Pendientes</Text>
          </View>
          <View>
            <Text style={lst.resumenValor}>{completadas}</Text>
            <Text style={lst.resumenLabel}>Completadas</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

function NuevaActividadForm({ visible, onClose, onSaved }: {
  visible: boolean; onClose: () => void; onSaved: () => void;
}) {
  const { toast, showToast, hideToast } = useToast();
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [discardVisible, setDiscardVisible] = useState(false);

  const [pcds, setPcds] = useState<PcdItem[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [terapias, setTerapias] = useState<Terapia[]>([]);
  const { puedeProgramar } = usePermisosTerapia();

  const [tipo, setTipo] = useState<TipoActividad>('EJERCICIO');
  const [frecuencia, setFrecuencia] = useState<FrecuenciaActividad>('DIARIA');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [horarioInicio, setHorarioInicio] = useState('');
  const [horarioFin, setHorarioFin] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [recordarActivo, setRecordarActivo] = useState(false);
  const [recordarAntesMinutos, setRecordarAntesMinutos] = useState('');
  const [selectedPcd, setSelectedPcd] = useState<PcdItem | null>(null);
  const [pcdSearch, setPcdSearch] = useState('');
  const [pcdOpen, setPcdOpen] = useState(false);
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
  const [errores, setErrores] = useState<ErroresActividad>({});

  useEffect(() => {
    if (!visible) return;
    setErrores({});
    setTipo('EJERCICIO'); setFrecuencia('DIARIA');
    setTitulo(''); setDescripcion(''); setFechaInicio(''); setFechaFin('');
    setHorarioInicio(''); setHorarioFin(''); setObservaciones('');
    setRecordarActivo(false); setRecordarAntesMinutos('');
    setSelectedPcd(null); setPcdSearch(''); setPcdOpen(false); setDiasSeleccionados([]);
    setMedSeleccionado(null); setMedSearch(''); setMedOpen(false);
    setDosis(''); setFrecuenciaMed(''); setIndicacion(''); setMedico('');
    setTerapiaSeleccionada(null); setTerapiaOpen(false);
    setLoadingData(true);
    const esProfesional = user?.tipoUsuario === 'PROFESIONAL';
    const esTutor = user?.tipoUsuario === 'TUTOR';

    // GET /usuarios?tipo=PCD no sirve acá: el backend fuerza tipo=PROFESIONAL
    // para quien no es Admin, así que se resuelve el PCD propio a través de
    // los vínculos ya autorizados (profesional-PCD o tutor-PCD) en vez de esa
    // consulta. No se distingue CABECERA/ESPECIALISTA: el backend acepta
    // cualquier vínculo ACTIVO.
    const pcdsPromise: Promise<PcdItem[]> = esProfesional
      ? vinculosApi.getAll({ profesionalId: user!.id, estado: 'ACTIVO' }).then((vinculos) =>
          vinculos.map((v) => ({
            id: v.pcd.usuario.id,
            nombre: v.pcd.usuario.nombre,
            apellido: v.pcd.usuario.apellido,
          })),
        )
      : esTutor
      ? tutorPcdApi.getAll({ estado: 'ACTIVO' }).then((vinculos) =>
          vinculos.map((v) => ({
            id: v.pcd.usuario.id,
            nombre: v.pcd.usuario.nombre,
            apellido: v.pcd.usuario.apellido,
          })),
        )
      : Promise.resolve([]);

    Promise.all([pcdsPromise, medicamentosApi.getAll(), terapiasApi.getAll()])
      .then(([pList, mList, tList]) => {
        setPcds(pList);
        setMedicamentos(mList);
        setTerapias(tList);
      })
      .catch(() => showToast('No se pudieron cargar los datos del formulario', 'error'))
      .finally(() => setLoadingData(false));
  }, [visible]);

  const toggleDia = (dia: string) => {
    setDiasSeleccionados((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia],
    );
  };

  const isDirty = titulo.trim() || descripcion.trim() || fechaInicio || fechaFin || selectedPcd !== null;

  const handleClose = () => {
    if (isDirty) { setDiscardVisible(true); } else { onClose(); }
  };

  // Si se corrige un campo marcado, se le quita el error.
  const limpiarError = (campo: keyof ErroresActividad) =>
    setErrores((prev) => (prev[campo] ? { ...prev, [campo]: undefined } : prev));

  const cambiarFechaInicio = (f: string) => {
    setFechaInicio(f);
    limpiarError('fechaInicio');
    // La fecha de fin tiene que quedar después de la de inicio.
    if (fechaFin && fechaFin <= f) setFechaFin('');
  };

  const guardar = async () => {
    Keyboard.dismiss();
    const e = validarActividad({
      titulo, descripcion, pcdSeleccionado: selectedPcd !== null, fechaInicio, fechaFin,
      horarioInicio, horarioFin, recordarActivo, recordarAntesMinutos, frecuencia, diasSeleccionados, tipo,
      medicamentoSeleccionado: medSeleccionado !== null, terapiaSeleccionada: terapiaSeleccionada !== null,
    });
    setErrores(e);
    if (Object.keys(e).length > 0 || !selectedPcd) {
      return showToast('Revisá los campos marcados en rojo', 'error');
    }

    setSaving(true);
    try {
      await actividadesApi.create({
        titulo, descripcion, fechaInicio, fechaFin, pcdId: selectedPcd.id,
        tipoActividad: tipo, frecuencia,
        ...(horarioInicio && { horarioInicio }),
        ...(horarioFin && { horarioFin }),
        ...(observaciones && { observaciones }),
        ...(recordarActivo && { recordarAntesMinutos: Number(recordarAntesMinutos) }),
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
      showToast('Actividad creada correctamente', 'success');
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo crear la actividad'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToastClose = () => {
    hideToast();
    if (toast.type === 'success') { onClose(); onSaved(); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} accessibilityRole="header">Nueva actividad</Text>
          <Tappable style={styles.modalClose} centrado accessibilityRole="button" accessibilityLabel="Cerrar y descartar la nueva actividad" onPress={handleClose}>
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

              <Text style={styles.formSectionTitle} accessibilityRole="header">Tipo de actividad</Text>
              <View style={styles.tipoGrid}>
                {TIPOS_FORM.filter((t) => !(user?.tipoUsuario === 'TUTOR' && t.value === 'TERAPIA')).map((t) => (
                  <Tappable
                    accessibilityRole="radio"
                    accessibilityLabel={t.label}
                    selected={tipo === t.value}
                    key={t.value}
                    style={[styles.tipoCard, tipo === t.value && styles.tipoCardActive]}
                    onPress={() => setTipo(t.value)}
                  >
                    <AppIcon name={t.icon} size={20} color={tipo === t.value ? '#FFFFFF' : t.color} />
                    <Text style={[styles.tipoLabel, tipo === t.value && styles.tipoLabelActive]}>{t.label}</Text>
                  </Tappable>
                ))}
              </View>

              <Text style={styles.formSectionTitle} accessibilityRole="header">PCD *</Text>
              <FieldError text={errores.pcd} />
              {selectedPcd ? (
                <View style={styles.pcdChip}>
                  <AppIcon name="person-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.pcdChipText} numberOfLines={1}>
                    {selectedPcd.nombre} {selectedPcd.apellido}
                  </Text>
                  <Tappable centrado accessibilityRole="button" accessibilityLabel="Quitar el paciente elegido" onPress={() => { setSelectedPcd(null); setPcdSearch(''); }}>
                    <AppIcon name="close-circle" size={16} color={COLORS.primary} />
                  </Tappable>
                </View>
              ) : (
                <SearchBar accessibilityLabel="Buscar PCD" placeholder="Buscar PCD..." value={pcdSearch} onChangeText={(t) => { setPcdSearch(t); setPcdOpen(true); }} onFocus={() => setPcdOpen(true)} onBlur={() => setTimeout(() => setPcdOpen(false), 150)} onClear={() => { setPcdSearch(''); setPcdOpen(false); }} />
              )}
              {(() => {
                const { visibles: filtrados, hayMas } = buscar(pcds, pcdSearch, (u) => `${u.nombre} ${u.apellido}`, 0);
                if (!pcdOpen || selectedPcd) return null;
                if (filtrados.length > 0) return (
                  <View style={styles.searchDropdown}>
                    {hayMas && <Text style={styles.searchDropdownEmpty}>Hay más resultados. Escribí más para afinar la búsqueda.</Text>}
                    {filtrados.map((u) => (
                      <Tappable
                        accessibilityRole="button"
                        accessibilityLabel={`${u.nombre} ${u.apellido}`}
                        key={u.id}
                        style={styles.searchDropdownItem}
                        onPress={() => { setSelectedPcd(u); setPcdOpen(false); setPcdSearch(''); limpiarError('pcd'); }}
                      >
                        <AppIcon name="person-circle-outline" size={18} color={COLORS.textMuted} />
                        <Text style={styles.searchDropdownText}>{u.nombre} {u.apellido}</Text>
                      </Tappable>
                    ))}
                  </View>
                );
                if (pcdSearch.length > 0) return (
                  <View style={styles.searchDropdown}>
                    <Text style={styles.searchDropdownEmpty}>Sin resultados</Text>
                  </View>
                );
                return null;
              })()}

              <Text style={styles.formSectionTitle} accessibilityRole="header">Datos de la actividad</Text>
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
              <FormField label="Observaciones" value={observaciones} onChange={setObservaciones} multiline
              />
              <Text style={styles.formSectionTitle} accessibilityRole="header">Frecuencia</Text>
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
                  <Text style={styles.formSectionTitle} accessibilityRole="header">Días de la semana *</Text>
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
                  <Text style={styles.formSectionTitle} accessibilityRole="header">Medicamento *</Text>
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
                      <AppIcon name="search-outline" size={16} color={COLORS.textMuted} />
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
                          <AppIcon name="close" size={16} color={COLORS.textMuted} />
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
                  <FormField label="Dosis (ej: 400mg)" value={dosis} onChange={setDosis} maxLength={100} />
                  <FormField label="Frecuencia (ej: Cada 8 horas)" value={frecuenciaMed} onChange={setFrecuenciaMed} maxLength={100} />
                  <FormField label="Indicación" value={indicacion} onChange={setIndicacion} />
                  <FormField label="Médico prescriptor" value={medico} onChange={setMedico} />
                </>
              )}

              {tipo === 'TERAPIA' && (
                <>
                  <Text style={styles.formSectionTitle} accessibilityRole="header">Terapia *</Text>
                  <FieldError text={errores.terapia} />
                  <Tappable accessibilityRole="button" accessibilityLabel={`Terapia: ${terapiaSeleccionada ? terapiaSeleccionada.tipo : 'sin seleccionar'}`} expanded={terapiaOpen} style={styles.dropdownBtn} onPress={() => setTerapiaOpen((v) => !v)}>
                    <AppIcon name="pulse-outline" size={18} color="#4338CA" />
                    <Text style={[styles.dropdownBtnText, !terapiaSeleccionada && styles.placeholder]}>
                      {terapiaSeleccionada ? terapiaSeleccionada.tipo : 'Seleccionar terapia...'}
                    </Text>
                    <AppIcon name={terapiaOpen ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
                  </Tappable>
                  {terapiaOpen && (
                    <View style={styles.dropdown}>
                      {terapias.filter((t) => puedeProgramar(t, selectedPcd?.id)).map((t) => (
                        <Tappable
                          accessibilityRole="radio"
                          accessibilityLabel={t.tipo}
                          selected={terapiaSeleccionada?.id === t.id}
                          key={t.id}
                          style={[styles.dropdownItem, terapiaSeleccionada?.id === t.id && styles.dropdownItemActive]}
                          onPress={() => { setTerapiaSeleccionada(t); setTerapiaOpen(false); limpiarError('terapia'); }}
                        >
                          <Text style={styles.dropdownItemText}>{t.tipo}</Text>
                          {terapiaSeleccionada?.id === t.id && <AppIcon name="checkmark" size={16} color={COLORS.primary} />}
                        </Tappable>
                      ))}
                    </View>
                  )}
                </>
              )}

              <Tappable
                accessibilityRole="button"
                accessibilityLabel={saving ? 'Guardando' : 'Crear actividad'}
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={guardar} disabled={saving || (toast.visible && toast.type === 'success')}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Crear actividad'}</Text>
              </Tappable>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
        <Toast {...toast} onClose={handleToastClose} />
      </View>

      <ConfirmDialog
        visible={discardVisible}
        variant="warning"
        title="¿Descartar cambios?"
        message="Si cerrás ahora, los datos ingresados se perderán."
        cancelLabel="Seguir cargando"
        confirmLabel="Descartar"
        onCancel={() => setDiscardVisible(false)}
        onConfirm={() => { setDiscardVisible(false); onClose(); }}
      />
    </Modal>
  );
}

export default function ActividadesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{ pcdId?: string; pcdNombre?: string; pcdApellido?: string }>();
  const [filtroTipo, setFiltroTipo] = useState<TipoActividad | 'TODOS'>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<'TODAS' | 'PENDIENTE' | 'COMPLETADA'>('TODAS');
  const [orden, setOrden] = useState<'creacion' | 'horario'>('creacion');
  const [modalVisible, setModalVisible] = useState(false);

  const [pcdList, setPcdList] = useState<PcdItem[]>([]);
  const [selectedPcd, setSelectedPcd] = useState<PcdItem | null>(
    params.pcdId && params.pcdNombre && params.pcdApellido
      ? { id: Number(params.pcdId), nombre: params.pcdNombre, apellido: params.pcdApellido }
      : null
  );
  const [pcdSearch, setPcdSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const cargarLoader = useCallback(() => {
    const pcdId = user?.tipoUsuario === 'PCD' ? user.id : selectedPcd?.id;
    return actividadesApi.getAll(pcdId, {
      ...(filtroEstado !== 'TODAS' && { estado: filtroEstado }),
      orden,
    });
  }, [user, selectedPcd, filtroEstado, orden]);
  const { data: actividadesData, loading, error, reload, refrescarSilencioso } =
    useAsyncData<Actividad[]>(cargarLoader);
  useRecargarAlEnfocar(refrescarSilencioso);
  const actividades = actividadesData ?? [];

  const showPcdFilter = user?.tipoUsuario !== 'PCD';
  const canCreate = user?.tipoUsuario === 'PROFESIONAL' || user?.tipoUsuario === 'TUTOR';

  useEffect(() => {
    if (!showPcdFilter) return;
    const esAdmin = user?.tipoUsuario === 'ADMINISTRADOR' || (user as any)?.esAdministrador;
    if (esAdmin) {
      usuariosApi.getAll('PCD')
        .then((list) => setPcdList(list.map((u) => ({ id: u.id, nombre: u.nombre, apellido: u.apellido }))))
        .catch(() => {});
    } else if (user?.tipoUsuario === 'PROFESIONAL') {
      vinculosApi.getAll({ estado: 'ACTIVO' })
        .then((list) => setPcdList(list.map((v) => ({ id: v.pcd.usuario.id, nombre: v.pcd.usuario.nombre, apellido: v.pcd.usuario.apellido }))))
        .catch(() => {});
    } else if (user?.tipoUsuario === 'TUTOR') {
      tutorPcdApi.getAll({ estado: 'ACTIVO' })
        .then((list) => setPcdList(list.map((v) => ({ id: v.pcd.usuario.id, nombre: v.pcd.usuario.nombre, apellido: v.pcd.usuario.apellido }))))
        .catch(() => {});
    }
  }, [user, showPcdFilter]);

  const filtradas = filtroTipo === 'TODOS'
    ? actividades
    : actividades.filter((a) => a.tipoActividad === filtroTipo);

  // Cuántas hay de cada tipo en lo que ya se cargó (con el estado y la persona elegidos).
  const conteoPorTipo = (tipo: TipoActividad | 'TODOS') =>
    tipo === 'TODOS' ? actividades.length : actividades.filter((a) => a.tipoActividad === tipo).length;

  const pcdFiltrados = pcdSearch
    ? pcdList.filter((p) =>
        `${p.nombre} ${p.apellido}`.toLowerCase().includes(pcdSearch.toLowerCase())
      )
    : pcdList;

  const hayFiltros = filtroTipo !== 'TODOS' || filtroEstado !== 'TODAS' || selectedPcd !== null;
  const limpiarFiltros = () => {
    setFiltroTipo('TODOS'); setFiltroEstado('TODAS'); setSelectedPcd(null); setPcdSearch(''); setSearchOpen(false);
  };
  const alternarOrden = () => setOrden((o) => (o === 'creacion' ? 'horario' : 'creacion'));

  const subtitulo = loading
    ? undefined
    : `${filtradas.length} ${filtradas.length === 1 ? 'actividad' : 'actividades'}${hayFiltros ? ' · filtrado' : ''}`;

  return (
    <View style={lst.container}>
      <StatusBar style="dark" />
      <ScreenHeader
        titulo="Actividades"
        subtitulo={subtitulo}
        onVolver={() => volver(router, '/(app)')}
        volverLabel="Volver al inicio"
      />

      {/* Estado: control segmentado */}
      <View style={lst.segmentadoWrap}>
        <View style={lst.segmentado} accessibilityRole="radiogroup" accessibilityLabel="Filtrar por estado">
          {FILTROS_ESTADO.map((f) => {
            const activo = filtroEstado === f.value;
            return (
              <Tappable
                centrado
                key={f.value}
                style={[lst.segmento, activo && lst.segmentoActivo]}
                onPress={() => setFiltroEstado(f.value)}
                accessibilityRole="radio"
                accessibilityLabel={`Mostrar actividades: ${f.label}`}
                selected={activo}
              >
                <Text style={[lst.segmentoTexto, activo && lst.segmentoTextoActivo]}>{f.label}</Text>
              </Tappable>
            );
          })}
        </View>
      </View>

      {/* Tipo: chips con ícono y cantidad */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={lst.chipsScroll} contentContainerStyle={lst.chips}
        accessibilityLabel="Filtrar por tipo de actividad"
      >
        {FILTROS_TIPO.map((f) => {
          const activo = filtroTipo === f.value;
          const visual = f.value === 'TODOS' ? null : TIPO_VISUAL[f.value];
          const cantidad = conteoPorTipo(f.value);
          return (
            <Tappable
              centrado
              key={f.value}
              hitSlop={HIT_CHIP}
              style={[lst.chip, activo && lst.chipActivo]}
              onPress={() => setFiltroTipo(f.value)}
              accessibilityRole="radio"
              accessibilityLabel={`${f.label}, ${cantidad}`}
              selected={activo}
            >
              {visual && <AppIcon name={visual.icon} size={16} color={activo ? DS.colors.onPrimary : visual.fg} />}
              <Text style={[lst.chipTexto, activo && lst.chipTextoActivo]}>{f.label}</Text>
              {!loading && (
                <View style={[lst.chipContador, activo && lst.chipContadorActivo]}>
                  <Text style={[lst.chipContadorTexto, activo && lst.chipTextoActivo]}>{cantidad}</Text>
                </View>
              )}
            </Tappable>
          );
        })}
      </ScrollView>

      {/* Persona + orden */}
      <View style={lst.herramientas}>
        {showPcdFilter && (
          <View style={lst.herramientaPersona}>
            {selectedPcd ? (
              <View style={lst.pcdChip}>
                <AppIcon name="person-outline" size={16} color={DS.colors.accent} />
                <Text style={lst.pcdChipTexto} numberOfLines={1}>{selectedPcd.nombre} {selectedPcd.apellido}</Text>
                <Tappable centrado accessibilityRole="button" accessibilityLabel="Quitar el filtro de paciente" onPress={() => { setSelectedPcd(null); setPcdSearch(''); }}>
                  <AppIcon name="close-circle" size={20} color={DS.colors.accent} />
                </Tappable>
              </View>
            ) : (
              <SearchBar accessibilityLabel="Buscar por PCD" placeholder="Buscar por PCD..." value={pcdSearch} onChangeText={(t) => { setPcdSearch(t); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} onBlur={() => setTimeout(() => setSearchOpen(false), 150)} onClear={() => { setPcdSearch(''); setSearchOpen(false); }} />
            )}
          </View>
        )}
        <Tappable
          centrado
          style={lst.orden}
          onPress={alternarOrden}
          accessibilityRole="button"
          accessibilityLabel={`Ordenar: ${orden === 'creacion' ? 'más recientes' : 'por horario'}. Tocá para cambiar`}
        >
          <AppIcon name={orden === 'creacion' ? 'swap-vertical-outline' : 'time-outline'} size={18} color={DS.colors.text} />
          <Text style={lst.ordenTexto}>{orden === 'creacion' ? 'Recientes' : 'Horario'}</Text>
        </Tappable>
      </View>

      {showPcdFilter && searchOpen && !selectedPcd && pcdFiltrados.length > 0 && (
        <View style={lst.dropdownWrap}>
          <View style={lst.dropdown}>
            {pcdFiltrados.map((p) => (
              <Tappable
                accessibilityRole="button"
                accessibilityLabel={`${p.nombre} ${p.apellido}`}
                key={p.id}
                style={lst.dropdownItem}
                onPress={() => { setSelectedPcd(p); setPcdSearch(''); setSearchOpen(false); }}
              >
                <AppIcon name="person-circle-outline" size={22} color={DS.colors.textTertiary} />
                <Text style={lst.dropdownTexto}>{p.nombre} {p.apellido}</Text>
              </Tappable>
            ))}
          </View>
        </View>
      )}
      {showPcdFilter && searchOpen && !selectedPcd && pcdSearch.length > 0 && pcdFiltrados.length === 0 && (
        <View style={lst.dropdownWrap}>
          <View style={lst.dropdown}><Text style={lst.dropdownVacio}>Sin resultados</Text></View>
        </View>
      )}

      {hayFiltros && (
        <Tappable
          accessibilityRole="button"
          accessibilityLabel="Limpiar todos los filtros"
          onPress={limpiarFiltros}
          style={lst.limpiar}
        >
          <AppIcon name="close-circle-outline" size={18} color={DS.colors.accent} />
          <Text style={lst.limpiarTexto}>Limpiar filtros</Text>
        </Tappable>
      )}

      {loading ? (
        <ActividadesListSkeleton />
      ) : error ? (
        <View style={lst.center}>
          <View style={lst.vacioIcono}><AppIcon name="alert-circle-outline" size={32} color={DS.colors.textTertiary} /></View>
          <Text style={lst.vacioTexto}>{error}</Text>
          <Button label="Reintentar" variant="secondary" height={48} onPress={reload} accessibilityLabel="Reintentar cargar las actividades" />
        </View>
      ) : filtradas.length === 0 ? (
        <View style={lst.center}>
          <View style={lst.vacioIcono}><AppIcon name="clipboard-outline" size={32} color={DS.colors.textTertiary} /></View>
          <Text style={lst.vacioTitulo}>{hayFiltros ? 'Nada con esos filtros' : 'Sin actividades'}</Text>
          <Text style={lst.vacioTexto}>
            {hayFiltros
              ? 'Probá con otro estado o tipo, o quitá los filtros.'
              : canCreate ? 'Tocá el botón + para crear la primera.' : 'Todavía no hay actividades para mostrar.'}
          </Text>
          {hayFiltros && <Button label="Limpiar filtros" variant="secondary" height={48} onPress={limpiarFiltros} />}
        </View>
      ) : (
        <FlatList
          data={filtradas}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={lst.lista}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={filtroEstado === 'TODAS' && filtroTipo === 'TODOS' ? <Resumen actividades={actividades} /> : null}
          renderItem={({ item, index }) => (
            <Entrar delay={Math.min(index, 8) * 40}>
              <ActividadCard
                item={item}
                onPress={() => router.push(`/(app)/actividades/${item.id}` as any)}
              />
            </Entrar>
          )}
        />
      )}

      {canCreate && (
        <Tappable
          centrado
          style={lst.nuevo}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Nueva actividad"
        >
          <AppIcon name="add" size={30} color={DS.colors.onPrimary} />
        </Tappable>
      )}

      <NuevaActividadForm
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={() => { void reload(); }}
      />
    </View>
  );
}

const HIT_CHIP = { top: 4, bottom: 4, left: 4, right: 4 };

/** Estilos de la lista de actividades (el formulario de nueva actividad usa `styles`). */
const lst = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: DS.colors.background },

  segmentadoWrap: { paddingHorizontal: DS.space.screen, paddingTop: 8 },
  segmentado: {
    flexDirection: 'row', padding: 4, gap: 4, borderRadius: DS.radius.control,
    backgroundColor: '#EEF2F6', borderWidth: DS.border, borderColor: DS.colors.border,
  },
  segmento: { flex: 1, minHeight: 44, borderRadius: DS.radius.control - 4 },
  segmentoActivo: { backgroundColor: DS.colors.surface },
  segmentoTexto: { fontFamily: DS.font.semibold, fontSize: 14, color: DS.colors.textSecondary },
  segmentoTextoActivo: { color: DS.colors.text, fontFamily: DS.font.bold },

  chipsScroll: { flexGrow: 0, flexShrink: 0 },
  chips: { paddingHorizontal: DS.space.screen, paddingVertical: 12, gap: 8, alignItems: 'center' },
  chip: {
    flexDirection: 'row', gap: 6, paddingHorizontal: 14, minHeight: 40, minWidth: 0, borderRadius: DS.radius.chip,
    backgroundColor: DS.colors.surface, borderWidth: DS.border, borderColor: DS.colors.border,
  },
  chipActivo: { backgroundColor: DS.colors.primary, borderColor: DS.colors.primary },
  chipTexto: { fontFamily: DS.font.semibold, fontSize: 14, color: DS.colors.textSecondary },
  chipTextoActivo: { color: DS.colors.onPrimary },
  chipContador: { minWidth: 22, paddingHorizontal: 6, height: 22, borderRadius: 11, backgroundColor: DS.colors.background, alignItems: 'center', justifyContent: 'center' },
  chipContadorActivo: { backgroundColor: 'rgba(255,255,255,0.2)' },
  chipContadorTexto: { fontFamily: DS.font.bold, fontSize: 12, color: DS.colors.textSecondary },

  herramientas: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: DS.space.screen, zIndex: 10 },
  herramientaPersona: { flex: 1 },
  pcdChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', maxWidth: '100%',
    backgroundColor: DS.colors.accentSoft, borderRadius: DS.radius.chip, paddingLeft: 14, paddingRight: 6,
    minHeight: 48, borderWidth: DS.border, borderColor: '#C7D2FE',
  },
  pcdChipTexto: { flexShrink: 1, fontFamily: DS.font.semibold, fontSize: 14, color: DS.colors.accent },
  orden: {
    flexDirection: 'row', gap: 6, minHeight: 48, paddingHorizontal: 14, borderRadius: DS.radius.control,
    backgroundColor: DS.colors.surface, borderWidth: DS.border, borderColor: DS.colors.border,
  },
  ordenTexto: { fontFamily: DS.font.semibold, fontSize: 14, color: DS.colors.text },
  dropdownWrap: { paddingHorizontal: DS.space.screen, zIndex: 20 },
  dropdown: {
    backgroundColor: DS.colors.surface, borderRadius: DS.radius.card, borderWidth: DS.border,
    borderColor: DS.colors.border, marginTop: 6, overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
    borderBottomWidth: DS.border, borderBottomColor: DS.colors.border,
  },
  dropdownTexto: { fontFamily: DS.font.semibold, fontSize: 15, color: DS.colors.text },
  dropdownVacio: { fontFamily: DS.font.regular, fontSize: 13, color: DS.colors.textTertiary, padding: 14, textAlign: 'center' },
  limpiar: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginLeft: DS.space.screen - 4, paddingHorizontal: 4 },
  limpiarTexto: { fontFamily: DS.font.semibold, fontSize: 14, color: DS.colors.accent },

  lista: { paddingHorizontal: DS.space.screen, paddingTop: 12, paddingBottom: 120, gap: 12 },

  nuevo: {
    position: 'absolute', right: DS.space.screen, bottom: 24, width: 58, height: 58,
    borderRadius: DS.radius.fab, backgroundColor: DS.colors.primary,
  },

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
  cardPersona: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  cardPersonaTexto: { flexShrink: 1, fontFamily: DS.font.medium, fontSize: 13, color: DS.colors.textTertiary },
  cardPie: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    paddingTop: 12, borderTopWidth: DS.border, borderTopColor: DS.colors.border,
  },
  cardChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flexShrink: 1 },
  cardHora: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardHoraTexto: { fontFamily: DS.font.medium, fontSize: 13, color: DS.colors.textTertiary },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  vacioIcono: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: DS.colors.surface,
    borderWidth: DS.border, borderColor: DS.colors.border, alignItems: 'center', justifyContent: 'center',
  },
  vacioTitulo: { fontFamily: DS.font.bold, fontSize: 18, color: DS.colors.text },
  vacioTexto: { fontFamily: DS.font.regular, fontSize: 14, lineHeight: 20, color: DS.colors.textSecondary, textAlign: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  filtros: { paddingTop: SIZES.md, paddingBottom: SIZES.md, gap: SIZES.xs },
  filtrosScroll: { flexGrow: 0, flexShrink: 0 },
  filtrosFila: { paddingHorizontal: SIZES.lg, gap: SIZES.sm, alignItems: 'center' },
  // 40 dp visibles + 4 dp de hitSlop arriba y abajo = área táctil de 48 dp sin ocupar alto de más.
  filtroChip: {
    minHeight: 40, minWidth: 0, paddingHorizontal: 14, borderRadius: 999,
    backgroundColor: '#FFFFFF', borderWidth: DS.border, borderColor: DS.colors.border,
  },
  ordenSeparador: { width: 1, height: 24, backgroundColor: '#DDE8FF' },
  filtroChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filtroText: { ...FONTS.caption, color: COLORS.primary, fontWeight: '600' },
  filtroTextActive: { color: '#FFFFFF' },
  listContent: { padding: SIZES.lg, gap: SIZES.sm, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.md,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: SIZES.md,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { ...FONTS.bodyBold, color: '#0F172A', fontWeight: '700', marginBottom: 2 },
  cardPcd: { ...FONTS.caption, color: COLORS.textMuted, marginBottom: SIZES.xs },
  cardMeta: { flexDirection: 'row', gap: SIZES.xs },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { ...FONTS.small, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SIZES.sm },
  emptyText: { ...FONTS.body, color: COLORS.textMuted },
  retryBtn: {
    paddingHorizontal: SIZES.lg, paddingVertical: SIZES.sm,
    backgroundColor: COLORS.primary, borderRadius: DS.radius.control,
  },
  retryText: { ...FONTS.caption, color: '#FFFFFF', fontWeight: '700' },
  fab: { position: 'absolute', right: SIZES.lg, bottom: SIZES.lg, backgroundColor: COLORS.primary },
  searchSection: { paddingHorizontal: SIZES.lg, paddingBottom: SIZES.sm, zIndex: 10 },
  searchInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.xs,
    backgroundColor: '#FFFFFF', borderRadius: DS.radius.control, paddingHorizontal: SIZES.md, paddingVertical: 10,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  searchInput: { flex: 1, ...FONTS.body, color: '#0F172A', padding: 0 },
  pcdChip: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.xs,
    backgroundColor: '#EEF2FF', borderRadius: DS.radius.control, paddingHorizontal: SIZES.md, paddingVertical: 10,
    borderWidth: DS.border, borderColor: DS.colors.border, alignSelf: 'flex-start' as const,
  },
  pcdChipText: { ...FONTS.caption, color: COLORS.primary, fontWeight: '700' as const, maxWidth: 220 },
  searchDropdown: {
    backgroundColor: '#FFFFFF', borderRadius: DS.radius.control, borderWidth: DS.border, borderColor: DS.colors.border,
    marginTop: 4, overflow: 'hidden',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 5,
  },
  searchDropdownItem: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    padding: SIZES.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  searchDropdownText: { ...FONTS.body, color: '#0F172A', fontWeight: '600' as const },
  searchDropdownEmpty: { ...FONTS.caption, color: COLORS.textMuted, padding: SIZES.md, textAlign: 'center' as const },
  
  modal: { flex: 1, padding: SIZES.lg, backgroundColor: '#F8FAFC' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.lg },
  modalTitle: { fontFamily: DS.font.bold, fontSize: 24, color: DS.colors.text },
  modalClose: { width: 46, height: 46, borderRadius: 23, backgroundColor: DS.colors.surface, borderWidth: DS.border, borderColor: DS.colors.border, alignItems: 'center', justifyContent: 'center' },
  modalContent: { paddingBottom: SIZES.xl },
  formSectionTitle: { fontFamily: DS.font.bold, fontSize: 17, color: DS.colors.text, marginTop: DS.space.section, marginBottom: 10 },
  tipoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm },
  tipoCard: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.xs,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: DS.radius.control,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  tipoCardActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tipoLabel: { ...FONTS.caption, color: '#475569', fontWeight: '600' },
  tipoLabelActive: { color: '#FFFFFF' },
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
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SIZES.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: { backgroundColor: '#EEF2FF' },
  dropdownItemText: { ...FONTS.body, color: '#0F172A', fontWeight: '600' },
  dropdownItemSub: { ...FONTS.small, color: COLORS.textMuted, marginTop: 1 },
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
  fieldError: { marginTop: -4, marginBottom: 4, paddingHorizontal: 4 },
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
