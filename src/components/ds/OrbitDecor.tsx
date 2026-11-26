import { StyleSheet } from 'react-native';
import Svg, { Defs, Ellipse, LinearGradient, Stop } from 'react-native-svg';
import { DS } from '@/constants/tokens';

/** Órbitas del logo como fondo decorativo de una tarjeta oscura. Ocupa todo el contenedor. */
export function OrbitDecor() {
  const [a, b, c] = DS.colors.brandGradient;
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id="orbita" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={a} />
          <Stop offset="0.5" stopColor={b} />
          <Stop offset="1" stopColor={c} />
        </LinearGradient>
      </Defs>
      <Ellipse cx={330} cy={40} rx={190} ry={62} stroke="url(#orbita)" strokeWidth={2} strokeOpacity={0.45} fill="none" transform="rotate(-24 330 40)" />
      <Ellipse cx={330} cy={40} rx={140} ry={44} stroke="url(#orbita)" strokeWidth={2} strokeOpacity={0.25} fill="none" transform="rotate(-24 330 40)" />
      <Ellipse cx={20} cy={290} rx={170} ry={56} stroke="url(#orbita)" strokeWidth={2} strokeOpacity={0.3} fill="none" transform="rotate(-24 20 290)" />
    </Svg>
  );
}
