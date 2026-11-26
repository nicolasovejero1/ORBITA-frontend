import { getErrorMessage } from './http-error';

describe('getErrorMessage', () => {
  it('devuelve el mensaje de conexión cuando no hay response', () => {
    expect(getErrorMessage({})).toBe('No se pudo conectar con el servidor. Revisá tu conexión.');
  });

  it('usa un mensaje fijo para 403/404/413/429', () => {
    expect(getErrorMessage({ response: { status: 403, data: {} } })).toMatch(/permiso/);
    expect(getErrorMessage({ response: { status: 404, data: {} } })).toMatch(/no se encontró/i);
    expect(getErrorMessage({ response: { status: 413, data: {} } })).toMatch(/grande/);
    expect(getErrorMessage({ response: { status: 429, data: {} } })).toMatch(/Demasiados intentos/);
  });

  it('junta el arreglo de validación de un 400 en un solo string', () => {
    const msg = getErrorMessage({
      response: { status: 400, data: { message: ['El título es requerido', 'La fecha es inválida'] } },
    });
    expect(msg).toBe('El título es requerido\nLa fecha es inválida');
  });

  it('usa el mensaje string del backend para un 409', () => {
    const msg = getErrorMessage({
      response: { status: 409, data: { message: 'El reporte ya está finalizado' } },
    });
    expect(msg).toBe('El reporte ya está finalizado');
  });

  it('cae al fallback si no hay message en el body', () => {
    expect(getErrorMessage({ response: { status: 500, data: {} } }, 'No se pudo guardar')).toBe('No se pudo guardar');
  });
});
