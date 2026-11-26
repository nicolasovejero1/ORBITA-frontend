import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { PaperProvider } from 'react-native-paper';
import { Slot, useRouter, useSegments } from 'expo-router';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GlobalToast } from '@/components/GlobalToast';
import { useAuthStore } from '@/store/auth.store';
import { AppTheme } from '@/constants/theme';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useUbicacionAutomatica } from '@/hooks/useUbicacionAutomatica';
// Registra la tarea de ubicación en segundo plano al cargar la app (tiene que estar en el alcance global).
import '@/tasks/ubicacion-automatica';

// El splash (logo sobre fondo blanco) queda a la vista hasta tener las fuentes y la sesión restaurada.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const { token, isHydrated } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  usePushNotifications();
  useUbicacionAutomatica();

  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!token && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [token, isHydrated, segments, router]);

  const listo = (fontsLoaded || !!fontError) && isHydrated;
  useEffect(() => {
    if (listo) SplashScreen.hideAsync().catch(() => {});
  }, [listo]);

  // Si la fuente falla, se sigue con la del sistema en vez de dejar la app en blanco.
  if (!fontsLoaded && !fontError) return null;

  return (
    <PaperProvider theme={AppTheme}>
      <Head>
        <title>Órbita</title>
      </Head>
      <Slot />
      <GlobalToast />
    </PaperProvider>
  );
}
