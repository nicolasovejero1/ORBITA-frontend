import { Ubicacion } from '@/types/ubicacion.types';
import { agruparEstadias, distanciaMetros, formatearDuracion } from './recorrido';

const reg = (id: number, hora: string, latitud: number, longitud: number): Ubicacion => ({
  id, pcdId: 1, latitud, longitud, fechaHora: `2026-11-05T${hora}:00.000Z`,
});

describe('distanciaMetros', () => {
  it('da 0 para el mismo punto', () => {
    expect(distanciaMetros(-34.6, -58.4, -34.6, -58.4)).toBe(0);
  });

  it('calcula unos 111 m por cada 0,001° de latitud', () => {
    expect(distanciaMetros(-34.6, -58.4, -34.601, -58.4)).toBeGreaterThan(105);
    expect(distanciaMetros(-34.6, -58.4, -34.601, -58.4)).toBeLessThan(115);
  });
});

describe('agruparEstadias', () => {
  it('junta registros cercanos en un solo tramo, de más nuevo a más viejo', () => {
    // La API los manda de más nuevo a más viejo.
    const registros = [
      reg(4, '12:00', -34.7, -58.5),
      reg(3, '11:00', -34.6, -58.4),
      reg(2, '10:30', -34.60001, -58.40001),
      reg(1, '10:00', -34.6, -58.4),
    ];
    const tramos = agruparEstadias(registros);
    expect(tramos).toHaveLength(2);
    expect(tramos[0]).toMatchObject({ id: 4, registros: 1 });
    expect(tramos[1]).toMatchObject({
      id: 1, registros: 3,
      desde: '2026-11-05T10:00:00.000Z', hasta: '2026-11-05T11:00:00.000Z',
    });
  });

  it('separa dos tramos en el mismo lugar si en el medio estuvo en otro', () => {
    const tramos = agruparEstadias([
      reg(3, '12:00', -34.6, -58.4),
      reg(2, '11:00', -34.7, -58.5),
      reg(1, '10:00', -34.6, -58.4),
    ]);
    expect(tramos).toHaveLength(3);
  });

  it('sin registros no hay tramos', () => {
    expect(agruparEstadias([])).toEqual([]);
  });
});

describe('formatearDuracion', () => {
  it('vacío si fue un solo registro', () => {
    expect(formatearDuracion('2026-11-05T10:00:00.000Z', '2026-11-05T10:00:00.000Z')).toBe('');
  });

  it('minutos, horas exactas y horas con minutos', () => {
    expect(formatearDuracion('2026-11-05T10:00:00.000Z', '2026-11-05T10:45:00.000Z')).toBe('45 min');
    expect(formatearDuracion('2026-11-05T10:00:00.000Z', '2026-11-05T11:00:00.000Z')).toBe('1 h');
    expect(formatearDuracion('2026-11-05T10:00:00.000Z', '2026-11-05T11:15:00.000Z')).toBe('1 h 15 min');
  });
});
