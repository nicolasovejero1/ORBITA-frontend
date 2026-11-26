import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { normalizarUbicacion } from '@/api/ubicaciones';
import { usuariosApi } from '@/api/usuarios';
import { BASE_URL } from '@/constants/api';
import { useAuthStore } from '@/store/auth.store';
import { Ubicacion } from '@/types/ubicacion.types';

export type EstadoEnVivo = 'conectando' | 'en-vivo' | 'reconectando' | 'sin-conexion';

const ESPERA_MAXIMA_MS = 30_000;

/**
 * Recibe por socket cada ubicación nueva del PCD mientras la pantalla está
 * abierta (el PCD las manda por HTTP; el backend las reparte por acá).
 *
 * Si se corta (sin red, servidor dormido, token vencido) reintenta solo, cada
 * vez más espaciado, renovando antes el token. Mientras tanto la pantalla sigue
 * funcionando con "Actualizar" y la consulta cada 60 segundos.
 */
export function useUbicacionEnVivo(
  pcdId: number | null,
  onNueva: (ubicacion: Ubicacion) => void,
  onRevocado?: () => void,
): EstadoEnVivo {
  const [estado, setEstado] = useState<EstadoEnVivo>('conectando');
  const onNuevaRef = useRef(onNueva);
  const onRevocadoRef = useRef(onRevocado);
  useEffect(() => {
    onNuevaRef.current = onNueva;
    onRevocadoRef.current = onRevocado;
  });

  useEffect(() => {
    if (pcdId == null) return;
    let vigente = true;
    let socket: Socket | null = null;
    let reintento: ReturnType<typeof setTimeout> | undefined;
    let intentos = 0;

    const reprogramar = () => {
      if (!vigente) return;
      socket?.close();
      setEstado('reconectando');
      const espera = Math.min(1000 * 2 ** intentos, ESPERA_MAXIMA_MS);
      intentos += 1;
      reintento = setTimeout(async () => {
        // Cualquier pedido autenticado renueva el token si venció.
        await usuariosApi.getMe().catch(() => {});
        if (vigente) conectar();
      }, espera);
    };

    const conectar = () => {
      const token = useAuthStore.getState().token;
      if (!token) {
        setEstado('sin-conexion');
        return;
      }
      socket = io(`${BASE_URL}/ubicaciones`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: false,
      });
      socket.on('connect', () => {
        socket?.emit('suscribir', { pcdId }, (res: { ok: boolean; error?: string }) => {
          if (!vigente) return;
          if (res?.ok) {
            intentos = 0;
            setEstado('en-vivo');
          } else if (res?.error === 'sin-acceso') {
            // El PCD no lo compartió: no hay nada que esperar.
            socket?.close();
            setEstado('sin-conexion');
          } else {
            reprogramar();
          }
        });
      });
      socket.on('ubicacion:nueva', (raw) => onNuevaRef.current(normalizarUbicacion(raw)));
      socket.on('acceso:revocado', () => {
        socket?.close();
        setEstado('sin-conexion');
        onRevocadoRef.current?.();
      });
      socket.on('connect_error', reprogramar);
      // Lo corta el servidor cuando vence el token, o se cae la red.
      socket.on('disconnect', (motivo) => {
        if (motivo !== 'io client disconnect') reprogramar();
      });
    };

    setEstado('conectando');
    conectar();
    return () => {
      vigente = false;
      clearTimeout(reintento);
      socket?.close();
    };
  }, [pcdId]);

  return estado;
}
