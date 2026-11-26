import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { BottomTabBar } from '@/components/BottomTabBar';
import { COLORS, FONTS } from '@/constants/theme';


export default function AppLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.primary },
          headerBackground: () => (
            <LinearGradient
              colors={[COLORS.primaryDark, COLORS.primary, COLORS.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          ),
          headerTintColor: '#FFFFFF',
          headerTitleStyle: { ...FONTS.bodyBold, color: '#FFFFFF' },
        }}
      >
        {}
        {}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="usuarios/index" options={{ headerShown: false }} />
        <Stack.Screen name="vinculos/index" options={{ headerShown: false }} />
        <Stack.Screen name="tutor-pcd/index" options={{ headerShown: false }} />
        <Stack.Screen name="medicamentos/index" options={{ headerShown: false }} />
        <Stack.Screen name="terapias/index" options={{ headerShown: false }} />
        <Stack.Screen name="mis-pcds/index" options={{ headerShown: false }} />
        <Stack.Screen name="mis-pcds/[pcdId]" options={{ headerShown: false }} />
        <Stack.Screen name="perfil/index" options={{ headerShown: false }} />
        <Stack.Screen name="notificaciones/index" options={{ headerShown: false }} />
        <Stack.Screen name="actividades/index" options={{ headerShown: false }} />
        <Stack.Screen name="reportes/index" options={{ headerShown: false }} />
        <Stack.Screen name="ubicaciones/index" options={{ headerShown: false }} />
        <Stack.Screen name="calendario/index" options={{ headerShown: false }} />

        {}
        <Stack.Screen name="usuarios/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="actividades/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="reportes/[id]" options={{ headerShown: false }} />
      </Stack>
      <BottomTabBar />
    </View>
  );
}
