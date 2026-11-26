import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Switch } from 'react-native-paper';
import { AvatarRing, Button, FormError as HelperText, FormTextInput as TextInput, ScreenHeader } from '@/components/ds';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DatePickerField } from '@/components/DatePickerField';
import { PasswordInput } from '@/components/PasswordInput';
import { SelectField } from '@/components/SelectField';
import { Toast, useToast } from '@/components/Toast';
import { usuariosApi } from '@/api/usuarios';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { useEspecialidades } from '@/hooks/useEspecialidades';
import { useAsyncData, useRecargarAlEnfocar } from '@/hooks/useAsyncData';
import { TipoUsuario } from '@/types/auth.types';
import { CreateUsuarioDto, UsuarioListItem } from '@/types/usuario.types';
import { hoyLocal } from '@/utils/date';
import { getErrorMessage } from '@/utils/http-error';
import { DNI_RE, EMAIL_RE, TELEFONO_RE } from '@/utils/validation';
import { AppIcon, AppTextInput, Tappable } from '@/components/a11y';
import { SearchBar } from '@/components/SearchBar';
import { DS } from '@/constants/tokens';
import { volver } from '@/utils/navegacion';

const FILTROS: { label: string; value: TipoUsuario | 'TODOS' }[] = [
  { label: 'Todos', value: 'TODOS' },
  { label: 'Profesional', value: 'PROFESIONAL' },
  { label: 'Tutor', value: 'TUTOR' },
  { label: 'PCD', value: 'PCD' },
  { label: 'Admin', value: 'ADMINISTRADOR' },
];

const TIPOS_USUARIO: { label: string; value: TipoUsuario }[] = [
  { label: 'Profesional', value: 'PROFESIONAL' },
  { label: 'Tutor', value: 'TUTOR' },
  { label: 'PCD', value: 'PCD' },
  { label: 'Administrador', value: 'ADMINISTRADOR' },
];

const TIPO_COLORS: Record<TipoUsuario, { bg: string; text: string }> = {
  ADMINISTRADOR: { bg: '#FEF3C7', text: '#B45309' },
  PROFESIONAL:   { bg: '#EEF2FF', text: '#4338CA' },
  TUTOR:         { bg: '#FCE7F3', text: '#BE185D' },
  PCD:           { bg: '#CCFBF1', text: '#0F766E' },
};

const TIPO_LABEL: Record<TipoUsuario, string> = {
  ADMINISTRADOR: 'Administrador',
  PROFESIONAL: 'Profesional',
  TUTOR: 'Tutor',
  PCD: 'PCD',
};

function FormField({ label, value, onChange, ...rest }: {
  label: string; value: string; onChange: (v: string) => void;
  secureTextEntry?: boolean; keyboardType?: any; multiline?: boolean; maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <TextInput accessibilityLabel={label}
      label={label}
      value={value}
      onChangeText={onChange}
      mode="outlined"
      style={styles.input}
      outlineStyle={styles.inputOutline}
      {...rest}
    />
  );
}

function FormSection({ title }: { title: string }) {
  return <Text style={styles.formSectionTitle} accessibilityRole="header">{title}</Text>;
}

function UsuarioCard({ item, onPress }: { item: UsuarioListItem; onPress: () => void }) {
  const { bg, text } = TIPO_COLORS[item.tipoUsuario];
  const activo = item.estado === 'ACTIVO';

  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={`${item.nombre} ${item.apellido}, ${item.email}, ${activo ? 'activo' : 'inactivo'}`}
      style={ls.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <AvatarRing initials={`${item.nombre[0]}${item.apellido[0]}`.toUpperCase()} size={52} />
      <View style={ls.flex}>
        <Text style={ls.nombre} numberOfLines={1}>{item.nombre} {item.apellido}</Text>
        <Text style={ls.email} numberOfLines={1}>{item.email}</Text>
        <View style={ls.chips}>
          <View style={[ls.chip, { backgroundColor: bg }]}>
            <Text style={[ls.chipTexto, { color: text }]}>{TIPO_LABEL[item.tipoUsuario]}</Text>
          </View>
          {item.esAdministrador && item.tipoUsuario !== 'ADMINISTRADOR' && (
            <View style={[ls.chip, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[ls.chipTexto, { color: '#B45309' }]}>Admin</Text>
            </View>
          )}
          <View style={[ls.chip, { backgroundColor: activo ? '#CCFBF1' : '#F1F5F9' }]}>
            <Text style={[ls.chipTexto, { color: activo ? '#0F766E' : '#475569' }]}>{activo ? 'Activo' : 'Inactivo'}</Text>
          </View>
        </View>
      </View>
      <AppIcon name="chevron-forward" size={20} color={DS.colors.textTertiary} />
    </Tappable>
  );
}

function NuevoUsuarioForm({ visible, onClose, onSaved }: {
  visible: boolean; onClose: () => void; onSaved: () => void;
}) {
  const { toast, showToast, hideToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState<TipoUsuario>('PROFESIONAL');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [matricula, setMatricula] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const { nombres: especialidades, idDe: especialidadIdDe } = useEspecialidades(visible);
  const [establecimiento, setEstablecimiento] = useState('');
  const [esAdmin, setEsAdmin] = useState(false);
  const [tipoDiscapacidad, setTipoDiscapacidad] = useState('');
  const [grado, setGrado] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) return;
    setTipo('PROFESIONAL');
    setNombre(''); setApellido(''); setDni(''); setEmail('');
    setPassword(''); setFechaNacimiento(''); setTelefono(''); setDireccion('');
    setMatricula(''); setEspecialidad(''); setEstablecimiento(''); setEsAdmin(false);
    setTipoDiscapacidad(''); setGrado(''); setDiagnostico('');
    setErrors({});
  }, [visible]);

  const validar = (): boolean => {
    const e: Record<string, string> = {};
    if (nombre.trim().length < 2) e.nombre = 'Mínimo 2 caracteres';
    if (apellido.trim().length < 2) e.apellido = 'Mínimo 2 caracteres';
    if (!DNI_RE.test(dni.trim())) e.dni = 'Ingresá 7 u 8 dígitos, sin puntos';
    if (!EMAIL_RE.test(email.trim())) e.email = 'Email inválido';
    if (telefono.trim() && !TELEFONO_RE.test(telefono.trim())) e.telefono = 'Solo números, espacios, +, - y paréntesis (6 a 20)';
    if (!password.trim() || password.length < 6) e.password = 'Mínimo 6 caracteres';
    if (!fechaNacimiento) e.fechaNacimiento = 'Requerido';
    if (tipo === 'PROFESIONAL') {
      if (!matricula.trim()) e.matricula = 'Requerido';
      if (!especialidad.trim()) e.especialidad = 'Requerido';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    // Se cierra el teclado para que no tape los errores ni el aviso de éxito.
    Keyboard.dismiss();
    if (!validar()) return;
    setLoading(true);
    try {
      const dto: CreateUsuarioDto = {
        nombre, apellido, dni, email, password,
        fechaNacimiento, tipoUsuario: tipo,
        ...(telefono && { telefono }),
        ...(direccion && { direccion }),
        ...(tipo === 'PROFESIONAL' && {
          matricula, especialidadId: especialidadIdDe(especialidad),
          ...(establecimiento && { establecimiento }),
          esAdministrador: esAdmin,
        }),
        ...(tipo === 'PCD' && {
          ...(tipoDiscapacidad && { tipoDiscapacidad }),
          ...(grado && { grado }),
          ...(diagnostico && { diagnostico }),
        }),
      };
      await usuariosApi.create(dto);
      showToast('Usuario creado correctamente', 'success');
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo crear el usuario'), 'error');
    } finally {
      setLoading(false);
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
          <Text style={styles.modalTitle} accessibilityRole="header">Nuevo usuario</Text>
          <Tappable style={styles.modalClose} centrado accessibilityRole="button" accessibilityLabel="Cerrar el formulario" onPress={onClose}>
            <AppIcon name="close" size={24} color="#475569" />
          </Tappable>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">

            <FormSection title="TIPO DE USUARIO" />
            <View style={styles.tipoRow}>
              {TIPOS_USUARIO.map((t) => (
                <Tappable
                  centrado
                  accessibilityRole="radio"
                  accessibilityLabel={t.label}
                  selected={tipo === t.value}
                  key={t.value}
                  style={[styles.tipoChip, tipo === t.value && styles.tipoChipActive]}
                  onPress={() => { setTipo(t.value); setErrors({}); }}
                >
                  <Text style={[styles.tipoText, tipo === t.value && styles.tipoTextActive]}>{t.label}</Text>
                </Tappable>
              ))}
            </View>

            <FormSection title="DATOS PERSONALES" />
            <FormField label="Nombre *" value={nombre} onChange={setNombre} maxLength={100} />
            {errors.nombre ? <HelperText type="error">{errors.nombre}</HelperText> : null}
            <FormField label="Apellido *" value={apellido} onChange={setApellido} maxLength={100} />
            {errors.apellido ? <HelperText type="error">{errors.apellido}</HelperText> : null}
            <FormField label="DNI * (sin puntos)" value={dni} onChange={(v) => setDni(v.replace(/\D/g, ''))} keyboardType="numeric" maxLength={8} />
            {errors.dni ? <HelperText type="error">{errors.dni}</HelperText> : null}
            <FormField label="Email *" value={email} onChange={setEmail} keyboardType="email-address" autoCapitalize="none" maxLength={255} />
            {errors.email ? <HelperText type="error">{errors.email}</HelperText> : null}
            <PasswordInput label="Contraseña * (mín. 6 caracteres)" value={password} onChange={setPassword} style={styles.input} outlineStyle={styles.inputOutline} />
            {errors.password ? <HelperText type="error">{errors.password}</HelperText> : null}
            <DatePickerField label="Fecha de nacimiento *" value={fechaNacimiento} onChange={setFechaNacimiento} maxDate={hoyLocal()} seleccionAnio />
            {errors.fechaNacimiento ? <HelperText type="error">{errors.fechaNacimiento}</HelperText> : null}
            <FormField label="Teléfono" value={telefono} onChange={setTelefono} keyboardType="phone-pad" maxLength={20} />
            {errors.telefono ? <HelperText type="error">{errors.telefono}</HelperText> : null}
            <FormField label="Dirección" value={direccion} onChange={setDireccion} maxLength={255} />

            {tipo === 'PROFESIONAL' && (
              <>
                <FormSection title="DATOS PROFESIONALES" />
                <FormField label="Matrícula *" value={matricula} onChange={setMatricula} maxLength={30} />
                {errors.matricula ? <HelperText type="error">{errors.matricula}</HelperText> : null}
                <SelectField label="Especialidad *" value={especialidad} options={especialidades} onSelect={setEspecialidad} />
                {errors.especialidad ? <HelperText type="error">{errors.especialidad}</HelperText> : null}
                <FormField label="Establecimiento" value={establecimiento} onChange={setEstablecimiento} maxLength={100} />
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Permisos de administrador</Text>
                  <Switch value={esAdmin} onValueChange={setEsAdmin} color={COLORS.primary} />
                </View>
              </>
            )}

            {tipo === 'PCD' && (
              <>
                <FormSection title="DATOS DEL PCD" />
                <FormField label="Tipo de discapacidad" value={tipoDiscapacidad} onChange={setTipoDiscapacidad} maxLength={255} />
                <FormField label="Grado (ej: Leve, Moderado, Severo)" value={grado} onChange={setGrado} maxLength={10} />
                <FormField label="Diagnóstico" value={diagnostico} onChange={setDiagnostico} multiline />
              </>
            )}

            <Tappable
              accessibilityRole="button"
              accessibilityLabel={loading ? 'Guardando' : 'Crear usuario'}
              style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
              onPress={guardar}
              disabled={loading || (toast.visible && toast.type === 'success')}
            >
              <Text style={styles.saveBtnText}>{loading ? 'Guardando...' : 'Crear usuario'}</Text>
            </Tappable>
          </ScrollView>
        </KeyboardAvoidingView>
        <Toast {...toast} onClose={handleToastClose} />
      </View>
    </Modal>
  );
}

export default function UsuariosScreen() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<TipoUsuario | 'TODOS'>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const cargarLoader = useCallback(
    () => usuariosApi.getAll(filtro === 'TODOS' ? undefined : filtro),
    [filtro],
  );
  const { data: usuariosData, loading, error, reload, refrescarSilencioso } = useAsyncData<UsuarioListItem[]>(cargarLoader);
  useRecargarAlEnfocar(refrescarSilencioso);
  const usuarios = usuariosData ?? [];

  const usuariosFiltrados = busqueda.trim()
    ? usuarios.filter((u) => {
        const q = busqueda.toLowerCase();
        return (
          u.nombre.toLowerCase().includes(q) ||
          u.apellido.toLowerCase().includes(q) ||
          `${u.nombre} ${u.apellido}`.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.dni.includes(q)
        );
      })
    : usuarios;

  return (
    <View style={ls.container}>
      <StatusBar style="dark" />
      <ScreenHeader
        titulo="Usuarios"
        subtitulo={loading ? undefined : `${usuariosFiltrados.length} ${usuariosFiltrados.length === 1 ? 'usuario' : 'usuarios'}`}
        onVolver={() => volver(router, '/(app)')}
        volverLabel="Volver al inicio"
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

      <View style={ls.busqueda}>
        <SearchBar accessibilityLabel="Buscar por nombre, email o DNI" placeholder="Buscar por nombre, email o DNI..." value={busqueda} onChangeText={setBusqueda} onClear={() => setBusqueda('')} />
      </View>

      {loading ? (
        <View style={ls.center}>
          <ActivityIndicator accessibilityLabel="Cargando" size="large" color={DS.colors.primary} />
        </View>
      ) : error ? (
        <View style={ls.center}>
          <View style={ls.vacioIcono}><AppIcon name="alert-circle-outline" size={32} color={DS.colors.textTertiary} /></View>
          <Text style={ls.vacioTexto}>{error}</Text>
          <Button label="Reintentar" variant="secondary" height={48} onPress={reload} accessibilityLabel="Reintentar cargar los usuarios" />
        </View>
      ) : usuariosFiltrados.length === 0 ? (
        <View style={ls.center}>
          <View style={ls.vacioIcono}><AppIcon name="people-outline" size={32} color={DS.colors.textTertiary} /></View>
          <Text style={ls.vacioTexto}>
            {busqueda.trim() ? 'Sin resultados para la búsqueda' : 'Sin usuarios para este filtro'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={usuariosFiltrados}
          keyExtractor={(u) => String(u.id)}
          contentContainerStyle={ls.lista}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <UsuarioCard
              item={item}
              onPress={() => router.push(`/(app)/usuarios/${item.id}` as any)}
            />
          )}
        />
      )}

      <Tappable
        centrado
        style={ls.nuevo}
        onPress={() => setModalVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Nuevo usuario"
      >
        <AppIcon name="add" size={30} color={DS.colors.onPrimary} />
      </Tappable>

      <NuevoUsuarioForm
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  filtrosScroll: { flexGrow: 0, flexShrink: 0 },
  filtrosContainer: { paddingHorizontal: SIZES.lg, paddingVertical: SIZES.md, gap: SIZES.sm, alignItems: 'center' },
  filtroChip: {
    paddingHorizontal: 14, minHeight: 40, minWidth: 0,
    borderRadius: 999, backgroundColor: '#FFFFFF',
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  filtroChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filtroText: { ...FONTS.caption, color: COLORS.primary, fontWeight: '600' },
  filtroTextActive: { color: '#FFFFFF' },
  listContent: { padding: SIZES.lg, gap: SIZES.sm, paddingBottom: 100 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: SIZES.md, borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardAvatar: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginRight: SIZES.md,
  },
  cardAvatarText: { ...FONTS.bodyBold, fontWeight: '700' },
  cardInfo: { flex: 1 },
  cardName: { ...FONTS.bodyBold, color: '#0F172A', fontWeight: '700', marginBottom: 2 },
  cardEmail: { ...FONTS.caption, color: COLORS.textMuted, marginBottom: SIZES.xs },
  cardBadges: { flexDirection: 'row', gap: SIZES.xs },
  cardRight: { alignItems: 'center', gap: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeText: { ...FONTS.small, fontWeight: '700' },
  estadoDot: { width: 8, height: 8, borderRadius: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SIZES.sm },
  errorText: { ...FONTS.body, color: COLORS.textMuted, textAlign: 'center' },
  emptyText: { ...FONTS.body, color: COLORS.textMuted },
  retryBtn: {
    paddingHorizontal: SIZES.lg, paddingVertical: SIZES.sm,
    backgroundColor: COLORS.primary, borderRadius: DS.radius.control,
  },
  retryText: { ...FONTS.caption, color: '#FFFFFF', fontWeight: '700' },
  fab: { position: 'absolute', right: SIZES.lg, bottom: SIZES.lg, backgroundColor: COLORS.primary },
  searchSection: { paddingHorizontal: SIZES.lg, paddingBottom: SIZES.sm },
  searchInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.xs,
    backgroundColor: '#FFFFFF', borderRadius: DS.radius.control, paddingHorizontal: SIZES.md, paddingVertical: 10,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  searchInput: { flex: 1, ...FONTS.body, color: '#0F172A', padding: 0 },
  
  modal: { flex: 1, padding: SIZES.lg, backgroundColor: '#F8FAFC' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.lg },
  modalTitle: { fontFamily: DS.font.bold, fontSize: 24, color: DS.colors.text },
  modalClose: { width: 46, height: 46, borderRadius: 23, backgroundColor: DS.colors.surface, borderWidth: DS.border, borderColor: DS.colors.border, alignItems: 'center', justifyContent: 'center' },
  modalContent: { paddingBottom: SIZES.xl },
  formSectionTitle: { fontFamily: DS.font.bold, fontSize: 17, color: DS.colors.text, marginTop: DS.space.section, marginBottom: 10 },
  tipoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.xs, marginBottom: SIZES.sm },
  tipoChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: '#FFFFFF', borderWidth: DS.border, borderColor: DS.colors.border,
  },
  tipoChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tipoText: { ...FONTS.caption, color: COLORS.primary, fontWeight: '600' },
  tipoTextActive: { color: '#FFFFFF' },
  input: { marginBottom: 2, backgroundColor: '#FFFFFF' },
  inputOutline: { borderRadius: 14 },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: DS.radius.control, padding: SIZES.md,
    marginTop: SIZES.xs, borderWidth: 1, borderColor: '#E2E8F0',
  },
  switchLabel: { ...FONTS.body, color: '#0F172A' },
  saveBtn: { backgroundColor: DS.colors.primary, borderRadius: DS.radius.control, minHeight: 54, justifyContent: 'center', alignItems: 'center', marginTop: SIZES.md },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { ...FONTS.bodyBold, color: '#FFFFFF', fontWeight: '700' },
});

/** Estilos de la lista (el formulario de nuevo usuario usa `styles`). */
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
  busqueda: { paddingHorizontal: DS.space.screen, paddingBottom: 4 },
  lista: { paddingHorizontal: DS.space.screen, paddingTop: 12, paddingBottom: 120, gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    backgroundColor: DS.colors.surface, borderRadius: DS.radius.card, borderWidth: DS.border, borderColor: DS.colors.border,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontFamily: DS.font.bold, fontSize: 17 },
  nombre: { fontFamily: DS.font.bold, fontSize: 16, color: DS.colors.text },
  email: { fontFamily: DS.font.regular, fontSize: 13, color: DS.colors.textTertiary, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { borderRadius: DS.radius.chip, paddingHorizontal: 10, paddingVertical: 4 },
  chipTexto: { fontFamily: DS.font.semibold, fontSize: 12 },
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
