/** Cantidad máxima de resultados que se muestran en un buscador desplegable. */
export const MAX_RESULTADOS = 8;
/** Letras que hay que escribir antes de mostrar resultados. */
export const MIN_LETRAS_BUSQUEDA = 2;

/**
 * Filtra una lista por texto (sin distinguir mayúsculas ni acentos) y la corta
 * en MAX_RESULTADOS, para que los desplegables no crezcan sin límite.
 * `hayMas` indica que quedaron resultados afuera y conviene afinar la búsqueda.
 */
export function buscar<T>(
  items: T[],
  texto: string,
  getLabel: (item: T) => string,
  minLetras = MIN_LETRAS_BUSQUEDA,
): { visibles: T[]; hayMas: boolean; faltanLetras: boolean } {
  const q = normalizar(texto.trim());
  if (q.length < minLetras) return { visibles: [], hayMas: false, faltanLetras: true };
  const encontrados = items.filter((i) => normalizar(getLabel(i)).includes(q));
  return {
    visibles: encontrados.slice(0, MAX_RESULTADOS),
    hayMas: encontrados.length > MAX_RESULTADOS,
    faltanLetras: false,
  };
}

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
