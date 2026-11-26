import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificacionesApi } from '@/api/notificaciones';
import { AppIcon, Tappable } from '@/components/a11y';
import { DS } from '@/constants/tokens';
import { AvatarRing } from './AvatarRing';
import { useAuthStore } from '@/store/auth.store';

function saludo(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function fechaLarga(): string {
  const t = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Cabecera de los inicios: avatar con iniciales, fecha, saludo según la hora y campana con punto si hay avisos sin leer. */
export function HomeHeader() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, token } = useAuthStore();
  const [noLeidas, setNoLeidas] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      notificacionesApi.countNoLeidas().then((r) => setNoLeidas(r.total)).catch(() => {});
    }, [token]),
  );

  if (!user) return null;
  const iniciales = `${user.nombre[0] ?? ''}${user.apellido[0] ?? ''}`.toUpperCase();

  return (
    <View style={[styles.fila, { paddingTop: insets.top + 12 }]}>
      <AvatarRing initials={iniciales} size={46} />
      <View style={styles.texto}>
        <Text style={styles.fecha}>{fechaLarga()}</Text>
        <Text style={styles.saludo} numberOfLines={1} accessibilityRole="header">{saludo()}, {user.nombre}</Text>
      </View>
      <Tappable
        centrado
        style={styles.campana}
        onPress={() => router.navigate('/(app)/notificaciones' as any)}
        accessibilityRole="button"
        accessibilityLabel={`Notificaciones${noLeidas > 0 ? `, ${noLeidas} sin leer` : ''}`}
      >
        <AppIcon name="notifications-outline" size={22} color={DS.colors.text} />
        {noLeidas > 0 && <View style={styles.punto} />}
      </Tappable>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: DS.space.screen, paddingBottom: 4 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: DS.colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontFamily: DS.font.bold, fontSize: 16, color: DS.colors.onPrimary },
  texto: { flex: 1, gap: 2 },
  fecha: { fontFamily: DS.font.regular, fontSize: 13, color: DS.colors.textTertiary },
  saludo: { fontFamily: DS.font.bold, fontSize: 20, color: DS.colors.text },
  campana: {
    width: 46, height: 46, borderRadius: 23, borderWidth: DS.border, borderColor: DS.colors.border,
    backgroundColor: DS.colors.surface,
  },
  punto: {
    position: 'absolute', top: 10, right: 11, width: 10, height: 10, borderRadius: 5,
    backgroundColor: DS.colors.notification, borderWidth: 2, borderColor: DS.colors.surface,
  },
});
