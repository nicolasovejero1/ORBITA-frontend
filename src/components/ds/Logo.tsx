import { Image, View } from 'react-native';

// Proporción de assets/logo-app.png (ya recortado, sin margen transparente).
const PROPORCION = 900 / 794;

/** Logo de la app: persona con una órbita y un pin de ubicación. `size` es el ancho. */
export function Logo({ size = 150 }: { size?: number }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Órbita">
      <Image
        source={require('../../../assets/logo-app.png')}
        style={{ width: size, height: size / PROPORCION }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}
