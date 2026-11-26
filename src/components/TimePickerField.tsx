import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { DS } from '@/constants/tokens';
import { AppIcon, Tappable } from '@/components/a11y';

const HORARIOS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});
const ITEM_HEIGHT = 48;

/** Índice del horario igual o anterior más cercano a `hora` ("HH:mm" o "HH:mm:ss"). */
function indiceDe(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  if (Number.isNaN(h)) return 0;
  return Math.min(HORARIOS.length - 1, h * 2 + ((m ?? 0) >= 30 ? 1 : 0));
}

/** Selector de hora ("HH:mm") en pasos de 30 minutos — no hay librería de time-picker
 * nativo instalada, y agregar una implicaría una nueva build nativa. */
export function TimePickerField({ label, value, onChange, optional = true }: {
  label: string;
  value: string;
  onChange: (hora: string) => void;
  optional?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // El backend guarda la hora como TIME y puede devolver "HH:mm:ss": se muestra y compara como "HH:mm".
  const actual = value ? value.slice(0, 5) : '';

  return (
    <View style={styles.wrap}>
      <Text style={styles.label} accessible={false}>{label}</Text>
      <View style={styles.row}>
        <Tappable
          style={styles.btn}
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${actual || 'sin seleccionar'}`}
          accessibilityHint="Abre la lista de horarios"
        >
          <AppIcon name="time-outline" size={18} color={COLORS.textMuted} />
          <Text style={[styles.btnText, !value && styles.placeholder]}>
            {actual || 'Seleccionar hora...'}
          </Text>
        </Tappable>
        {optional && value && (
          <Tappable centrado onPress={() => onChange('')} accessibilityRole="button" accessibilityLabel={`Quitar ${label.toLowerCase()}`}>
            <AppIcon name="close-circle" size={18} color={COLORS.textMuted} />
          </Tappable>
        )}
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} accessible={false} onPress={() => setOpen(false)}>
          <Pressable style={styles.card} accessible={false} accessibilityViewIsModal onPress={() => {}}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} accessibilityRole="header">{label}</Text>
              <Tappable centrado onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Cerrar lista de horarios">
                <AppIcon name="close" size={22} color={COLORS.textSecondary} />
              </Tappable>
            </View>
            <FlatList
              data={HORARIOS}
              keyExtractor={(h) => h}
              style={styles.list}
              // Abre posicionado en la hora elegida (o en las 08:00 si no hay ninguna), no en las 00:00.
              initialScrollIndex={Math.max(0, indiceDe(actual || '08:00') - 2)}
              getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
              renderItem={({ item }) => (
                <Tappable
                  style={[styles.item, actual === item && styles.itemActive]}
                  onPress={() => { onChange(item); setOpen(false); }}
                  accessibilityRole="radio"
                  accessibilityLabel={item}
                  selected={actual === item}
                >
                  <Text style={[styles.itemText, actual === item && styles.itemTextActive]}>{item}</Text>
                  {actual === item && <AppIcon name="checkmark" size={16} color={COLORS.primary} />}
                </Tappable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: SIZES.xs },
  label: { fontFamily: DS.font.medium, fontSize: 13, color: DS.colors.textSecondary, marginBottom: 6, marginLeft: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
    backgroundColor: '#FFFFFF', borderRadius: DS.radius.control, padding: SIZES.md,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  btnText: { ...FONTS.body, color: '#0F172A' },
  placeholder: { color: COLORS.textMuted },
  overlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: SIZES.lg,
  },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: DS.radius.featured, padding: SIZES.md,
    borderWidth: DS.border, borderColor: DS.colors.border,
    width: '100%', maxWidth: 320, maxHeight: 420,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SIZES.xs, paddingHorizontal: SIZES.xs,
  },
  cardTitle: { ...FONTS.h5, color: '#0F172A', fontWeight: '700' },
  list: { maxHeight: 340 },
  item: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: ITEM_HEIGHT, paddingHorizontal: SIZES.md,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  itemActive: { backgroundColor: '#EEF2FF' },
  itemText: { ...FONTS.body, color: '#0F172A' },
  itemTextActive: { color: COLORS.primary, fontWeight: '700' },
});
