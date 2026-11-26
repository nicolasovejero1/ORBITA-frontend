import { COLORS } from './theme';

function luminancia(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

// WCAG 2.2 AA: 4,5:1 para texto (1.4.3) y 3:1 para componentes (1.4.11).
describe('contraste del tema', () => {
  const texto: [string, string, string][] = [
    ['textPrimary', COLORS.textPrimary, COLORS.surface],
    ['textPrimary', COLORS.textPrimary, COLORS.background],
    ['textSecondary', COLORS.textSecondary, COLORS.surface],
    ['textSecondary', COLORS.textSecondary, COLORS.background],
    ['textMuted', COLORS.textMuted, COLORS.surface],
    ['textMuted', COLORS.textMuted, COLORS.background],
    ['error', COLORS.error, COLORS.surface],
    ['error', COLORS.error, COLORS.background],
    ['success', COLORS.success, COLORS.surface],
    ['primary', COLORS.primary, COLORS.surface],
    ['white', COLORS.white, COLORS.primary],
    ['onWarning', COLORS.onWarning, COLORS.warning],
  ];

  it.each(texto)('%s sobre su fondo llega a 4,5:1', (_n, fg, bg) => {
    expect(contraste(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('el borde de los campos llega a 3:1 sobre blanco', () => {
    expect(contraste(COLORS.borderInput, COLORS.surface)).toBeGreaterThanOrEqual(3);
  });
});
