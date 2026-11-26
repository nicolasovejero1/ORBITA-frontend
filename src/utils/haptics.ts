import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// En la web no hay vibración; en el celular, cualquier falla (equipo sin motor, ahorro de energía) se ignora.
const disponible = Platform.OS === 'ios' || Platform.OS === 'android';

function seguro(accion: () => Promise<void>) {
  if (!disponible) return;
  try {
    accion().catch(() => {});
  } catch {
    // sin vibración: no pasa nada
  }
}

/** Toque leve: al apretar un botón importante. */
export const toqueSuave = () => seguro(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

/** Confirmación: algo salió bien (sesión confirmada, reporte creado). */
export const vibrarExito = () => seguro(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

/** Aviso de error: algo no se pudo hacer. */
export const vibrarError = () => seguro(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
