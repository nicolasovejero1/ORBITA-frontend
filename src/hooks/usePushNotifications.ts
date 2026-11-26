import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { notificacionesApi } from '@/api/notificaciones';
import { useAuthStore } from '@/store/auth.store';


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function obtenerExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  // En Android 13+ el canal tiene que existir antes de pedir el permiso: si no, el diálogo no se muestra
  // y requestPermissionsAsync devuelve 'denied' sin preguntarle nada al usuario.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existente } = await Notifications.getPermissionsAsync();
  let status = existente;
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') {
    console.warn(`Push notifications: permiso no concedido (${status}). Se omite el registro del token.`);
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn(
      'Push notifications: falta extra.eas.projectId en app.json (correr `eas init`). Se omite el registro del token.',
    );
    return null;
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return token;
}

/** Pide permiso, obtiene el token de push de Expo y lo registra en el backend cuando hay sesión activa. */
export function usePushNotifications() {
  const { token: authToken, user } = useAuthStore();
  const router = useRouter();
  // Usuario para el que ya se registró el token. Se resetea al cerrar sesión para que el próximo
  // usuario que entre en el mismo dispositivo también se registre (el logout borra el token en el backend).
  const registradoPara = useRef<number | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!authToken || userId === null) {
      registradoPara.current = null;
      return;
    }
    if (registradoPara.current === userId) return;
    registradoPara.current = userId;
    obtenerExpoPushToken()
      .then((expoPushToken) => {
        if (expoPushToken) return notificacionesApi.registrarPushToken(expoPushToken);
      })
      .catch((error) => {
        console.warn('Push notifications: no se pudo registrar el token.', error);
        registradoPara.current = null;
      });
  }, [authToken, userId]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      // dismissTo no apila otra copia si la bandeja ya está abierta.
      router.dismissTo('/(app)/notificaciones' as any);
    });
    return () => sub.remove();
  }, [router]);
}
