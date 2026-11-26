import { create } from 'zustand';
import type { ToastType } from '@/components/Toast';

interface ToastState {
  message: string | null;
  type: ToastType;
  show: (message: string, type?: ToastType) => void;
  hide: () => void;
}

/**
 * Aviso global, para mensajes que tienen que sobrevivir a un cambio de
 * pantalla (por ejemplo "Actividad eliminada" después de volver a la lista).
 * Por defecto es de error, que es como lo usa el cliente HTTP.
 */
export const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: 'error',
  show: (message, type = 'error') => set({ message, type }),
  hide: () => set({ message: null }),
}));
