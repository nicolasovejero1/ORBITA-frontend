import { Platform } from 'react-native';

// Backend local, el valor por defecto. Los builds (APK) definen EXPO_PUBLIC_API_URL en eas.json
// y apuntan al backend desplegado.
const URL_LOCAL = 'http://localhost:3000';

export const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  // El emulador de Android no ve el localhost de la PC: usa la IP especial 10.0.2.2.
  if (__DEV__ && Platform.OS === 'android') return 'http://10.0.2.2:3000';

  return URL_LOCAL;
};

export const BASE_URL = getBaseUrl();
