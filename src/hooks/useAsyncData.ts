import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook de carga de datos asíncronos.
 * Inicializa `loading = true` y nunca setea estado de forma síncrona dentro del
 * efecto (evita avisos de `react-hooks/set-state-in-effect` de React 19).
 *
 * - El efecto se ejecuta al montar y cada vez que cambia la identidad de `loader`.
 *   Para recargar por dependencias, el caller debe memoizar el loader con
 *   `useCallback` (ej. `useCallback(() => api.getAll(filtro), [filtro])`).
 * - Expone `reload()` para recargas manuales (pull-to-refresh, foco, reintentar) y
 *   `refrescarSilencioso()`, que recarga sin mostrar el esqueleto (ver `useRecargarAlEnfocar`).
 */
export function useAsyncData<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const activeRef = useRef(true);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const load = useCallback(async () => {
    try {
      const result = await loaderRef.current();
      if (!activeRef.current) return;
      setData(result);
      setError('');
    } catch {
      if (activeRef.current) setError('No se pudieron cargar los datos');
    } finally {
      if (activeRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    activeRef.current = true;
    void load();
    return () => {
      activeRef.current = false;
    };
  }, [load, loader]);

  const reload = useCallback(() => {
    setLoading(true);
    setError('');
    return load();
  }, [load]);

  return { data, loading, error, reload, setData, refrescarSilencioso: load };
}

/** Recarga en segundo plano al volver a la pantalla (no la primera vez: ya carga al montar). */
export function useRecargarAlEnfocar(recargar: () => unknown) {
  const primera = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primera.current) {
        primera.current = false;
        return;
      }
      void recargar();
    }, [recargar]),
  );
}
