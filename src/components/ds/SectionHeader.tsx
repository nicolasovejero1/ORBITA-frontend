import { StyleSheet, Text, View } from 'react-native';
import { Tappable } from '@/components/a11y';
import { DS } from '@/constants/tokens';

/** Título de sección con, a la derecha, un link (`actionLabel`) o una nota (`note`). */
export function SectionHeader({ title, note, actionLabel, onAction }: {
  title: string; note?: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      {actionLabel && onAction ? (
        <Tappable accessibilityRole="link" accessibilityLabel={actionLabel} onPress={onAction} centrado>
          <Text style={styles.link}>{actionLabel}</Text>
        </Tappable>
      ) : note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, minHeight: 48 },
  title: { fontFamily: DS.font.bold, fontSize: 18, color: DS.colors.text },
  note: { fontFamily: DS.font.regular, fontSize: 13, color: DS.colors.textTertiary },
  link: { fontFamily: DS.font.semibold, fontSize: 14, color: DS.colors.accent },
});
