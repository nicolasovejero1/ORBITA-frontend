import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Toast, useToast } from '@/components/Toast';
import { ActionPill, AvatarRing, Button, Card, Chip, Input, OrbitDecor } from '@/components/ds';
import { DS } from '@/constants/tokens';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/api/auth';
import { notificacionesApi } from '@/api/notificaciones';
import { usuariosApi } from '@/api/usuarios';
import { TipoUsuario, Usuario } from '@/types/auth.types';
import { getErrorMessage } from '@/utils/http-error';
import { EMAIL_RE, TELEFONO_RE } from '@/utils/validation';
import { AppIcon, Tappable } from '@/components/a11y';

interface AccesoItem {
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const ROL_LABELS: Record<TipoUsuario, string> = {
  ADMINISTRADOR: 'Administrador',
  PROFESIONAL: 'Profesional',
  TUTOR: 'Tutor',
  PCD: 'Persona con Discapacidad',
};

type Tono = 'indigo' | 'teal' | 'rosa' | 'ambar';
const TONOS: Record<Tono, { bg: string; fg: string }> = {
  indigo: { bg: '#EEF2FF', fg: '#4338CA' },
  teal: { bg: '#CCFBF1', fg: '#0F766E' },
  rosa: { bg: '#FCE7F3', fg: '#BE185D' },
  ambar: { bg: '#FEF3C7', fg: '#B45309' },
};

function InfoRow({ label, value, icon, tono, ultimo }: {
  label: string; value?: string | null; icon: keyof typeof Ionicons.glyphMap; tono: Tono; ultimo?: boolean;
}) {
  if (!value) return null;
  return (
    <View style={[styles.infoRow, !ultimo && styles.infoRowBorde]}>
      <View style={[styles.infoIcon, { backgroundColor: TONOS[tono].bg }]}>
        <AppIcon name={icon} size={20} color={TONOS[tono].fg} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

/** Campo de contraseña con el botón de ojo para mostrarla u ocultarla. */
function CampoContrasena({ label, value, onChange }: { label: string; value: string; onChange: (t: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      label={label}
      accessibilityLabel={label}
      value={value}
      onChangeText={onChange}
      secureTextEntry={!visible}
      autoCapitalize="none"
      left={<AppIcon name="lock-closed-outline" size={22} color={DS.colors.textTertiary} />}
      right={
        <Tappable
          centrado
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          style={styles.ojo}
        >
          <AppIcon name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={DS.colors.textTertiary} />
        </Tappable>
      }
    />
  );
}

function Hoja({ titulo, cerrarLabel, onClose, children }: {
  titulo: string; cerrarLabel: string; onClose: () => void; children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.modalCard, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle} accessibilityRole="header">{titulo}</Text>
          <Tappable centrado accessibilityRole="button" accessibilityLabel={cerrarLabel} onPress={onClose} style={styles.cerrar}>
            <AppIcon name="close" size={22} color={DS.colors.textSecondary} />
          </Tappable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function ChangePasswordModal({ visible, onClose, onChanged }: {
  visible: boolean; onClose: () => void; onChanged: () => void;
}) {
  const { toast, showToast, hideToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!visible) return;
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
  }, [visible]);

  const guardar = async () => {
    // Se cierra el teclado para que no tape el aviso de error o de éxito.
    Keyboard.dismiss();
    if (!currentPassword.trim()) return showToast('Ingresá tu contraseña actual', 'error');
    if (newPassword.length < 6) return showToast('La nueva contraseña debe tener al menos 6 caracteres', 'error');
    if (newPassword === currentPassword) return showToast('La nueva contraseña debe ser diferente a la actual', 'error');
    if (newPassword !== confirmPassword) return showToast('Las contraseñas no coinciden', 'error');
    setSaving(true);
    try {
      await usuariosApi.changeOwnPassword(currentPassword, newPassword);
      showToast('Contraseña actualizada. Iniciá sesión de nuevo.', 'success');
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo cambiar la contraseña'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToastClose = () => {
    hideToast();
    if (toast.type === 'success') { onClose(); onChanged(); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Hoja titulo="Cambiar contraseña" cerrarLabel="Cerrar sin cambiar la contraseña" onClose={onClose}>
        <CampoContrasena label="Contraseña actual" value={currentPassword} onChange={setCurrentPassword} />
        <CampoContrasena label="Nueva contraseña" value={newPassword} onChange={setNewPassword} />
        <CampoContrasena label="Confirmar nueva contraseña" value={confirmPassword} onChange={setConfirmPassword} />
        <View style={styles.modalAccion}>
          <Button label="Cambiar contraseña" onPress={guardar} loading={saving} />
        </View>
      </Hoja>
      <Toast {...toast} onClose={handleToastClose} />
    </Modal>
  );
}

function EditModal({ visible, profile, onClose, onSaved }: {
  visible: boolean; profile: Usuario | null; onClose: () => void; onSaved: (u: Usuario) => void;
}) {
  const { toast, showToast, hideToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [nombre, setNombre] = useState(profile?.nombre ?? '');
  const [apellido, setApellido] = useState(profile?.apellido ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [telefono, setTelefono] = useState(profile?.telefono ?? '');
  const [direccion, setDireccion] = useState(profile?.direccion ?? '');

  const guardar = async () => {
    Keyboard.dismiss();
    if (nombre.trim().length < 2 || apellido.trim().length < 2)
      return showToast('Nombre y apellido deben tener al menos 2 caracteres', 'error');
    if (!EMAIL_RE.test(email.trim())) return showToast('Ingresá un email válido', 'error');
    if (telefono.trim() && !TELEFONO_RE.test(telefono.trim()))
      return showToast('El teléfono solo puede tener números, espacios, +, - y paréntesis', 'error');
    setSaving(true);
    try {
      const updated = await usuariosApi.updateMe({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        email: email.trim(),
        ...(telefono.trim() && { telefono: telefono.trim() }),
        ...(direccion.trim() && { direccion: direccion.trim() }),
      });
      showToast('Perfil actualizado correctamente', 'success');
      onSaved(updated);
      onClose();
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo actualizar el perfil'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Hoja titulo="Editar perfil" cerrarLabel="Cerrar sin guardar los cambios" onClose={onClose}>
        <Input label="Nombre" accessibilityLabel="Nombre" value={nombre} onChangeText={setNombre} maxLength={100} />
        <Input label="Apellido" accessibilityLabel="Apellido" value={apellido} onChangeText={setApellido} maxLength={100} />
        <Input label="Email" accessibilityLabel="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" maxLength={255} />
        <Input label="Teléfono" accessibilityLabel="Teléfono" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" maxLength={20} />
        <Input label="Dirección" accessibilityLabel="Dirección" value={direccion} onChangeText={setDireccion} maxLength={255} />
        <View style={styles.modalAccion}>
          <Button label="Guardar cambios" onPress={guardar} loading={saving} />
        </View>
      </Hoja>
      <Toast {...toast} onClose={hideToast} />
    </Modal>
  );
}

export default function PerfilScreen() {
  const { user, setUser, logout } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const cerrarSesion = async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    try {
      // Revocación remota best-effort: si algo falla (sin red, token ya
      // vencido), igual se limpia la sesión local para no dejar al usuario
      // atrapado. Se hace antes de logout() porque necesita el access token
      // todavía vigente.
      await Promise.all([
        refreshToken ? authApi.logout(refreshToken) : Promise.resolve(),
        notificacionesApi.eliminarPushToken().catch(() => {}),
      ]);
    } catch {
      // logout() ya limpia la sesión local en el finally.
    } finally {
      logout();
    }
  };

  const cargar = useCallback(async () => {
    try {
      setProfile(await usuariosApi.getMe());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  if (!user) return null;

  const datos = profile ?? user;
  const initials = `${datos.nombre[0]}${datos.apellido[0]}`.toUpperCase();
  const esAdmin = user.esAdministrador ?? false;
  const tipo = user.tipoUsuario;

  const accesos: AccesoItem[] = [
    ...(esAdmin
      ? [
          { label: 'Medicamentos', route: '/(app)/medicamentos', icon: 'medkit-outline' as const },
          { label: 'Terapias', route: '/(app)/terapias', icon: 'pulse-outline' as const },
        ]
      : []),
    ...(tipo === 'TUTOR' || tipo === 'PCD'
      ? [{ label: 'Ubicación', route: '/(app)/ubicaciones', icon: 'location-outline' as const }]
      : []),
  ];

  const onSaved = (updated: Usuario) => {
    setProfile(updated);
    setUser(updated);
    setLoading(false);
  };

  const rolTexto = `${ROL_LABELS[user.tipoUsuario]}${user.esAdministrador && user.tipoUsuario !== 'ADMINISTRADOR' ? ' · Admin' : ''}`;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <OrbitDecor />
          <AvatarRing initials={initials} />
          <Text style={styles.nombre} accessibilityRole="header">{datos.nombre} {datos.apellido}</Text>
          <Chip label={rolTexto} tone="accent" />
          <Text style={styles.heroEmail} numberOfLines={1}>{datos.email}</Text>
        </View>

        <View style={styles.atajos}>
          <ActionPill label="Editar perfil" icon="create-outline" onPress={() => setEditVisible(true)} />
          <ActionPill label="Contraseña" icon="key-outline" onPress={() => setPasswordVisible(true)} accessibilityLabel="Cambiar contraseña" />
        </View>

        <View>
          <Text style={styles.seccion} accessibilityRole="header">Información de cuenta</Text>
          <Card style={styles.card}>
            {loading ? (
              <View style={styles.cargando}><ActivityIndicator accessibilityLabel="Cargando" color={DS.colors.primary} /></View>
            ) : error ? (
              <InfoRow label="Email" value={user.email} icon="mail-outline" tono="indigo" ultimo />
            ) : (
              <>
                <InfoRow label="Email" value={datos.email} icon="mail-outline" tono="indigo" />
                <InfoRow label="Teléfono" value={datos.telefono} icon="call-outline" tono="teal" />
                <InfoRow label="Dirección" value={datos.direccion} icon="location-outline" tono="rosa" />
                <InfoRow label="DNI" value={datos.dni} icon="card-outline" tono="ambar" />
                <InfoRow label="Tipo de usuario" value={ROL_LABELS[user.tipoUsuario]} icon="ribbon-outline" tono="indigo" ultimo />
              </>
            )}
          </Card>
        </View>

        {accesos.length > 0 && (
          <View>
            <Text style={styles.seccion} accessibilityRole="header">Accesos</Text>
            <Card style={styles.card}>
              {accesos.map((item, i) => (
                <Tappable
                  key={item.route}
                  style={[styles.acceso, i < accesos.length - 1 && styles.infoRowBorde]}
                  onPress={() => router.navigate(item.route as any)}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                >
                  <View style={styles.infoIcon}>
                    <AppIcon name={item.icon} size={20} color={DS.colors.accent} />
                  </View>
                  <Text style={[styles.infoValue, styles.flex]}>{item.label}</Text>
                  <AppIcon name="chevron-forward" size={20} color={DS.colors.textTertiary} />
                </Tappable>
              ))}
            </Card>
          </View>
        )}

        <Tappable
          style={styles.salir}
          onPress={cerrarSesion}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
        >
          <AppIcon name="log-out-outline" size={20} color={DS.colors.error} />
          <Text style={styles.salirTexto}>Cerrar sesión</Text>
        </Tappable>
      </ScrollView>

      <EditModal visible={editVisible} profile={datos} onClose={() => setEditVisible(false)} onSaved={onSaved} />
      <ChangePasswordModal
        visible={passwordVisible}
        onClose={() => setPasswordVisible(false)}
        onChanged={() => {
          // El backend revoca todas las sesiones (incl. el refresh token actual)
          // al cambiar la contraseña propia, así que hay que forzar el login de nuevo.
          logout();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: DS.colors.background },
  content: { paddingHorizontal: DS.space.screen, paddingBottom: 56, gap: DS.space.section },

  hero: {
    alignItems: 'center', gap: 10, padding: 24, overflow: 'hidden',
    backgroundColor: DS.colors.primary, borderRadius: DS.radius.featured,
  },
  nombre: { fontFamily: DS.font.bold, fontSize: 24, color: DS.colors.onPrimary, textAlign: 'center', marginTop: 4 },
  heroEmail: { fontFamily: DS.font.regular, fontSize: 14, color: DS.colors.onPrimaryMuted },

  atajos: { flexDirection: 'row', gap: 12 },
  atajo: {
    flex: 1, gap: 4, padding: 16, backgroundColor: DS.colors.surface, borderRadius: DS.radius.card,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  atajoIcono: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  atajoTitulo: { fontFamily: DS.font.bold, fontSize: 16, color: DS.colors.text },
  atajoDetalle: { fontFamily: DS.font.regular, fontSize: 13, color: DS.colors.textTertiary },

  seccion: { fontFamily: DS.font.bold, fontSize: 18, color: DS.colors.text, marginBottom: 10 },
  card: { overflow: 'hidden' },
  cargando: { padding: 24, alignItems: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, minHeight: 64 },
  infoRowBorde: { borderBottomWidth: DS.border, borderBottomColor: DS.colors.border },
  infoIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: DS.colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { fontFamily: DS.font.medium, fontSize: 12, color: DS.colors.textTertiary },
  infoValue: { fontFamily: DS.font.semibold, fontSize: 15, color: DS.colors.text },

  acceso: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, minHeight: 64 },
  salir: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54,
    borderRadius: DS.radius.control, borderWidth: DS.border, borderColor: '#FECACA', backgroundColor: DS.colors.errorSoft,
  },
  salirTexto: { fontFamily: DS.font.semibold, fontSize: 16, color: DS.colors.error },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.45)' },
  modalCard: {
    backgroundColor: DS.colors.surface, borderTopLeftRadius: DS.radius.featured, borderTopRightRadius: DS.radius.featured,
    paddingHorizontal: DS.space.screen, paddingTop: 20, maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontFamily: DS.font.bold, fontSize: 20, color: DS.colors.text },
  cerrar: { marginRight: -10 },
  modalAccion: { marginTop: 8 },
  ojo: { marginRight: -10 },
});
