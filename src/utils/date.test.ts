import { parseFechaLocal, formatFechaLocal } from './date';

describe('parseFechaLocal', () => {
  it('conserva el día exacto sin corrimiento por UTC', () => {
    const d = parseFechaLocal('2026-01-01');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });

  it('ignora la parte de horario si el string trae timestamp', () => {
    const d = parseFechaLocal('2026-03-15T00:00:00.000Z');
    expect(d.getDate()).toBe(15);
  });
});

describe('formatFechaLocal', () => {
  it('no cambia de día en husos horarios negativos (regresión: new Date(YYYY-MM-DD) corría un día para atrás)', () => {
    // new Date('2026-01-01') interpreta la fecha como medianoche UTC; en cualquier
    // huso horario negativo (América) eso cae en el 31/12 del año anterior al
    // formatearlo en horario local. parseFechaLocal/formatFechaLocal deben evitarlo.
    const conBug = new Date('2026-01-01').getDate();
    const sinBug = parseFechaLocal('2026-01-01').getDate();
    expect(sinBug).toBe(1);
    if (new Date().getTimezoneOffset() > 0) {
      // Solo en husos horarios negativos (offset > 0 en JS) se manifiesta el bug.
      expect(conBug).not.toBe(sinBug);
    }
  });

  it('formatea con las opciones dadas', () => {
    const texto = formatFechaLocal('2026-09-24', { day: '2-digit', month: '2-digit', year: 'numeric' });
    expect(texto).toBe('24/09/2026');
  });
});
