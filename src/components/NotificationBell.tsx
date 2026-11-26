import { useFocusEffect, usePathname, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { notificacionesApi } from '@/api/notificaciones';
import { COLORS } from '@/constants/theme';
import { useAuthStore } from '@/store/auth.store';
import { AppIcon, Tappable } from '@/components/a11y';

export function NotificationBell({ style }: { style?: StyleProp<ViewStyle> } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { token } = useAuthStore();
  const [total, setTotal] = useState(0);

  const cargar = useCallback(() => {
    if (!token) return;
    notificacionesApi.countNoLeidas()
      .then((r) => setTotal(r.total))
      .catch(() => {});
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  return (
    <Tappable
      centrado
      style={[styles.btn, style]}
      onPress={() => { if (pathname !== '/notificaciones') router.push('/(app)/notificaciones' as any); }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Notificaciones${total > 0 ? `, ${total} sin leer` : ''}`}
    >
      <AppIcon name="notifications-outline" size={22} color="#FFFFFF" />
      {total > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{total > 9 ? '9+' : total}</Text>
        </View>
      )}
    </Tappable>
  );
}

const styles = StyleSheet.create({
  btn: { marginRight: 14 },
  badge: {
    position: 'absolute', top: 6, right: 6,
    minWidth: 16, height: 16, borderRadius: 8,
    paddingHorizontal: 4, backgroundColor: COLORS.warning,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.primary,
  },
  badgeText: { color: COLORS.onWarning, fontSize: 10, fontWeight: '800', lineHeight: 12 },
});
