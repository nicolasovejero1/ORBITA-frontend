import { forwardRef } from 'react';
import { StyleSheet, TextInput, TextInputProps } from 'react-native';
import { COLORS } from '@/constants/theme';
import { MIN_TOUCH } from './Tappable';

export interface AppTextInputProps extends Omit<TextInputProps, 'accessibilityLabel'> {
  /** Nombre del campo para el lector de pantalla. Obligatorio: el placeholder desaparece al escribir. */
  accessibilityLabel: string;
}

/** `TextInput` con etiqueta obligatoria, placeholder con contraste AA y alto mínimo de 48 dp. */
export const AppTextInput = forwardRef<TextInput, AppTextInputProps>(function AppTextInput(
  { style, placeholderTextColor = COLORS.textMuted, multiline, ...rest }, ref,
) {
  return (
    <TextInput
      ref={ref}
      {...rest}
      multiline={multiline}
      accessible
      placeholderTextColor={placeholderTextColor}
      style={[styles.min, style]}
    />
  );
});

const styles = StyleSheet.create({
  min: { minHeight: MIN_TOUCH },
});
