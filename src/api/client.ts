import axios, { AxiosRequestConfig } from 'axios';
import { BASE_URL } from '../constants/api';
import { useAuthStore } from '../store/auth.store';
import { useToastStore } from '../store/toast.store';
import { RefreshResponse } from '../types/auth.types';

// eslint-disable-next-line import/no-named-as-default-member -- axios.create es un método real del default export, falso positivo conocido de esta regla con axios
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type RetriableConfig = AxiosRequestConfig & { _retry?: boolean };

// Instancia sin interceptores: evita que un 401 al rotar el refresh token
// dispare este mismo flujo de refresh de nuevo (recursión).
// eslint-disable-next-line import/no-named-as-default-member -- ver comentario de apiClient
const rawClient = axios.create({ baseURL: BASE_URL, timeout: 10000 });

// Único refresh en curso compartido entre todas las solicitudes que caen en
// 401 al mismo tiempo, para no disparar una rotación por request.
let refreshPromise: Promise<string> | null = null;

function refrescarSesion(): Promise<string> {
  if (!refreshPromise) {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      return Promise.reject(new Error('No hay refresh token'));
    }
    refreshPromise = rawClient
      .post<RefreshResponse>('/auth/refresh', { refreshToken })
      .then(({ data }) => {
        useAuthStore.getState().setTokens(data.access_token, data.refresh_token);
        return data.access_token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response) {
      useToastStore.getState().show('No se pudo conectar con el servidor. Revisá tu conexión.');
      return Promise.reject(error);
    }

    const config: RetriableConfig | undefined = error.config;
    const esRefresh = config?.url?.includes('/auth/refresh');

    if (error.response.status === 401 && config && !config._retry && !esRefresh) {
      config._retry = true;
      try {
        const nuevoToken = await refrescarSesion();
        config.headers = { ...config.headers, Authorization: `Bearer ${nuevoToken}` };
        return apiClient(config);
      } catch {
        const habiaSesion = !!useAuthStore.getState().token;
        useAuthStore.getState().logout();
        if (habiaSesion) {
          useToastStore.getState().show('Tu sesión expiró. Iniciá sesión de nuevo.');
        }
        return Promise.reject(error);
      }
    }

    if (error.response.status === 401) {
      const habiaSesion = !!useAuthStore.getState().token;
      useAuthStore.getState().logout();
      if (habiaSesion) {
        useToastStore.getState().show('Tu sesión expiró. Iniciá sesión de nuevo.');
      }
    }

    return Promise.reject(error);
  },
);
