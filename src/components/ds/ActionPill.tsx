import { Ionicons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { AppIcon, Tappable } from '@/components/a11y';
import { DS } from '@/constants/tokens';
import { toqueSuave } from '@/utils/haptics';

export type PillTone = 'accent' | 'success' | 'warning' | 'danger';

const TONOS: Record<PillTone, { bg: string; fg: string }> = {
  accent: { bg: DS.colors.accentSoft, fg: DS.colors.accent },
  success: { bg: DS.colors.successSoft, fg: DS.colors.success },
  warning: { bg: DS.colors.warningSoft, fg: DS.colors.warning },
  danger: { bg: DS.colors.errorSoft, fg: DS.colors.error },
};

/**
 * Botón de acción secundaria de toda la app: ícono + texto sobre un fondo suave.
 * Se reparte el ancho con las demás píldoras de su fila (`flex: 1`).
 */
export function ActionPill({ label, icon, onPress, tone = 'accent', accessibilityLabel, disabled, style }: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tone?: PillTone;
  accessibilityLabel?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = TONOS[tone];
  return (
    <Tappable
      centrado
      onPress={() => { toqueSuave(); onPress(); }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.pill, { backgroundColor: t.bg }, disabled && styles.off, style]}
    >
      <AppIcon name={icon} size={18} color={t.fg} />
      <Text style={[styles.texto, { color: t.fg }]} numberOfLines={1}>{label}</Text>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  pill: { flex: 1, flexDirection: 'row', gap: 8, minHeight: 46, borderRadius: DS.radius.control, paddingHorizontal: 10 },
  texto: { fontFamily: DS.font.semibold, fontSize: 14, flexShrink: 1 },
  off: { opacity: 0.5 },
});
