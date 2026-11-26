import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '@/api/auth';
import { AppIcon, Tappable } from '@/components/a11y';
import { Button, Entrar, Input, Logo } from '@/components/ds';
import { DS } from '@/constants/tokens';
import { useAuthStore } from '@/store/auth.store';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CLAVE_EMAIL_RECORDADO = 'login.email-recordado';

interface ErrorLogin {
  titulo: string;
  detalle: string;
  /** Ofrece ir a recuperar la contraseña. */
  recuperar?: boolean;
  /** Marca los dos campos en rojo (credenciales que no coinciden). */
  marcarCampos?: boolean;
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [recordarme, setRecordarme] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorEmail, setErrorEmail] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [errorGeneral, setErrorGeneral] = useState<ErrorLogin | null>(null);
  const { login } = useAuthStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<TextInput>(null);

  // "Recordarme" guarda solo el email para precargarlo la próxima vez (nunca la contraseña).
  useEffect(() => {
    AsyncStorage.getItem(CLAVE_EMAIL_RECORDADO)
      .then((guardado) => {
        if (guardado) { setEmail(guardado); setRecordarme(true); }
      })
      .catch(() => {});
  }, []);

  const handleLogin = async () => {
    const mail = email.trim();
    setErrorEmail(''); setErrorPassword(''); setErrorGeneral(null);
    let valido = true;
    if (!mail) { setErrorEmail('Ingresá tu email'); valido = false; }
    else if (!EMAIL_REGEX.test(mail)) { setErrorEmail('Ingresá un email válido'); valido = false; }
    if (!password.trim()) { setErrorPassword('Ingresá tu contraseña'); valido = false; }
    if (!valido) return;

    setLoading(true);
    try {
      const data = await authApi.login(mail, password);
      if (recordarme) await AsyncStorage.setItem(CLAVE_EMAIL_RECORDADO, mail).catch(() => {});
      else await AsyncStorage.removeItem(CLAVE_EMAIL_RECORDADO).catch(() => {});
      login(data.usuario, data.access_token, data.refresh_token);
    } catch (e: any) {
      if (!e?.response) {
        setErrorGeneral({
          titulo: 'Sin conexión',
          detalle: 'Revisá tu internet e intentá de nuevo.',
        });
      } else if (e.response.status === 429) {
        setErrorGeneral({
          titulo: 'Demasiados intentos',
          detalle: 'Esperá un minuto y probá de nuevo.',
        });
      } else if (e.response.data?.message === 'Usuario inactivo') {
        setErrorGeneral({
          titulo: 'Cuenta inactiva',
          detalle: 'Contactá al administrador.',
        });
      } else if (e.response.status >= 500) {
        setErrorGeneral({
          titulo: 'Error del servidor',
          detalle: 'Probá de nuevo en un momento.',
        });
      } else {
        // El servidor no distingue si falló el email o la contraseña (a propósito, por seguridad).
        setErrorGeneral({
          titulo: 'Datos incorrectos',
          detalle: 'Revisá tu email y contraseña.',
          recuperar: true,
          marcarCampos: true,
        });
        setPassword('');
        passwordRef.current?.focus();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Entrar>
          <View style={styles.hero}>
            <Logo size={160} />
            <Text style={styles.appName} accessibilityRole="header">Órbita</Text>
          </View>
          </Entrar>

          <Input
            label="Email"
            accessibilityLabel="Email"
            placeholder="tutor@gmail.com"
            value={email}
            onChangeText={(t) => { setEmail(t); setErrorEmail(''); setErrorGeneral(null); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            blurOnSubmit={false}
            editable={!loading}
            error={errorEmail}
            invalid={!!errorGeneral?.marcarCampos}
            left={<AppIcon name="mail-outline" size={22} color={DS.colors.textTertiary} />}
          />

          <Input
            ref={passwordRef}
            label="Contraseña"
            accessibilityLabel="Contraseña"
            placeholder="Tu contraseña"
            value={password}
            onChangeText={(t) => { setPassword(t); setErrorPassword(''); setErrorGeneral(null); }}
            secureTextEntry={!showPassword}
            autoComplete="password"
            textContentType="password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            editable={!loading}
            error={errorPassword}
            invalid={!!errorGeneral?.marcarCampos}
            left={<AppIcon name="lock-closed-outline" size={22} color={DS.colors.textTertiary} />}
            right={
              <Tappable
                centrado
                onPress={() => setShowPassword((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                style={styles.eye}
              >
                <AppIcon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={DS.colors.textTertiary} />
              </Tappable>
            }
          />

          <View style={styles.optionsRow}>
            <Tappable
              onPress={() => setRecordarme((v) => !v)}
              disabled={loading}
              accessibilityRole="checkbox"
              accessibilityLabel="Recordarme"
              checked={recordarme}
              style={styles.remember}
            >
              <View style={[styles.checkbox, recordarme && styles.checkboxOn]}>
                {recordarme && <AppIcon name="checkmark" size={14} color={DS.colors.onPrimary} />}
              </View>
              <Text style={styles.rememberText}>Recordarme</Text>
            </Tappable>
            <Tappable
              centrado
              onPress={() => router.push('/(auth)/recuperar')}
              disabled={loading}
              accessibilityRole="link"
              accessibilityLabel="¿Olvidaste tu contraseña? Restablecerla con un código por email"
            >
              <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>
            </Tappable>
          </View>

          {errorGeneral ? (
            <View style={styles.errorBox} accessibilityLiveRegion="polite">
              <AppIcon name="alert-circle" size={22} color={DS.colors.error} />
              <View style={styles.errorBody}>
                <Text style={styles.errorTitle}>{errorGeneral.titulo}</Text>
                <Text style={styles.errorText}>{errorGeneral.detalle}</Text>
                {errorGeneral.recuperar && (
                  <Tappable
                    onPress={() => router.push('/(auth)/recuperar')}
                    accessibilityRole="link"
                    accessibilityLabel="Recuperar mi contraseña con un código por email"
                    style={styles.errorLink}
                  >
                    <Text style={styles.errorLinkText}>Recuperar contraseña</Text>
                  </Tappable>
                )}
              </View>
            </View>
          ) : null}

          <Button label="Ingresar" onPress={handleLogin} loading={loading} />

          <Text style={styles.version}>Órbita · versión {Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  // marginTop automático: queda al pie de la pantalla aunque el formulario sea corto.
  version: { marginTop: 'auto', paddingTop: 32, textAlign: 'center', fontFamily: DS.font.medium, fontSize: 12, color: DS.colors.textTertiary },
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: DS.colors.background },
  content: { flexGrow: 1, paddingHorizontal: 28 },

  hero: { alignItems: 'center', marginBottom: 36 },
  appName: { fontFamily: DS.font.bold, fontSize: 30, letterSpacing: 0.5, color: DS.colors.text, marginTop: 12 },

  eye: { marginRight: -10 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 12, marginBottom: 18 },
  remember: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
    borderWidth: DS.border, borderColor: DS.colors.textTertiary, backgroundColor: DS.colors.surface,
  },
  checkboxOn: { backgroundColor: DS.colors.primary, borderColor: DS.colors.primary },
  rememberText: { fontFamily: DS.font.medium, fontSize: 14, color: DS.colors.textSecondary },
  forgot: { fontFamily: DS.font.semibold, fontSize: 14, color: DS.colors.accent },

  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14, padding: 14,
    borderRadius: DS.radius.control, backgroundColor: DS.colors.errorSoft,
    borderWidth: DS.border, borderColor: '#FECACA',
  },
  errorBody: { flex: 1, gap: 4 },
  errorTitle: { fontFamily: DS.font.bold, fontSize: 15, color: DS.colors.error },
  errorText: { fontFamily: DS.font.regular, fontSize: 14, lineHeight: 20, color: '#7F1D1D' },
  errorLink: { alignSelf: 'flex-start', justifyContent: 'center' },
  errorLinkText: { fontFamily: DS.font.bold, fontSize: 14, color: DS.colors.error, textDecorationLine: 'underline' },
});
