import { buscar, MAX_RESULTADOS } from './search';

const nombres = (n: number) => Array.from({ length: n }, (_, i) => `Persona ${i}`);

describe('buscar', () => {
  it('no muestra nada hasta escribir la cantidad mínima de letras', () => {
    const r = buscar(['Ana', 'Juan'], 'a', (x) => x);
    expect(r).toEqual({ visibles: [], hayMas: false, faltanLetras: true });
  });

  it('ignora mayúsculas y acentos', () => {
    const r = buscar(['José Pérez', 'Ana López'], 'jose pe', (x) => x);
    expect(r.visibles).toEqual(['José Pérez']);
  });

  it(`corta en ${MAX_RESULTADOS} resultados y avisa que hay más`, () => {
    const r = buscar(nombres(20), 'persona', (x) => x);
    expect(r.visibles).toHaveLength(MAX_RESULTADOS);
    expect(r.hayMas).toBe(true);
  });

  it('con minLetras = 0 muestra los primeros sin escribir nada', () => {
    const r = buscar(nombres(3), '', (x) => x, 0);
    expect(r.visibles).toHaveLength(3);
    expect(r.hayMas).toBe(false);
    expect(r.faltanLetras).toBe(false);
  });
});
