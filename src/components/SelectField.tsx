import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { DS } from '@/constants/tokens';
import { AppIcon, Tappable } from '@/components/a11y';

/** Dropdown simple para elegir de una lista fija de opciones (texto). */
export function SelectField({ label, value, options, onSelect, placeholder = 'Seleccionar...' }: {
  label: string;
  value: string;
  options: readonly string[];
  onSelect: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label} accessible={false}>{label}</Text>
      <Tappable
        style={styles.btn}
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value || 'sin seleccionar'}`}
        accessibilityHint="Abre la lista de opciones"
        expanded={open}
      >
        <Text style={[styles.btnText, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <AppIcon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
      </Tappable>
      {open && (
        <View style={styles.dropdown}>
          <ScrollView style={styles.dropdownScroll} keyboardShouldPersistTaps="handled">
            {options.map((opt) => (
              <Tappable
                key={opt}
                style={[styles.dropdownItem, value === opt && styles.dropdownItemActive]}
                onPress={() => { onSelect(opt); setOpen(false); }}
                accessibilityRole="radio"
                accessibilityLabel={opt}
                selected={value === opt}
              >
                <Text style={styles.dropdownItemText}>{opt}</Text>
                {value === opt && <AppIcon name="checkmark" size={16} color={COLORS.primary} />}
              </Tappable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: SIZES.xs },
  label: { fontFamily: DS.font.medium, fontSize: 13, color: DS.colors.textSecondary, marginBottom: 6, marginLeft: 2 },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: DS.radius.control, padding: SIZES.md,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  btnText: { ...FONTS.body, color: '#0F172A', flex: 1 },
  placeholder: { color: COLORS.textMuted },
  dropdown: {
    backgroundColor: '#FFFFFF', borderRadius: DS.radius.card, marginTop: 4,
    borderWidth: DS.border, borderColor: DS.colors.border, overflow: 'hidden',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
  },
  dropdownScroll: { maxHeight: 220 },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SIZES.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: { backgroundColor: '#EEF2FF' },
  dropdownItemText: { ...FONTS.body, color: '#0F172A', fontWeight: '600' },
});
