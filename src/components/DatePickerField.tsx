import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { DS } from '@/constants/tokens';
import { formatFechaLocal, hoyLocal } from '@/utils/date';
import { AppIcon, Tappable } from '@/components/a11y';

/**
 * Selector de fecha (date-only, "YYYY-MM-DD") vía react-native-calendars. Muestra la fecha como dd/mm/aaaa.
 * `seleccionAnio` agrega un selector de año, para fechas lejanas como la de nacimiento (si no, habría que
 * retroceder mes a mes). `minDate`/`maxDate` limitan los días elegibles.
 */
export function DatePickerField({ label, value, onChange, minDate, maxDate, seleccionAnio }: {
  label: string;
  value: string;
  onChange: (fecha: string) => void;
  minDate?: string;
  maxDate?: string;
  seleccionAnio?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Mes que muestra el calendario ("YYYY-MM-01"). Cambiar `saltos` vuelve a montar el Calendar en ese mes.
  const [mesVisible, setMesVisible] = useState(value || hoyLocal());
  const [saltos, setSaltos] = useState(0);
  const [eligiendoAnio, setEligiendoAnio] = useState(false);

  const anioMax = Number((maxDate ?? `${new Date().getFullYear() + 10}`).slice(0, 4));
  const anioMin = Number((minDate ?? `${new Date().getFullYear() - 110}`).slice(0, 4));
  const anios = Array.from({ length: anioMax - anioMin + 1 }, (_, i) => anioMax - i);
  const anioVisible = Number(mesVisible.slice(0, 4));

  const abrir = () => {
    const inicial = value || (maxDate && maxDate < hoyLocal() ? maxDate : hoyLocal());
    setMesVisible(inicial);
    setSaltos((n) => n + 1);
    setEligiendoAnio(false);
    setOpen(true);
  };

  const elegirAnio = (anio: number) => {
    setMesVisible(`${anio}-${mesVisible.slice(5, 7)}-01`);
    setSaltos((n) => n + 1);
    setEligiendoAnio(false);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label} accessible={false}>{label}</Text>
      <Tappable
        style={styles.btn}
        onPress={abrir}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatFechaLocal(value) : 'sin seleccionar'}`}
        accessibilityHint="Abre el calendario"
      >
        <AppIcon name="calendar-outline" size={18} color={COLORS.textMuted} />
        <Text style={[styles.btnText, !value && styles.placeholder]}>
          {value ? formatFechaLocal(value) : 'Seleccionar fecha...'}
        </Text>
      </Tappable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} accessible={false} onPress={() => setOpen(false)}>
          <Pressable style={styles.card} accessible={false} accessibilityViewIsModal onPress={() => {}}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle} accessibilityRole="header">{label}</Text>
              <Tappable centrado onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Cerrar calendario">
                <AppIcon name="close" size={22} color={COLORS.textSecondary} />
              </Tappable>
            </View>

            {seleccionAnio ? (
              <Tappable
                style={styles.anioBtn}
                onPress={() => setEligiendoAnio((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={`Año: ${anioVisible}. Elegir otro año`}
                expanded={eligiendoAnio}
              >
                <Text style={styles.anioBtnText}>Año: {anioVisible}</Text>
                <AppIcon name={eligiendoAnio ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.primary} />
              </Tappable>
            ) : null}

            {eligiendoAnio ? (
              <ScrollView style={styles.anioLista} contentContainerStyle={styles.anioGrid}>
                {anios.map((anio) => (
                  <Tappable
                    key={anio}
                    style={[styles.anioItem, anio === anioVisible && styles.anioItemActivo]}
                    onPress={() => elegirAnio(anio)}
                    accessibilityRole="radio"
                    accessibilityLabel={String(anio)}
                    selected={anio === anioVisible}
                  >
                    <Text style={[styles.anioItemText, anio === anioVisible && styles.anioItemTextActivo]}>{anio}</Text>
                  </Tappable>
                ))}
              </ScrollView>
            ) : (
              <Calendar
                key={saltos}
                current={mesVisible}
                minDate={minDate}
                maxDate={maxDate}
                onMonthChange={(m: DateData) => setMesVisible(m.dateString)}
                onDayPress={(day: DateData) => { onChange(day.dateString); setOpen(false); }}
                markedDates={value ? { [value]: { selected: true, selectedColor: COLORS.primary } } : {}}
                theme={{
                  todayTextColor: COLORS.primary,
                  selectedDayBackgroundColor: COLORS.primary,
                  arrowColor: COLORS.primary,
                  textSectionTitleColor: COLORS.textMuted,
                  dayTextColor: '#0F172A',
                  monthTextColor: '#0F172A',
                  textMonthFontWeight: '700',
                  calendarBackground: '#FFFFFF',
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: SIZES.xs },
  label: { fontFamily: DS.font.medium, fontSize: 13, color: DS.colors.textSecondary, marginBottom: 6, marginLeft: 2 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm,
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
    width: '100%', maxWidth: 360,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SIZES.xs, paddingHorizontal: SIZES.xs,
  },
  cardTitle: { ...FONTS.h5, color: '#0F172A', fontWeight: '700' },
  anioBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SIZES.xs,
    alignSelf: 'center', paddingVertical: SIZES.xs, paddingHorizontal: SIZES.md,
    borderRadius: DS.radius.chip, backgroundColor: DS.colors.accentSoft, marginBottom: SIZES.xs,
  },
  anioBtnText: { ...FONTS.caption, fontWeight: '600', color: COLORS.primary },
  anioLista: { maxHeight: 300 },
  anioGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: SIZES.xs },
  anioItem: { width: '22%', paddingVertical: SIZES.sm, borderRadius: 10, alignItems: 'center' },
  anioItemActivo: { backgroundColor: DS.colors.primary },
  anioItemText: { ...FONTS.caption, color: '#0F172A' },
  anioItemTextActivo: { color: '#FFFFFF', fontWeight: '700' },
});
