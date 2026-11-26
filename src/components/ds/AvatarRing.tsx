import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { DS } from '@/constants/tokens';

let contador = 0;

/**
 * Avatar de toda la app: iniciales dentro de un círculo blanco con un anillo en el degradé de marca.
 * El grosor del anillo y la letra se ajustan al tamaño, para que se vea igual de chico o de grande.
 */
export function AvatarRing({ initials, size = 104 }: { initials: string; size?: number }) {
  const [a, b, c] = DS.colors.brandGradient;
  const stroke = Math.max(2, Math.round(size / 26));
  const r = (size - stroke) / 2;
  // Un id por instancia: varios avatares en pantalla no deben compartir el mismo degradé de SVG.
  const [id] = useState(() => `avatarRing${++contador}`);
  return (
    <View style={{ width: size, height: size }} accessible={false}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={a} />
            <Stop offset="0.5" stopColor={b} />
            <Stop offset="1" stopColor={c} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={`url(#${id})`} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r - stroke * 1.75} fill="#FFFFFF" />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.centro]}>
        <Text style={[styles.texto, { fontSize: size * 0.32 }]}>{initials}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { alignItems: 'center', justifyContent: 'center' },
  texto: { fontFamily: DS.font.bold, color: DS.colors.primary },
});
