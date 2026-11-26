import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { nombresPersonasACargo } from '@/constants/personas-a-cargo';
import { DS } from '@/constants/tokens';
import { useAuthStore } from '@/store/auth.store';
import { TipoUsuario } from '@/types/auth.types';
import { AppIcon, Tappable } from '@/components/a11y';
import { irASeccion } from '@/utils/navegacion';

interface TabItem {
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}

const HOME_TAB: TabItem = { label: 'Inicio', route: '/(app)', icon: 'home-outline', iconActive: 'home' };

const ROLE_TAB: Record<'admin' | 'profesionalOTutor' | 'pcd', TabItem> = {
  admin: { label: 'Usuarios', route: '/(app)/usuarios', icon: 'people-outline', iconActive: 'people' },
  profesionalOTutor: { label: 'A cargo', route: '/(app)/mis-pcds', icon: 'people-circle-outline', iconActive: 'people-circle' },
  pcd: { label: 'Calendario', route: '/(app)/calendario', icon: 'calendar-outline', iconActive: 'calendar' },
};

const RIGHT_TABS: TabItem[] = [
  { label: 'Reportes', route: '/(app)/reportes', icon: 'stats-chart-outline', iconActive: 'stats-chart' },
  { label: 'Perfil', route: '/(app)/perfil', icon: 'person-circle-outline', iconActive: 'person-circle' },
];

export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const tipo = user?.tipoUsuario as TipoUsuario | undefined;
  const esAdmin = user?.esAdministrador ?? false;

  const roleTab = esAdmin
    ? ROLE_TAB.admin
    : tipo === 'PROFESIONAL' || tipo === 'TUTOR'
      ? { ...ROLE_TAB.profesionalOTutor, label: nombresPersonasACargo(tipo).pestania }
      : ROLE_TAB.pcd;

  const leftTabs = [HOME_TAB, roleTab];

  const isActive = (route: string) => {
    const clean = route.replace('/(app)', '') || '/';
    return clean === '/' ? pathname === '/' : pathname.startsWith(clean);
  };

  // El botón central lleva a Actividades para todos los roles; el "+" para crear
  // vive en esa pantalla, como en Medicamentos o Terapias.
  const abrirCentral = () => irASeccion(router, pathname, '/(app)/actividades');

  const renderTab = (tab: TabItem) => {
    const active = isActive(tab.route);
    const color = active ? DS.colors.text : DS.colors.textTertiary;
    return (
      <Tappable
        key={tab.route}
        style={styles.tab}
        onPress={() => irASeccion(router, pathname, tab.route)}
        activeOpacity={0.7}
        accessibilityRole="tab"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected: active }}
      >
        <AppIcon name={active ? tab.iconActive : tab.icon} size={24} color={color} />
        <Text style={[styles.label, { color, fontFamily: active ? DS.font.bold : DS.font.medium }]} numberOfLines={1}>
          {tab.label}
        </Text>
      </Tappable>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
      {leftTabs.map(renderTab)}

      <View style={styles.fabSlot}>
        <Tappable
          centrado
          style={styles.fab}
          onPress={abrirCentral}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Ir a Actividades"
        >
          <AppIcon name="clipboard-outline" size={30} color={DS.colors.onPrimary} />
        </Tappable>
      </View>

      {RIGHT_TABS.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: DS.colors.surface,
    borderTopWidth: DS.border,
    borderTopColor: DS.colors.border,
    paddingTop: 10,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  label: { fontSize: 11 },
  fabSlot: { flex: 1, alignItems: 'center' },
  fab: {
    position: 'absolute',
    top: -34,
    width: 58,
    height: 58,
    borderRadius: DS.radius.fab,
    backgroundColor: DS.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: DS.colors.background,
  },
});
