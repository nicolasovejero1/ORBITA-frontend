import { configureFonts, MD3LightTheme } from 'react-native-paper';

export const COLORS = {
  primary: '#1F2937',
  primaryDark: '#111827',
  primaryLight: '#374151',
  secondary: '#6366F1',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceBorder: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  // Único tono para texto secundario/atenuado, placeholders e iconos informativos (contraste AA sobre blanco y sobre el fondo).
  textMuted: '#556274',
  // Borde de campos, selectores y casillas: 3,13:1 sobre blanco (WCAG 1.4.11 pide 3:1).
  borderInput: '#8190A5',
  // Texto sobre fondos warning (6,01:1).
  onWarning: '#111827',
  // #C62828 en vez de #EF5350: el anterior daba 3.2:1 de contraste y WCAG AA pide 4.5:1.
  error: '#C62828',
  warning: '#F59E0B',
  success: '#0F766E',
  white: '#FFFFFF',
};

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONTS = {
  h2: { fontFamily: 'Inter_700Bold', fontSize: 28, lineHeight: 36 },
  h3: { fontFamily: 'Inter_600SemiBold', fontSize: 24, lineHeight: 32 },
  h4: { fontFamily: 'Inter_600SemiBold', fontSize: 20, lineHeight: 28 },
  h5: { fontFamily: 'Inter_600SemiBold', fontSize: 18, lineHeight: 24 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24 },
  bodyBold: { fontFamily: 'Inter_600SemiBold', fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20 },
  small: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16 },
};

export const AppTheme = {
  ...MD3LightTheme,
  roundness: 3.5,
  fonts: configureFonts({ config: { fontFamily: 'Inter_400Regular' } }),
  colors: {
    ...MD3LightTheme.colors,
    // Índigo de foco: es el color del borde de un campo de texto mientras se escribe.
    primary: '#6366F1',
    secondary: COLORS.secondary,
    background: COLORS.background,
    surface: COLORS.surface,
    error: COLORS.error,
    // MD3LightTheme trae "outline" gris oscuro (#79747E) por default — se nota
    // en cualquier TextInput mode="outlined" sin foco, que no combinaba con
    // la paleta clara (surfaceBorder, ahora borderInput en campos) usada en el resto de los inputs custom.
    outline: COLORS.surfaceBorder,
    outlineVariant: COLORS.surfaceBorder,
    onSurfaceVariant: COLORS.textMuted,
  },
};
