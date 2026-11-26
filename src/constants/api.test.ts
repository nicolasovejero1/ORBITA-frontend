import { Platform } from 'react-native';

describe('getBaseUrl', () => {
  const originalEnv = process.env.EXPO_PUBLIC_API_URL;
  const originalPlatform = Platform.OS;
  const originalDev = (globalThis as any).__DEV__;

  afterEach(() => {
    process.env.EXPO_PUBLIC_API_URL = originalEnv;
    Platform.OS = originalPlatform;
    (globalThis as any).__DEV__ = originalDev;
    jest.resetModules();
  });

  it('usa EXPO_PUBLIC_API_URL cuando está definida, sin importar la plataforma', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://mi-backend:9999';
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- necesita re-importar tras jest.resetModules() para releer process.env
    const { getBaseUrl } = require('./api');
    expect(getBaseUrl()).toBe('http://mi-backend:9999');
  });

  it('sin variable de entorno apunta al backend local, y al 10.0.2.2 en el emulador de Android en desarrollo', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- necesita re-importar tras jest.resetModules() para releer process.env
    const { getBaseUrl } = require('./api');

    (globalThis as any).__DEV__ = true;
    Platform.OS = 'ios';
    expect(getBaseUrl()).toBe('http://localhost:3000');

    Platform.OS = 'web';
    expect(getBaseUrl()).toBe('http://localhost:3000');

    Platform.OS = 'android';
    expect(getBaseUrl()).toBe('http://10.0.2.2:3000');

    (globalThis as any).__DEV__ = false;
    expect(getBaseUrl()).toBe('http://localhost:3000');
  });
});
