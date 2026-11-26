import { StyleSheet, Text, View } from 'react-native';
import { DS } from '@/constants/tokens';

export type ChipTone = 'success' | 'warning' | 'accent' | 'neutral';

const TONES: Record<ChipTone, { bg: string; fg: string }> = {
  success: { bg: DS.colors.successSoft, fg: DS.colors.success },
  warning: { bg: DS.colors.warningSoft, fg: DS.colors.warning },
  accent: { bg: DS.colors.accentSoft, fg: DS.colors.accent },
  neutral: { bg: DS.colors.background, fg: DS.colors.textSecondary },
};

export function Chip({ label, tone = 'neutral' }: { label: string; tone?: ChipTone }) {
  const t = TONES[tone];
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: DS.radius.chip, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  text: { fontFamily: DS.font.semibold, fontSize: 12 },
});
