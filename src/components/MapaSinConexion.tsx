import { StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { AppIcon, Tappable } from '@/components/a11y';

/** Aviso que tapa el mapa cuando no se pudo cargar (sin internet). */
export function MapaSinConexion({ onReintentar }: { onReintentar: () => void }) {
  return (
    <View style={styles.overlay}>
      <AppIcon name="cloud-offline-outline" size={40} color={COLORS.textMuted} />
      <Text style={styles.titulo} accessibilityRole="header">Mapa no disponible</Text>
      <Text style={styles.texto}>Sin conexión a internet. Revisá tu conexión e intentá de nuevo.</Text>
      <Tappable
        style={styles.boton}
        onPress={onReintentar}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Reintentar cargar el mapa"
      >
        <AppIcon name="refresh" size={16} color="#FFFFFF" />
        <Text style={styles.botonTexto}>Reintentar</Text>
      </Tappable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
    gap: SIZES.xs, padding: SIZES.lg,
  },
  titulo: { ...FONTS.bodyBold, color: COLORS.textMuted },
  texto: { ...FONTS.caption, color: COLORS.textMuted, textAlign: 'center' },
  boton: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.xs,
    marginTop: SIZES.sm, paddingVertical: SIZES.sm, paddingHorizontal: SIZES.md,
    borderRadius: 20, backgroundColor: COLORS.primary,
  },
  botonTexto: { ...FONTS.caption, fontWeight: '600', color: '#FFFFFF' },
});
