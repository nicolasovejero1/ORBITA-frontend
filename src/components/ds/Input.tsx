import { ComponentProps, forwardRef, ReactNode, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AppTextInput } from '@/components/a11y';
import { DS } from '@/constants/tokens';

type Props = Omit<ComponentProps<typeof AppTextInput>, 'style'> & {
  label: string;
  left?: ReactNode;
  right?: ReactNode;
  error?: string;
  /** Marca el campo en rojo sin texto propio (el mensaje se muestra en otro lugar). */
  invalid?: boolean;
};

/** Campo con etiqueta, ícono a la izquierda, acción a la derecha, foco con halo y error en línea. Con `multiline` crece como un área de texto. */
export const Input = forwardRef<TextInput, Props>(function Input(
  { label, left, right, error, invalid, onFocus, onBlur, ...rest }, ref,
) {
  const [focus, setFocus] = useState(false);
  const multi = !!rest.multiline;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.halo, focus && styles.haloOn]}>
        <View style={[styles.field, multi && styles.fieldMulti, focus && styles.fieldOn, (!!error || invalid) && styles.fieldError]}>
          {left}
          <AppTextInput
            ref={ref}
            {...rest}
            onFocus={(e) => { setFocus(true); onFocus?.(e); }}
            onBlur={(e) => { setFocus(false); onBlur?.(e); }}
            placeholderTextColor={DS.colors.textTertiary}
            style={[styles.input, multi && styles.inputMulti]}
          />
          {right}
        </View>
      </View>
      {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { fontFamily: DS.font.medium, fontSize: 13, color: DS.colors.textSecondary, marginBottom: 6 },
  halo: { borderRadius: DS.radius.control + 4, padding: 3, margin: -3 },
  haloOn: { backgroundColor: DS.colors.accentSoft },
  field: {
    height: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14,
    backgroundColor: DS.colors.background, borderRadius: DS.radius.control,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  fieldMulti: { height: undefined, minHeight: 120, alignItems: 'flex-start', paddingVertical: 12 },
  fieldOn: { borderColor: DS.colors.focus },
  fieldError: { borderColor: DS.colors.error },
  input: {
    flex: 1, fontFamily: DS.font.regular, fontSize: 16, color: DS.colors.text, paddingVertical: 0,
    // En web el navegador dibuja su propio contorno al enfocar; el foco ya lo marca el borde del campo.
    ...({ outlineStyle: 'none', outlineWidth: 0 } as object),
  },
  inputMulti: { minHeight: 96, textAlignVertical: 'top' },
  error: { fontFamily: DS.font.medium, fontSize: 13, color: DS.colors.error, marginTop: 6 },
});
