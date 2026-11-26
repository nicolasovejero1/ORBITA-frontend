import { ReactNode, useEffect, useMemo } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleProp, ViewStyle } from 'react-native';

/**
 * Entrada suave de un bloque: aparece con un fundido y sube unos píxeles.
 * `delay` (ms) sirve para escalonar varios bloques seguidos.
 * Si la persona pidió reducir el movimiento en el sistema, aparece de una vez, sin animación.
 */
export function Entrar({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const progreso = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    let vigente = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reducir) => {
        if (!vigente) return;
        if (reducir) {
          progreso.setValue(1);
          return;
        }
        Animated.timing(progreso, {
          toValue: 1, duration: 380, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }).start();
      })
      .catch(() => progreso.setValue(1));
    return () => { vigente = false; };
  }, [delay, progreso]);

  return (
    <Animated.View
      style={[
        style,
        { opacity: progreso, transform: [{ translateY: progreso.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}
