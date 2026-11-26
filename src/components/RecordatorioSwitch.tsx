import { StyleSheet, Text, View } from 'react-native';
import { Switch } from 'react-native-paper';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { DS } from '@/constants/tokens';
import { AppIcon } from '@/components/a11y';

/**
 * Interruptor "Enviar recordatorio" de crear y editar actividad. El campo de
 * minutos se muestra solo con el interruptor encendido (lo dibuja cada
 * formulario debajo de este componente).
 */
export function RecordatorioSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <AppIcon name="alarm-outline" size={20} color={COLORS.primary} />
      <View style={styles.texts}>
        <Text style={styles.title}>Enviar recordatorio</Text>
        <Text style={styles.desc}>Avisa antes del horario de inicio de cada sesión</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        color={COLORS.primary}
        accessibilityLabel="Enviar recordatorio antes de cada sesión"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    backgroundColor: '#FFFFFF', borderRadius: DS.radius.control, padding: SIZES.md,
    borderWidth: DS.border, borderColor: DS.colors.border, marginBottom: SIZES.sm,
  },
  texts: { flex: 1 },
  title: { ...FONTS.bodyBold, color: '#0F172A', fontWeight: '700' },
  desc: { ...FONTS.caption, color: '#475569', marginTop: 2 },
});
