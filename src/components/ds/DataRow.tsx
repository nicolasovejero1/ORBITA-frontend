import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '@/components/a11y';
import { DS } from '@/constants/tokens';

export type DataTone = 'indigo' | 'teal' | 'rosa' | 'ambar';

const TONOS: Record<DataTone, { bg: string; fg: string }> = {
  indigo: { bg: '#EEF2FF', fg: '#4338CA' },
  teal: { bg: '#CCFBF1', fg: '#0F766E' },
  rosa: { bg: '#FCE7F3', fg: '#BE185D' },
  ambar: { bg: '#FEF3C7', fg: '#B45309' },
};

/** Fila de dato (etiqueta + valor) con un ícono de color. No se muestra si no hay valor. */
export function DataRow({ icon, tone, label, value, last }: {
  icon: keyof typeof Ionicons.glyphMap; tone: DataTone; label: string; value?: string | null; last?: boolean;
}) {
  if (!value) return null;
  const t = TONOS[tone];
  return (
    <View style={[styles.fila, !last && styles.borde]}>
      <View style={[styles.icono, { backgroundColor: t.bg }]}>
        <AppIcon name={icon} size={20} color={t.fg} />
      </View>
      <View style={styles.texto}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.valor}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, minHeight: 64 },
  borde: { borderBottomWidth: DS.border, borderBottomColor: DS.colors.border },
  icono: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  texto: { flex: 1 },
  label: { fontFamily: DS.font.medium, fontSize: 12, color: DS.colors.textTertiary },
  valor: { fontFamily: DS.font.semibold, fontSize: 15, lineHeight: 21, color: DS.colors.text },
});
