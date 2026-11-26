import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '@/api/auth';
import { AppIcon, Tappable } from '@/components/a11y';
import { Button, Card, Input } from '@/components/ds';
import { DS } from '@/constants/tokens';
import { getErrorMessage } from '@/utils/http-error';
import { EMAIL_RE } from '@/utils/validation';

/** Segundos que hay que esperar para pedir otro código (el backend también lo exige). */
export const ESPERA_REENVIO_SEG = 60;
export const MIN_PASSWORD = 6;

type Paso = 'email' | 'codigo' | 'clave' | 'listo';

const TITULOS: Record<Paso, { titulo: string; subtitulo: string }> = {
  email: {
    titulo: 'Recuperar contraseña',
    subtitulo: 'Ingresá el email de tu cuenta y te enviamos un código de 6 dígitos.',
  },
  codigo: {
    titulo: 'Ingresá el código',
    subtitulo: 'Revisá tu correo, también la carpeta de spam. El código vence en 10 minutos.',
  },
  clave: {
    titulo: 'Elegí una contraseña nueva',
    subtitulo: `Tiene que tener al menos ${MIN_PASSWORD} caracteres.`,
  },
  listo: {
    titulo: '¡Listo!',
    subtitulo: 'Cambiaste tu contraseña. Ya podés iniciar sesión con la nueva.',
  },
};

export default function RecuperarContrasenaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [paso, setPaso] = useState<Paso>('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [espera, setEspera] = useState(0);

  // Cuenta regresiva del reenvío.
  useEffect(() => {
    if (espera <= 0) return;
    const timer = setInterval(() => setEspera((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [espera > 0]); // eslint-disable-line react-hooks/exhaustive-deps -- solo importa si hay cuenta en marcha

  const irAlLogin = () => router.replace('/(auth)/login');

  const pedirCodigo = async () => {
    if (!EMAIL_RE.test(email.trim())) {
      setError('Ingresá un email válido');
      return;
    }
    setError('');
    setCargando(true);
    try {
      await authApi.forgotPassword(email.trim());
      setCodigo('');
      setEspera(ESPERA_REENVIO_SEG);
      setPaso('codigo');
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo enviar el código. Intentá de nuevo.'));
    } finally {
      setCargando(false);
    }
  };

  const verificarCodigo = async () => {
    if (!/^\d{6}$/.test(codigo)) {
      setError('El código tiene 6 dígitos');
      return;
    }
    setError('');
    setCargando(true);
    try {
      setResetToken(await authApi.verifyOtp(email.trim(), codigo));
      setPaso('clave');
    } catch (e: any) {
      setError(
        e?.response?.status === 400
          ? 'El código es incorrecto o venció. Revisalo o pedí uno nuevo.'
          : getErrorMessage(e),
      );
    } finally {
      setCargando(false);
    }
  };

  const guardarPassword = async () => {
    if (password.length < MIN_PASSWORD) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`);
      return;
    }
    if (password !== confirmacion) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setError('');
    setCargando(true);
    try {
      await authApi.resetPassword(resetToken, password);
      setPaso('listo');
    } catch (e: any) {
      if (e?.response?.status === 400 && /venci/i.test(String(e.response.data?.message))) {
        // El permiso de 10 minutos se terminó: hay que pedir un código nuevo.
        setPassword('');
        setConfirmacion('');
        setResetToken('');
        setPaso('email');
        setError('Pasó demasiado tiempo. Pedí un código nuevo.');
      } else {
        setError(getErrorMessage(e, 'No se pudo cambiar la contraseña. Intentá de nuevo.'));
      }
    } finally {
      setCargando(false);
    }
  };

  const { titulo, subtitulo } = TITULOS[paso];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Card featured style={styles.card}>
            <View style={[styles.iconWrap, paso === 'listo' && styles.iconWrapOk]}>
              <AppIcon
                name={paso === 'listo' ? 'checkmark-circle' : paso === 'clave' ? 'key-outline' : paso === 'codigo' ? 'mail-open-outline' : 'lock-open-outline'}
                size={30}
                color={paso === 'listo' ? DS.colors.success : DS.colors.accent}
              />
            </View>
            <Text style={styles.cardTitle} accessibilityRole="header">{titulo}</Text>
            <Text style={styles.cardSubtitle}>{subtitulo}</Text>

            {paso === 'email' && (
              <>
                <Input
                  label="Correo electrónico"
                  accessibilityLabel="Correo electrónico"
                  placeholder="nombre@correo.com"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="send"
                  onSubmitEditing={pedirCodigo}
                  editable={!cargando}
                  left={<AppIcon name="mail-outline" size={22} color={DS.colors.textTertiary} />}
                />
                <Mensaje error={error} />
                <Button label="Enviar código" loading={cargando} onPress={pedirCodigo} />
              </>
            )}

            {paso === 'codigo' && (
              <>
                <Text style={styles.destino}>Enviamos el código a {email.trim()}</Text>
                <Input
                  label="Código de 6 dígitos"
                  accessibilityLabel="Código de 6 dígitos"
                  placeholder="000000"
                  value={codigo}
                  onChangeText={(t) => { setCodigo(t.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={verificarCodigo}
                  editable={!cargando}
                  left={<AppIcon name="keypad-outline" size={22} color={DS.colors.textTertiary} />}
                />
                <Mensaje error={error} />
                <Button label="Verificar código" loading={cargando} onPress={verificarCodigo} />
                <Tappable
                  centrado
                  style={styles.link}
                  disabled={espera > 0 || cargando}
                  onPress={pedirCodigo}
                  accessibilityRole="button"
                  accessibilityLabel={espera > 0 ? `Reenviar código, disponible en ${espera} segundos` : 'Reenviar código'}
                >
                  <Text style={[styles.linkText, (espera > 0 || cargando) && styles.linkTextOff]}>
                    {espera > 0 ? `Reenviar código en ${espera} s` : 'Reenviar código'}
                  </Text>
                </Tappable>
                <Tappable
                  centrado
                  style={styles.link}
                  onPress={() => { setPaso('email'); setError(''); }}
                  accessibilityRole="button"
                  accessibilityLabel="Usar otro correo"
                >
                  <Text style={styles.linkText}>Usar otro correo</Text>
                </Tappable>
              </>
            )}

            {paso === 'clave' && (
              <>
                <CampoClave label="Contraseña nueva" value={password} onChange={(t) => { setPassword(t); setError(''); }} />
                <CampoClave label="Repetí la contraseña nueva" value={confirmacion} onChange={(t) => { setConfirmacion(t); setError(''); }} />
                <Mensaje error={error} />
                <Button label="Cambiar contraseña" loading={cargando} onPress={guardarPassword} />
              </>
            )}

            {paso === 'listo' && (
              <Button label="Ir a iniciar sesión" onPress={irAlLogin} />
            )}

            {paso !== 'listo' && (
              <Tappable
                centrado
                style={styles.link}
                onPress={irAlLogin}
                accessibilityRole="button"
                accessibilityLabel="Volver a iniciar sesión"
              >
                <Text style={styles.linkText}>Volver a iniciar sesión</Text>
              </Tappable>
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Campo de contraseña con el botón de ojo para mostrarla u ocultarla. */
function CampoClave({ label, value, onChange }: { label: string; value: string; onChange: (t: string) => void }) {
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

function Mensaje({ error }: { error: string }) {
  return error ? (
    <View style={styles.error} accessibilityLiveRegion="polite">
      <AppIcon name="alert-circle" size={18} color={DS.colors.error} />
      <Text style={styles.errorTexto}>{error}</Text>
    </View>
  ) : null;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: DS.colors.background },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },
  card: { padding: 24 },
  iconWrap: {
    width: 60, height: 60, borderRadius: 18, backgroundColor: DS.colors.accentSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  iconWrapOk: { backgroundColor: DS.colors.successSoft },
  cardTitle: { fontFamily: DS.font.bold, fontSize: 24, color: DS.colors.text, marginBottom: 6 },
  cardSubtitle: { fontFamily: DS.font.regular, fontSize: 15, lineHeight: 22, color: DS.colors.textSecondary, marginBottom: 20 },
  destino: { fontFamily: DS.font.semibold, fontSize: 14, color: DS.colors.text, marginBottom: 12 },
  ojo: { marginRight: -10 },
  error: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, padding: 12,
    borderRadius: DS.radius.control, backgroundColor: DS.colors.errorSoft,
  },
  errorTexto: { flex: 1, fontFamily: DS.font.medium, fontSize: 14, color: DS.colors.error },
  link: { alignSelf: 'center', marginTop: 4 },
  linkText: { fontFamily: DS.font.semibold, fontSize: 15, color: DS.colors.accent },
  linkTextOff: { color: DS.colors.textTertiary },
});
