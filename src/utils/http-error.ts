/**
 * El backend devuelve errores como { statusCode, message, error, timestamp, path },
 * donde `message` puede ser un string o un arreglo de mensajes de validación
 * (class-validator). Antes de esto, cada pantalla parseaba `e?.response?.data?.message`
 * a mano y solo login/ubicaciones distinguían algún status particular (429/403/404);
 * el resto caía siempre al mismo mensaje genérico sin importar el código HTTP.
 */
export function getErrorMessage(error: any, fallback = 'Ocurrió un error inesperado'): string {
  if (!error?.response) {
    return 'No se pudo conectar con el servidor. Revisá tu conexión.';
  }

  const { status, data } = error.response;

  switch (status) {
    case 403:
      return 'No tenés permiso para realizar esta acción.';
    case 404:
      return 'No se encontró el recurso solicitado.';
    case 413:
      return 'El archivo es demasiado grande.';
    case 429:
      return 'Demasiados intentos. Esperá un minuto e intentá de nuevo.';
    default: {
      const msg = data?.message;
      if (Array.isArray(msg)) return msg.join('\n');
      if (typeof msg === 'string' && msg.trim()) return msg;
      return fallback;
    }
  }
}
