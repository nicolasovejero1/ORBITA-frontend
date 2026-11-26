import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Tappable } from '@/components/a11y';
import { DS } from '@/constants/tokens';
import { toqueSuave } from '@/utils/haptics';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
  height?: number;
  accessibilityLabel?: string;
}

export function Button({ label, onPress, variant = 'primary', loading, disabled, height = 54, accessibilityLabel }: Props) {
  const primary = variant === 'primary';
  return (
    <Tappable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ busy: !!loading }}
      onPress={() => { toqueSuave(); onPress(); }}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[styles.base, { height }, primary ? styles.primary : styles.secondary, (disabled || loading) && styles.off]}
    >
      {loading
        ? <ActivityIndicator color={primary ? DS.colors.onPrimary : DS.colors.text} />
        : <Text style={[styles.text, { color: primary ? DS.colors.onPrimary : DS.colors.text }]}>{label}</Text>}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: DS.radius.control, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  primary: { backgroundColor: DS.colors.primary },
  secondary: { backgroundColor: DS.colors.surface, borderWidth: DS.border, borderColor: DS.colors.border },
  off: { opacity: 0.6 },
  text: { fontFamily: DS.font.semibold, fontSize: 16 },
});
