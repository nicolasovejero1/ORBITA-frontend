import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon, Tappable } from '@/components/a11y';
import { DS } from '@/constants/tokens';

/** Título de pantalla (sin header nativo); con `onVolver` muestra una flecha para regresar. */
export function ScreenHeader({ titulo, subtitulo, onVolver, volverLabel }: {
  titulo: string; subtitulo?: string; onVolver?: () => void; volverLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.fila, { paddingTop: insets.top + 12 }]}>
      {onVolver && (
        <Tappable
          centrado
          onPress={onVolver}
          accessibilityRole="button"
          accessibilityLabel={volverLabel ?? 'Volver'}
          style={styles.volver}
        >
          <AppIcon name="chevron-back" size={22} color={DS.colors.text} />
        </Tappable>
      )}
      <View style={styles.texto}>
        <Text style={styles.titulo} accessibilityRole="header">{titulo}</Text>
        {subtitulo ? <Text style={styles.subtitulo} numberOfLines={1}>{subtitulo}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: DS.space.screen, paddingBottom: 8 },
  volver: {
    width: 46, height: 46, borderRadius: 23, borderWidth: DS.border, borderColor: DS.colors.border,
    backgroundColor: DS.colors.surface,
  },
  texto: { flex: 1 },
  titulo: { fontFamily: DS.font.bold, fontSize: 26, color: DS.colors.text },
  subtitulo: { fontFamily: DS.font.regular, fontSize: 14, color: DS.colors.textTertiary, marginTop: 2 },
});
