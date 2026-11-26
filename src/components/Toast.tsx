import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, ViewStyle } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { DS } from '@/constants/tokens';
import { vibrarError, vibrarExito } from '@/utils/haptics';
import { announce , AppIcon, Tappable } from '@/components/a11y';


export type ToastType = 'success' | 'error';

export interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '', type: 'success' });

  const showToast = (message: string, type: ToastType = 'success') =>
    setToast({ visible: true, message, type });

  const hideToast = () => setToast((s) => ({ ...s, visible: false }));

  return { toast, showToast, hideToast };
}

interface ToastProps extends ToastState {
  onClose: () => void;
  style?: ViewStyle;
}

export function Toast({ visible, message, type, onClose, style }: ToastProps) {
  const slideY = useMemo(() => new Animated.Value(60), []);
  const opacity = useMemo(() => new Animated.Value(0), []);
  // onClose va en una ref: los padres lo pasan como función nueva en cada
  // render, y si fuera dependencia del efecto, cada re-render del padre
  // reiniciaba la animación y el temporizador (el aviso aparecía una y otra
  // vez y nunca se cerraba, como pasaba en Terapias).
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideY, { toValue: 60, duration: 180, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onCloseRef.current());
  }, [slideY, opacity]);

  useEffect(() => {
    if (!visible) return;

    slideY.setValue(60);
    opacity.setValue(0);
    // El aviso aparece y se va solo: sin esto, quien usa lector de pantalla nunca se entera.
    announce(message);
    if (type === 'success') vibrarExito(); else vibrarError();

    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const t = setTimeout(dismiss, type === 'success' ? 3000 : 5000);
    return () => clearTimeout(t);
  }, [visible, message, type, slideY, opacity, dismiss]);

  if (!visible) return null;

  const isSuccess = type === 'success';
  const iconColor = isSuccess ? '#0F766E' : COLORS.error;

  return (
    <Animated.View
      style={[
        styles.container,
        isSuccess ? styles.success : styles.error,
        { transform: [{ translateY: slideY }], opacity },
        style,
      ]}
    >
      <AppIcon
        name={isSuccess ? 'checkmark-circle' : 'alert-circle'}
        size={20}
        color={iconColor}
      />
      <Text style={[styles.message, { color: iconColor }]} numberOfLines={4} accessibilityLiveRegion="polite">
        {message}
      </Text>
      <Tappable centrado
        onPress={dismiss}
        accessibilityRole="button"
        accessibilityLabel="Cerrar aviso"
        style={styles.cerrar}
      >
        <AppIcon name="close" size={18} color={iconColor} />
      </Tappable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: SIZES.lg,
    left: SIZES.lg,
    right: SIZES.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    paddingHorizontal: SIZES.md,
    paddingVertical: 14,
    borderRadius: DS.radius.control,
    borderWidth: DS.border,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 1000,
  },
  success: {
    backgroundColor: DS.colors.successSoft,
    borderColor: '#99F6E4',
  },
  error: {
    backgroundColor: DS.colors.errorSoft,
    borderColor: '#FECACA',
  },
  cerrar: { alignItems: 'center', justifyContent: 'center' },
  message: {
    ...FONTS.caption,
    fontWeight: '600' as const,
    flex: 1,
  },
});
