import { StyleSheet, View } from 'react-native';
import { AppIcon, AppTextInput, Tappable } from '@/components/a11y';
import { DS } from '@/constants/tokens';

interface Props {
  /** Nombre del campo para el lector de pantalla. */
  accessibilityLabel: string;
  placeholder: string;
  value: string;
  onChangeText: (texto: string) => void;
  /** Al tocar la "x"; si no se pasa, se vacía con `onChangeText('')`. */
  onClear?: () => void;
  /** Etiqueta de la "x" para el lector de pantalla. */
  clearLabel?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

/** Barra de búsqueda única de la app: campo con borde fino, lupa a la izquierda y "x" al escribir. */
export function SearchBar({
  accessibilityLabel, placeholder, value, onChangeText, onClear, clearLabel = 'Borrar la búsqueda', onFocus, onBlur,
}: Props) {
  return (
    <View style={styles.campo}>
      <AppIcon name="search-outline" size={22} color={DS.colors.textTertiary} />
      <AppTextInput
        accessibilityLabel={accessibilityLabel}
        placeholder={placeholder}
        placeholderTextColor={DS.colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        returnKeyType="search"
        style={styles.input}
      />
      {value ? (
        <Tappable
          centrado
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          onPress={onClear ?? (() => onChangeText(''))}
          style={styles.limpiar}
        >
          <AppIcon name="close-circle" size={20} color={DS.colors.textTertiary} />
        </Tappable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  campo: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 14,
    backgroundColor: DS.colors.surface, borderRadius: DS.radius.control,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  input: {
    flex: 1, fontFamily: DS.font.regular, fontSize: 16, color: DS.colors.text, paddingVertical: 0,
    ...({ outlineStyle: 'none', outlineWidth: 0 } as object),
  },
  limpiar: { marginRight: -10 },
});
