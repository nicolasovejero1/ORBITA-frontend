import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';

type Props = ComponentProps<typeof Ionicons> & {
  /** Solo si el icono comunica algo que no dice el texto de al lado. Sin etiqueta queda oculto al lector de pantalla. */
  accessibilityLabel?: string;
};

/**
 * Icono de Ionicons. Por defecto es decorativo y el lector de pantalla lo ignora;
 * con `accessibilityLabel` se anuncia como imagen.
 */
export function AppIcon({ accessibilityLabel, ...rest }: Props) {
  if (accessibilityLabel) {
    return <Ionicons {...rest} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} />;
  }
  return (
    <Ionicons
      {...rest}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
