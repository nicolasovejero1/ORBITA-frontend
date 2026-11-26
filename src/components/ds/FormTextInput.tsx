import { ReactNode } from 'react';
import { StyleSheet, Text, TextInputProps } from 'react-native';
import { DS } from '@/constants/tokens';
import { Input } from './Input';

type Props = Omit<TextInputProps, 'style' | 'accessibilityLabel'> & {
  label: string;
  accessibilityLabel?: string;
  /** `true` marca el campo en rojo; un texto además lo muestra debajo. */
  error?: boolean | string;
  left?: ReactNode;
  right?: ReactNode;
  // Props que tenía el campo de Paper: se aceptan para no tocar los formularios, pero ya no hacen falta.
  mode?: 'outlined' | 'flat';
  style?: unknown;
  outlineStyle?: unknown;
  contentStyle?: unknown;
  dense?: boolean;
  disabled?: boolean;
};

/**
 * Campo de texto de los formularios en modales: misma apariencia que el resto de la app
 * (etiqueta arriba, borde fino, foco índigo). Acepta las props del campo de Paper que usaban los formularios.
 */
export function FormTextInput({
  label, accessibilityLabel, error, mode: _mode, style: _style, outlineStyle: _outlineStyle, contentStyle: _contentStyle,
  dense: _dense, disabled, editable, numberOfLines, ...rest
}: Props) {
  return (
    <Input
      {...rest}
      label={label}
      accessibilityLabel={accessibilityLabel ?? label}
      editable={editable ?? !disabled}
      numberOfLines={numberOfLines}
      error={typeof error === 'string' ? error : undefined}
      invalid={error === true}
    />
  );
}

/** Mensaje de error debajo de un campo (reemplaza al HelperText de Paper). */
export function FormError({ children }: { children?: ReactNode; type?: string; visible?: boolean; style?: unknown }) {
  if (!children) return null;
  return <Text style={styles.error} accessibilityLiveRegion="polite">{children}</Text>;
}

const styles = StyleSheet.create({
  error: { fontFamily: DS.font.medium, fontSize: 13, color: DS.colors.error, marginTop: -8, marginBottom: 12, marginLeft: 2 },
});
