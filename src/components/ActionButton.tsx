import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, ViewStyle } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { AppIcon, Tappable } from '@/components/a11y';

type Variant = 'primary' | 'secondary' | 'danger';

/**
 * Botón de acción de las pantallas de detalle. Sigue WCAG 2.1 AA:
 * contraste de al menos 4.5:1, área táctil de 52 dp (mínimo 48) y texto de
 * 16 px. La jerarquía la da la forma, no solo el color:
 * - primary: relleno, la acción principal (una por pantalla).
 * - secondary: con borde, el resto de las acciones.
 * - danger: con borde rojo, para borrar; va separado y al final.
 */
export function ActionButton({ label, icon, onPress, variant = 'secondary', disabled = false, style }: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const v = VARIANTS[variant];
  return (
    <Tappable
      style={[styles.btn, v.btn, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <AppIcon name={icon} size={20} color={v.color} />
      <Text style={[styles.text, { color: v.color }]}>{label}</Text>
    </Tappable>
  );
}

const VARIANTS: Record<Variant, { btn: ViewStyle; color: string }> = {
  primary: { btn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary }, color: COLORS.white },
  secondary: { btn: { backgroundColor: COLORS.white, borderColor: COLORS.primary }, color: COLORS.primary },
  danger: { btn: { backgroundColor: '#FDECEC', borderColor: '#D03B3B', borderWidth: 2 }, color: '#B71C1C' },
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SIZES.sm, minHeight: 52, paddingHorizontal: SIZES.md,
    borderRadius: 14, borderWidth: 1.5, marginBottom: SIZES.sm,
  },
  text: { ...FONTS.bodyBold, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
