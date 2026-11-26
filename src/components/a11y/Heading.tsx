import { Text, TextProps } from 'react-native';

/** Título de pantalla o de sección: el lector de pantalla permite saltar entre títulos. */
export function Heading(props: TextProps) {
  return <Text {...props} accessibilityRole="header" />;
}
