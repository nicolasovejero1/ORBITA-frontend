import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Switch } from 'react-native-paper';
import { ActionPill, AvatarRing, Button, Card, Chip, DataRow, FormTextInput as TextInput, OrbitDecor } from '@/components/ds';
import { usuariosApi } from '@/api/usuarios';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { DS } from '@/constants/tokens';
import { useEspecialidades } from '@/hooks/useEspecialidades';
import { PasswordInput } from '@/components/PasswordInput';
import { SelectField } from '@/components/SelectField';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Toast, useToast } from '@/components/Toast';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useAuthStore } from '@/store/auth.store';
import { UsuarioListItem } from '@/types/usuario.types';
import { getErrorMessage } from '@/utils/http-error';
import { volver } from '@/utils/navegacion';
import { DNI_RE, EMAIL_RE, TELEFONO_RE } from '@/utils/validation';
import { AppIcon, Tappable } from '@/components/a11y';

const TIPO_COLORS: Record<string, { bg: string; text: string }> = {
  ADMINISTRADOR: { bg: '#FEF3C7', text: '#B45309' },
  PROFESIONAL:   { bg: '#EEF2FF', text: '#4338CA' },
  TUTOR:         { bg: '#FCE7F3', text: '#BE185D' },
  PCD:           { bg: '#CCFBF1', text: '#0F766E' },
};

function FormField({ label, value, onChange, ...rest }: {
  label: string; value: string; onChange: (v: string) => void;
  keyboardType?: any; multiline?: boolean; secureTextEntry?: boolean; maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <TextInput accessibilityLabel={label}
      label={label} value={value} onChangeText={onChange} mode="outlined"
      style={styles.input} outlineStyle={styles.inputOutline} {...rest}
    />
  );
}

function ResetPasswordModal({ visible, usuario, onClose, onReset }: {
  visible: boolean; usuario: UsuarioListItem | null; onClose: () => void; onReset: () => void;
}) {
  const { toast, showToast, hideToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!visible) return;
    setNewPassword(''); setConfirmPassword('');
  }, [visible]);

  const guardar = async () => {
    if (!usuario) return;
    // Se cierra el teclado para que no tape el aviso de error o de éxito que aparece abajo.
    Keyboard.dismiss();
    if (newPassword.length < 6) return showToast('La contraseña debe tener al menos 6 caracteres', 'error');
    if (newPassword !== confirmPassword) return showToast('Las contraseñas no coinciden', 'error');
    setSaving(true);
    try {
      await usuariosApi.resetPassword(usuario.id, newPassword);
      showToast('Contraseña restablecida correctamente', 'success');
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo restablecer la contraseña'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToastClose = () => {
    hideToast();
    if (toast.type === 'success') { onClose(); onReset(); }
  };

  if (!usuario) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} accessibilityRole="header">Restablecer contraseña</Text>
          <Tappable style={styles.modalClose} centrado accessibilityRole="button" accessibilityLabel="Cerrar sin restablecer la contraseña" onPress={onClose}>
            <AppIcon name="close" size={24} color="#475569" />
          </Tappable>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={{ ...FONTS.caption, color: COLORS.textMuted, marginBottom: SIZES.md }}>
              Se establece una contraseña nueva para {usuario.nombre} {usuario.apellido} sin pedir la anterior.
              Esto cierra todas sus sesiones activas.
            </Text>
            <PasswordInput label="Nueva contraseña" value={newPassword} onChange={setNewPassword} style={styles.input} outlineStyle={styles.inputOutline} />
            <PasswordInput label="Confirmar contraseña" value={confirmPassword} onChange={setConfirmPassword} style={styles.input} outlineStyle={styles.inputOutline} />
            <Tappable
              accessibilityRole="button"
              accessibilityLabel={saving ? 'Guardando' : 'Restablecer contraseña'}
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={guardar} disabled={saving || (toast.visible && toast.type === 'success')}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Restablecer contraseña'}</Text>
            </Tappable>
          </ScrollView>
        </KeyboardAvoidingView>
        <Toast {...toast} onClose={handleToastClose} />
      </View>
    </Modal>
  );
}

function EditarUsuarioForm({ visible, usuario, onClose, onSaved }: {
  visible: boolean; usuario: UsuarioListItem | null; onClose: () => void; onSaved: () => void;
}) {
  const { toast, showToast, hideToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [matricula, setMatricula] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const { nombres: especialidades, idDe: especialidadIdDe } = useEspecialidades(visible);
  const [establecimiento, setEstablecimiento] = useState('');
  const [descripcionFunciones, setDescripcionFunciones] = useState('');
  const [esAdmin, setEsAdmin] = useState(false);
  const [tipoDiscapacidad, setTipoDiscapacidad] = useState('');
  const [grado, setGrado] = useState('');
  const [diagnostico, setDiagnostico] = useState('');

  useEffect(() => {
    if (!visible || !usuario) return;
    setNombre(usuario.nombre);
    setApellido(usuario.apellido);
    setDni(usuario.dni);
    setEmail(usuario.email);
    setTelefono(usuario.telefono ?? '');
    setDireccion('');
    setDescripcionFunciones('');
    if (usuario.profesional) {
      setMatricula(usuario.profesional.matricula);
      setEspecialidad(usuario.profesional.especialidad?.nombre ?? '');
      setEstablecimiento(usuario.profesional.establecimiento ?? '');
      setEsAdmin(usuario.esAdministrador);
    }
    if (usuario.pcd) {
      setTipoDiscapacidad(usuario.pcd.tipoDiscapacidad ?? '');
      setGrado(usuario.pcd.grado ?? '');
      setDiagnostico(usuario.pcd.diagnostico ?? '');
    }
  }, [visible, usuario]);

  const guardar = async () => {
    if (!usuario) return;
    Keyboard.dismiss();
    if (nombre.trim().length < 2 || apellido.trim().length < 2)
      return showToast('Nombre y apellido deben tener al menos 2 caracteres', 'error');
    if (!DNI_RE.test(dni.trim())) return showToast('El DNI debe tener 7 u 8 dígitos, sin puntos', 'error');
    if (!EMAIL_RE.test(email.trim())) return showToast('Ingresá un email válido', 'error');
    if (telefono.trim() && !TELEFONO_RE.test(telefono.trim()))
      return showToast('El teléfono solo puede tener números, espacios, +, - y paréntesis', 'error');
    if (usuario.profesional && !matricula.trim()) return showToast('La matrícula es requerida', 'error');
    setSaving(true);
    try {
      await usuariosApi.update(usuario.id, {
        nombre, apellido, dni, email,
        ...(telefono && { telefono }),
        ...(direccion && { direccion }),
        ...(usuario.profesional && {
          matricula, especialidadId: especialidadIdDe(especialidad),
          ...(establecimiento && { establecimiento }),
          ...(descripcionFunciones && { descripcionFunciones }),
          esAdministrador: esAdmin,
        }),
        ...(usuario.pcd && {
          ...(tipoDiscapacidad && { tipoDiscapacidad }),
          ...(grado && { grado }),
          ...(diagnostico && { diagnostico }),
        }),
      });
      showToast('Usuario actualizado correctamente', 'success');
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

  if (!usuario) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} accessibilityRole="header">Editar usuario</Text>
          <Tappable style={styles.modalClose} centrado accessibilityRole="button" accessibilityLabel="Cerrar sin guardar los cambios" onPress={onClose}>
            <AppIcon name="close" size={24} color="#475569" />
          </Tappable>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">

            <View style={styles.tipoTag}>
              <Text style={styles.tipoTagText}>{usuario.tipoUsuario}</Text>
            </View>

            <Text style={styles.editSectionTitle} accessibilityRole="header">DATOS PERSONALES</Text>
            <FormField label="Nombre *" value={nombre} onChange={setNombre} maxLength={100} />
            <FormField label="Apellido *" value={apellido} onChange={setApellido} maxLength={100} />
            <FormField label="DNI * (sin puntos)" value={dni} onChange={(v) => setDni(v.replace(/\D/g, ''))} keyboardType="numeric" maxLength={8} />
            <FormField label="Email *" value={email} onChange={setEmail} keyboardType="email-address" autoCapitalize="none" maxLength={255} />
            <FormField label="Teléfono" value={telefono} onChange={setTelefono} keyboardType="phone-pad" maxLength={20} />
            <FormField label="Dirección" value={direccion} onChange={setDireccion} maxLength={255} />

            {usuario.profesional && (
              <>
                <Text style={styles.editSectionTitle} accessibilityRole="header">DATOS PROFESIONALES</Text>
                <FormField label="Matrícula *" value={matricula} onChange={setMatricula} maxLength={30} />
                <SelectField label="Especialidad" value={especialidad} options={especialidades} onSelect={setEspecialidad} />
                <FormField label="Establecimiento" value={establecimiento} onChange={setEstablecimiento} maxLength={100} />
                <FormField label="Descripción de funciones" value={descripcionFunciones} onChange={setDescripcionFunciones} multiline />
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Permisos de administrador</Text>
                  <Switch value={esAdmin} onValueChange={setEsAdmin} color={COLORS.primary} />
                </View>
              </>
            )}

            {usuario.pcd && (
              <>
                <Text style={styles.editSectionTitle} accessibilityRole="header">DATOS DEL PCD</Text>
                <FormField label="Tipo de discapacidad" value={tipoDiscapacidad} onChange={setTipoDiscapacidad} maxLength={255} />
                <FormField label="Grado" value={grado} onChange={setGrado} maxLength={10} />
                <FormField label="Diagnóstico" value={diagnostico} onChange={setDiagnostico} multiline />
              </>
            )}

            <Tappable
              accessibilityRole="button"
              accessibilityLabel={saving ? 'Guardando' : 'Guardar cambios'}
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={guardar} disabled={saving || (toast.visible && toast.type === 'success')}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
            </Tappable>
          </ScrollView>
        </KeyboardAvoidingView>
        <Toast {...toast} onClose={handleToastClose} />
      </View>
    </Modal>
  );
}

export default function UsuarioDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: authUser } = useAuthStore();
  const { toast, showToast, hideToast } = useToast();
  const [updating, setUpdating] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [resetPasswordVisible, setResetPasswordVisible] = useState(false);
  const [toggleConfirmVisible, setToggleConfirmVisible] = useState(false);
  const [eliminarConfirmVisible, setEliminarConfirmVisible] = useState(false);

  const usarioLoader = useCallback(
    () => usuariosApi.getOne(Number(id)),
    [id],
  );
  const { data, loading, reload, setData } = useAsyncData<UsuarioListItem>(usarioLoader);
  const usuario = data ?? null;

  const confirmarToggleEstado = async () => {
    if (!usuario) return;
    const nuevo = usuario.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    setToggleConfirmVisible(false);
    setUpdating(true);
    try {
      await usuariosApi.updateStatus(usuario.id, nuevo);
      setData((prev) => prev ? { ...prev, estado: nuevo } : prev);
    } catch {
      showToast('No se pudo cambiar el estado', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!usuario) return;
    setEliminarConfirmVisible(false);
    setUpdating(true);
    try {
      await usuariosApi.remove(usuario.id);
      volver(router, '/(app)/usuarios');
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo eliminar el usuario'), 'error');
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator accessibilityLabel="Cargando" size="large" color={DS.colors.primary} />
      </View>
    );
  }

  if (!usuario) return null;

  const { bg, text } = TIPO_COLORS[usuario.tipoUsuario] ?? { bg: '#EEF2FF', text: '#4338CA' };
  const initials = `${usuario.nombre[0]}${usuario.apellido[0]}`.toUpperCase();
  const activo = usuario.estado === 'ACTIVO';
  const esAdmin = !!authUser?.esAdministrador;
  const irAVinculos = (p: Record<string, string>, ruta: string) => router.push({ pathname: ruta, params: p } as any);

  return (
    <View style={styles.flexFill}>
      <StatusBar style="light" />
      <ScrollView style={styles.container} contentContainerStyle={det.scroll} showsVerticalScrollIndicator={false}>
        <Card dark featured style={[det.hero, { paddingTop: insets.top + 14 }]}>
          <OrbitDecor />
          <View style={det.heroTop}>
            <Tappable
              centrado
              onPress={() => volver(router, '/(app)/usuarios')}
              accessibilityRole="button"
              accessibilityLabel="Volver a la lista de usuarios"
              style={det.volver}
            >
              <AppIcon name="chevron-back" size={22} color={DS.colors.onPrimary} />
            </Tappable>
            <Chip label={activo ? 'Activo' : 'Inactivo'} tone={activo ? 'success' : 'neutral'} />
          </View>
          <AvatarRing initials={initials} size={104} />
          <Text style={det.nombre} accessibilityRole="header">{usuario.nombre} {usuario.apellido}</Text>
          <View style={det.chips}>
            <View style={[det.tipoChip, { backgroundColor: bg }]}>
              <Text style={[det.tipoChipTexto, { color: text }]}>{usuario.tipoUsuario}</Text>
            </View>
            {usuario.esAdministrador && usuario.tipoUsuario !== 'ADMINISTRADOR' && (
              <View style={[det.tipoChip, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[det.tipoChipTexto, { color: '#B45309' }]}>ADMIN</Text>
              </View>
            )}
          </View>
        </Card>

        <View>
          <Text style={det.seccion} accessibilityRole="header">Datos personales</Text>
          <Card style={det.card}>
            <DataRow icon="card-outline" tone="ambar" label="DNI" value={usuario.dni} />
            <DataRow icon="mail-outline" tone="indigo" label="Email" value={usuario.email} />
            <DataRow icon="call-outline" tone="teal" label="Teléfono" value={usuario.telefono} last />
          </Card>
        </View>

        {usuario.profesional && (
          <View>
            <Text style={det.seccion} accessibilityRole="header">Datos profesionales</Text>
            <Card style={det.card}>
              <DataRow icon="ribbon-outline" tone="indigo" label="Matrícula" value={usuario.profesional.matricula} />
              <DataRow icon="medkit-outline" tone="rosa" label="Especialidad" value={usuario.profesional.especialidad?.nombre ?? '-'} />
              <DataRow icon="business-outline" tone="teal" label="Establecimiento" value={usuario.profesional.establecimiento} last={!usuario.esAdministrador} />
              {usuario.esAdministrador && <DataRow icon="shield-checkmark-outline" tone="ambar" label="Permisos" value="Administrador" last />}
            </Card>
          </View>
        )}

        {usuario.pcd && (
          <View>
            <Text style={det.seccion} accessibilityRole="header">Datos del PCD</Text>
            <Card style={det.card}>
              <DataRow icon="accessibility-outline" tone="indigo" label="Tipo de discapacidad" value={usuario.pcd.tipoDiscapacidad} />
              <DataRow icon="speedometer-outline" tone="ambar" label="Grado" value={usuario.pcd.grado} />
              <DataRow icon="document-text-outline" tone="teal" label="Diagnóstico" value={usuario.pcd.diagnostico} last />
            </Card>
          </View>
        )}

        <View style={det.acciones}>
          <Text style={det.seccion} accessibilityRole="header">Acciones</Text>
          <Button label="Editar usuario" onPress={() => setEditModalVisible(true)} />
          {esAdmin && <Button label="Restablecer contraseña" variant="secondary" onPress={() => setResetPasswordVisible(true)} />}
          {esAdmin && usuario.profesional && (
            <Button label="Ver pacientes" variant="secondary" onPress={() => irAVinculos({ profesionalId: String(usuario.id), userId: String(id) }, '/(app)/vinculos')} />
          )}
          {esAdmin && usuario.pcd && (
            <Button label="Ver profesionales" variant="secondary" onPress={() => irAVinculos({ pcdId: String(usuario.id), userId: String(id) }, '/(app)/vinculos')} />
          )}
          {esAdmin && (usuario.tutor || usuario.pcd) && (
            <Button
              label={usuario.tutor ? 'Ver vínculos' : 'Ver tutores'}
              variant="secondary"
              onPress={() => irAVinculos(
                usuario.tutor ? { tutorId: String(usuario.id), userId: String(id) } : { pcdId: String(usuario.id), userId: String(id) },
                '/(app)/tutor-pcd',
              )}
            />
          )}

          <View style={det.fila}>
            <ActionPill
              label={activo ? 'Desactivar' : 'Activar'}
              icon={activo ? 'pause-circle-outline' : 'play-circle-outline'}
              tone={activo ? 'warning' : 'success'}
              onPress={() => setToggleConfirmVisible(true)}
              disabled={updating}
              accessibilityLabel={activo ? 'Desactivar usuario' : 'Activar usuario'}
            />
            <ActionPill label="Eliminar" icon="trash-outline" tone="danger" onPress={() => setEliminarConfirmVisible(true)} disabled={updating} accessibilityLabel="Eliminar usuario" />
          </View>
        </View>
      </ScrollView>

      <EditarUsuarioForm
        visible={editModalVisible}
        usuario={usuario}
        onClose={() => setEditModalVisible(false)}
        onSaved={() => { void reload(); }}
      />

      <ResetPasswordModal
        visible={resetPasswordVisible}
        usuario={usuario}
        onClose={() => setResetPasswordVisible(false)}
        onReset={() => {}}
      />

      <ConfirmDialog
        visible={toggleConfirmVisible}
        variant={usuario.estado === 'ACTIVO' ? 'warning' : 'primary'}
        icon={usuario.estado === 'ACTIVO' ? 'pause-circle-outline' : 'play-circle-outline'}
        title={usuario.estado === 'ACTIVO' ? '¿Desactivar el usuario?' : '¿Activar el usuario?'}
        message={usuario.estado === 'ACTIVO'
          ? `${usuario.nombre} ${usuario.apellido} no podrá acceder al sistema.`
          : `${usuario.nombre} ${usuario.apellido} recuperará el acceso al sistema.`}
        confirmLabel={usuario.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
        onCancel={() => setToggleConfirmVisible(false)}
        onConfirm={confirmarToggleEstado}
      />

      <ConfirmDialog
        visible={eliminarConfirmVisible}
        variant="danger"
        title="¿Eliminar el usuario?"
        message={`Se elimina a ${usuario.nombre} ${usuario.apellido}. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onCancel={() => setEliminarConfirmVisible(false)}
        onConfirm={confirmarEliminar}
      />

      <Toast {...toast} onClose={hideToast} style={{ position: 'absolute', bottom: SIZES.lg, left: SIZES.lg, right: SIZES.lg }} />
    </View>
  );
}

const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: SIZES.lg, paddingBottom: SIZES.xl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { alignItems: 'center', marginBottom: SIZES.lg },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    justifyContent: 'center', alignItems: 'center', marginBottom: SIZES.md,
  },
  avatarText: { fontSize: 28, fontWeight: '700' },
  name: { ...FONTS.h4, color: '#0F172A', fontWeight: '700', marginBottom: SIZES.sm },
  badgesRow: { flexDirection: 'row', gap: SIZES.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { ...FONTS.small, fontWeight: '700' },

  section: { marginBottom: SIZES.md },
  sectionTitle: { ...FONTS.caption, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.5, marginBottom: SIZES.xs, paddingHorizontal: 4 },
  sectionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 1,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: SIZES.md,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  infoLabel: { ...FONTS.caption, color: COLORS.textMuted },
  infoValue: { ...FONTS.caption, color: '#0F172A', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SIZES.xs, backgroundColor: COLORS.primary, borderRadius: 14,
    minHeight: 48, paddingVertical: 12, marginBottom: SIZES.sm,
  },
  editBtnText: { ...FONTS.caption, color: '#FFFFFF', fontWeight: '700' },
  vinculosBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SIZES.xs, backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.primary,
    minHeight: 48, paddingVertical: 12, marginBottom: SIZES.sm,
  },
  vinculosBtnText: { ...FONTS.caption, color: COLORS.primary, fontWeight: '700' },
  tutorPcdBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SIZES.xs, backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.success,
    minHeight: 48, paddingVertical: 12, marginBottom: SIZES.sm,
  },
  tutorPcdBtnText: { ...FONTS.caption, color: '#0F766E', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: SIZES.sm, marginTop: SIZES.sm },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SIZES.xs, paddingVertical: 14, borderRadius: 14,
  },
  actionText: { ...FONTS.caption, fontWeight: '700' },

  
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
    ...FONTS.small, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 0.5, marginTop: SIZES.lg, marginBottom: SIZES.xs,
  },
  input: { marginBottom: SIZES.xs, backgroundColor: '#FFFFFF' },
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

/** Estilos de la pantalla de detalle (los formularios usan `styles`). */
const det = StyleSheet.create({
  scroll: { paddingBottom: 56, gap: DS.space.section },
  hero: {
    borderRadius: 0, borderBottomLeftRadius: DS.radius.featured + 6, borderBottomRightRadius: DS.radius.featured + 6,
    paddingHorizontal: DS.space.screen, paddingBottom: 26, alignItems: 'center', gap: 8, overflow: 'hidden',
  },
  heroTop: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  volver: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.12)' },
  nombre: { fontFamily: DS.font.bold, fontSize: 24, color: DS.colors.onPrimary, textAlign: 'center', marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  tipoChip: { borderRadius: DS.radius.chip, paddingHorizontal: 12, paddingVertical: 5 },
  tipoChipTexto: { fontFamily: DS.font.bold, fontSize: 12, letterSpacing: 0.4 },
  seccion: { fontFamily: DS.font.bold, fontSize: 18, color: DS.colors.text, marginBottom: 10, marginHorizontal: DS.space.screen },
  card: { marginHorizontal: DS.space.screen, overflow: 'hidden' },
  acciones: { gap: 10, paddingHorizontal: DS.space.screen },
  fila: { flexDirection: 'row', gap: 10, marginTop: 6 },
  accion: { flex: 1, flexDirection: 'row', gap: 8, height: 54, borderRadius: DS.radius.control },
  accionTexto: { fontFamily: DS.font.semibold, fontSize: 16 },
});
