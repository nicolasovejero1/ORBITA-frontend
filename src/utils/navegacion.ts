import type { useRouter } from 'expo-router';

type AppRouter = ReturnType<typeof useRouter>;

/**
 * "Volver" real: retrocede en la pila. `router.navigate(lista)` apilaba una copia
 * de la lista encima del detalle, y su flecha volvía al detalle (bucle sin llegar
 * al inicio). Si no hay a dónde volver (se abrió la pantalla directo, por ejemplo
 * desde una notificación) se reemplaza por `destinoSiNoHay`.
 */
export function volver(router: AppRouter, destinoSiNoHay: string) {
  if (router.canGoBack()) router.back();
  else router.replace(destinoSiNoHay as any);
}

/**
 * Cambio de sección desde la barra inferior o la campana: deja la pila en
 * [Inicio, destino], así la flecha de cualquier sección vuelve siempre al inicio.
 * Si ya se está en el destino no hace nada.
 */
export function irASeccion(router: AppRouter, pathname: string, destino: string) {
  const limpio = destino.replace('/(app)', '') || '/';
  const estaEn = limpio === '/' ? pathname === '/' : pathname === limpio;
  if (estaEn) return;
  if (router.canDismiss()) router.dismissAll();
  if (limpio !== '/') router.push(destino as any);
}
