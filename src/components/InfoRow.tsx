import { StyleSheet, Text, View } from 'react-native';
import { FONTS, SIZES } from '@/constants/theme';

/**
 * Dato de una pantalla de detalle: la etiqueta arriba y el valor abajo, en una
 * sola columna y alineados a la izquierda. Con dos columnas los textos largos
 * (descripciones, observaciones) quedaban apretados y se leían mal, sobre todo
 * con la letra agrandada desde el sistema.
 */
export function InfoRow({ label, value, last = false }: { label: string; value?: string | null; last?: boolean }) {
  if (!value) return null;
  return (
    <View style={[styles.row, last && styles.last]} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: SIZES.md, paddingVertical: 12, gap: 2,
    borderBottomWidth: 1, borderBottomColor: '#EEF1F7',
  },
  last: { borderBottomWidth: 0 },
  label: { ...FONTS.caption, color: '#556274', fontWeight: '600' },
  value: { ...FONTS.body, color: '#0F172A' },
});
