import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { DS } from '@/constants/tokens';

/** Tarjeta blanca con borde fino. `featured` usa el radio grande; `dark`, el fondo oscuro de marca. */
export function Card({ children, style, featured, dark }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; featured?: boolean; dark?: boolean;
}) {
  return <View style={[styles.card, featured && styles.featured, dark && styles.dark, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DS.colors.surface, borderRadius: DS.radius.card,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  featured: { borderRadius: DS.radius.featured },
  dark: { backgroundColor: DS.colors.primary, borderColor: DS.colors.primary },
});
