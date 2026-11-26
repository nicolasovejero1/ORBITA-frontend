import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { DS } from '@/constants/tokens';

const CirculoAnimado = Animated.createAnimatedComponent(Circle);
let contador = 0;

/** Anillo de progreso con el degradé de marca. `percent` va de 0 a 100 y el trazo se llena con una animación corta. */
export function ProgressRing({ percent, size = 96, stroke = 10 }: { percent: number; size?: number; stroke?: number }) {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [a, b, d] = DS.colors.brandGradient;
  const [id] = useState(() => `progressRing${++contador}`);
  const lleno = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    let vigente = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reducir) => {
        if (!vigente) return;
        if (reducir) {
          lleno.setValue(p);
          return;
        }
        Animated.timing(lleno, { toValue: p, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
      })
      .catch(() => lleno.setValue(p));
    return () => { vigente = false; };
  }, [p, lleno]);

  return (
    <View
      style={{ width: size, height: size }}
      accessible accessibilityRole="progressbar"
      accessibilityLabel="Progreso de hoy" accessibilityValue={{ min: 0, max: 100, now: p }}
    >
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={a} />
            <Stop offset="0.5" stopColor={b} />
            <Stop offset="1" stopColor={d} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.14)" strokeWidth={stroke} fill="none" />
        <CirculoAnimado
          cx={size / 2} cy={size / 2} r={r} stroke={`url(#${id})`} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={`${c} ${c}`}
          strokeDashoffset={lleno.interpolate({ inputRange: [0, 100], outputRange: [c, 0] })}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={styles.text}>{p}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: DS.font.bold, fontSize: 22, color: DS.colors.onPrimary },
});
