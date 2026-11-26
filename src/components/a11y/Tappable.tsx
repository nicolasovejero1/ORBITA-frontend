import { AccessibilityRole, StyleSheet, TouchableOpacity, TouchableOpacityProps } from 'react-native';

/** Lado mínimo del área táctil (dp): WCAG 2.2 AA y guía de Android. */
export const MIN_TOUCH = 48;

export interface TappableProps extends Omit<TouchableOpacityProps, 'accessibilityRole' | 'accessibilityLabel' | 'accessible'> {
  /** Qué es para el lector de pantalla (`button`, `tab`, `checkbox`, `radio`, `link`...). Obligatorio. */
  accessibilityRole: AccessibilityRole;
  /** Qué hace o qué es, sin repetir el rol ("Cerrar", no "Botón cerrar"). Obligatorio. */
  accessibilityLabel: string;
  /** Opción elegida (pestañas, chips de filtro, radios). */
  selected?: boolean;
  /** Sección desplegable: abierta o cerrada. */
  expanded?: boolean;
  /** Casillas e interruptores. */
  checked?: boolean;
  /** Centra el contenido en el área de 48×48 (botones de solo ícono, chips de una línea). */
  centrado?: boolean;
}

/**
 * Reemplazo de `TouchableOpacity` para todo lo que se toca: exige rol y etiqueta
 * (el compilador falla si faltan), lo marca como accesible, comunica los estados
 * seleccionado, desplegado, marcado y deshabilitado, y garantiza un área de 48×48 dp.
 */
export function Tappable({
  accessibilityRole, accessibilityLabel, selected, expanded, checked, centrado,
  disabled, style, activeOpacity = 0.75, accessibilityState, ...rest
}: TappableProps) {
  return (
    <TouchableOpacity
      {...rest}
      accessible
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{
        ...accessibilityState,
        ...(selected !== undefined && { selected }),
        ...(expanded !== undefined && { expanded }),
        ...(checked !== undefined && { checked }),
        ...(disabled !== undefined && { disabled: !!disabled }),
      }}
      disabled={disabled}
      activeOpacity={activeOpacity}
      style={[styles.min, centrado && styles.centrado, style]}
    />
  );
}

const styles = StyleSheet.create({
  min: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH },
  centrado: { alignItems: 'center', justifyContent: 'center' },
});
