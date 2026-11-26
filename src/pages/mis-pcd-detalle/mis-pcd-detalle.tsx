import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usuariosApi } from '@/api/usuarios';
import { tutorPcdApi, TutorPcd } from '@/api/tutor-pcd';
import { AppIcon, Tappable } from '@/components/a11y';
import { ActionPill, AvatarRing, Button, Card, Chip, DataRow, OrbitDecor } from '@/components/ds';
import { EquipoPcd } from '@/components/EquipoPcd';
import { Skeleton } from '@/components/Skeleton';
import { DS } from '@/constants/tokens';
import { useAsyncData } from '@/hooks/useAsyncData';
import { UsuarioListItem } from '@/types/usuario.types';
import { parseFechaLocal } from '@/utils/date';
import { volver } from '@/utils/navegacion';

function formatFecha(fecha?: string | null) {
  if (!fecha) return null;
  const d = parseFechaLocal(fecha);
  if (isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function PerfilPcdSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.skeleton}>
        <Skeleton height={230} borderRadius={DS.radius.featured} />
        <Skeleton height={64} borderRadius={DS.radius.card} />
        <Skeleton height={200} borderRadius={DS.radius.card} />
      </View>
    </View>
  );
}

export default function PerfilPcdScreen() {
  const { pcdId } = useLocalSearchParams<{ pcdId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const cargarLoader = useCallback(async (): Promise<{ pcd: UsuarioListItem | null; tutores: TutorPcd[] }> => {
    if (!pcdId) return { pcd: null, tutores: [] };
    const id = Number(pcdId);
    const [usuario, vinculosTutor] = await Promise.all([
      usuariosApi.getOne(id),
      tutorPcdApi.getAll({ pcdId: id, estado: 'ACTIVO' }),
    ]);
    return { pcd: usuario, tutores: vinculosTutor };
  }, [pcdId]);

  const { data: datos, loading, error } = useAsyncData(cargarLoader);
  const pcd = datos?.pcd ?? null;
  const tutores = datos?.tutores ?? [];

  if (loading) {
    return <PerfilPcdSkeleton />;
  }

  if (error || !pcd) {
    return (
      <View style={styles.container}>
        <View style={[styles.centro, { paddingTop: insets.top }]}>
          <View style={styles.vacioIcono}><AppIcon name="alert-circle-outline" size={32} color={DS.colors.textTertiary} /></View>
          <Text style={styles.vacioTexto}>{error || 'No disponible'}</Text>
          <Button label="Volver" variant="secondary" height={48} onPress={() => volver(router, '/(app)/mis-pcds')} />
        </View>
      </View>
    );
  }

  const initials = `${pcd.nombre[0]}${pcd.apellido[0]}`.toUpperCase();
  const activo = pcd.estado === 'ACTIVO';
  const params = { pcdId: String(pcdId), pcdNombre: pcd.nombre, pcdApellido: pcd.apellido };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card dark featured style={[styles.hero, { paddingTop: insets.top + 14 }]}>
          <OrbitDecor />
          <View style={styles.heroTop}>
            <Tappable
              centrado
              onPress={() => volver(router, '/(app)/mis-pcds')}
              accessibilityRole="button"
              accessibilityLabel="Volver a la lista"
              style={styles.volver}
            >
              <AppIcon name="chevron-back" size={22} color={DS.colors.onPrimary} />
            </Tappable>
            <Chip label={activo ? 'Activo' : 'Inactivo'} tone={activo ? 'success' : 'neutral'} />
          </View>
          <AvatarRing initials={initials} size={104} />
          <Text style={styles.nombre} accessibilityRole="header">{pcd.nombre} {pcd.apellido}</Text>
          <Text style={styles.sub}>Persona con discapacidad</Text>
        </Card>

        <View style={styles.acciones}>
          <ActionPill
            label="Actividades"
            icon="clipboard-outline"
            onPress={() => router.push({ pathname: '/(app)/actividades', params } as any)}
            accessibilityLabel="Ver y crear actividades de este paciente"
          />
          <ActionPill
            label="Ubicación"
            icon="location-outline"
            onPress={() => router.push({ pathname: '/(app)/ubicaciones', params } as any)}
            accessibilityLabel="Ver la ubicación de este paciente"
          />
        </View>

        <View>
          <Text style={styles.seccion} accessibilityRole="header">Información personal</Text>
          <Card style={styles.card}>
            <DataRow icon="gift-outline" tone="rosa" label="Fecha de nacimiento" value={formatFecha(pcd.fechaNacimiento)} />
            <DataRow icon="call-outline" tone="teal" label="Teléfono" value={pcd.telefono} />
            <DataRow icon="mail-outline" tone="indigo" label="Email" value={pcd.email} />
            <DataRow icon="location-outline" tone="ambar" label="Dirección" value={pcd.direccion} last />
          </Card>
        </View>

        {tutores.length > 0 && (
          <View>
            <Text style={styles.seccion} accessibilityRole="header">Tutores a cargo</Text>
            <View style={styles.lista}>
              {tutores.map((t) => (
                <Card key={t.tutorId} style={styles.tutor}>
                  <AvatarRing initials={`${t.tutor.usuario.nombre[0]}${t.tutor.usuario.apellido[0]}`.toUpperCase()} size={46} />
                  <View style={styles.flex}>
                    <Text style={styles.tutorNombre}>{t.tutor.usuario.nombre} {t.tutor.usuario.apellido}</Text>
                    <Text style={styles.tutorSub}>{t.parentesco} · DNI {t.tutor.usuario.dni}</Text>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        )}

        {pcd.pcd && (
          <View>
            <Text style={styles.seccion} accessibilityRole="header">Información de discapacidad</Text>
            <Card style={styles.card}>
              <DataRow icon="accessibility-outline" tone="indigo" label="Tipo de discapacidad" value={pcd.pcd.tipoDiscapacidad} />
              <DataRow icon="speedometer-outline" tone="ambar" label="Grado" value={pcd.pcd.grado} />
              <DataRow icon="document-text-outline" tone="teal" label="Diagnóstico" value={pcd.pcd.diagnostico} last />
            </Card>
          </View>
        )}

        <View style={styles.equipo}>
          <EquipoPcd pcdId={Number(pcdId)} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: DS.colors.background },
  scroll: { paddingBottom: 56, gap: DS.space.section },
  skeleton: { padding: DS.space.screen, paddingTop: 64, gap: 16 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  vacioIcono: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: DS.colors.surface,
    borderWidth: DS.border, borderColor: DS.colors.border, alignItems: 'center', justifyContent: 'center',
  },
  vacioTexto: { fontFamily: DS.font.regular, fontSize: 14, color: DS.colors.textSecondary, textAlign: 'center' },

  hero: {
    borderRadius: 0, borderBottomLeftRadius: DS.radius.featured + 6, borderBottomRightRadius: DS.radius.featured + 6,
    paddingHorizontal: DS.space.screen, paddingBottom: 26, alignItems: 'center', gap: 8, overflow: 'hidden',
  },
  heroTop: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  volver: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.12)' },
  nombre: { fontFamily: DS.font.bold, fontSize: 24, color: DS.colors.onPrimary, textAlign: 'center', marginTop: 6 },
  sub: { fontFamily: DS.font.medium, fontSize: 14, color: DS.colors.onPrimaryMuted },

  acciones: { flexDirection: 'row', gap: 12, paddingHorizontal: DS.space.screen },
  accion: {
    flex: 1, flexDirection: 'column', gap: 8, paddingVertical: 16, backgroundColor: DS.colors.surface,
    borderRadius: DS.radius.card, borderWidth: DS.border, borderColor: DS.colors.border,
  },
  accionIcono: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  accionTexto: { fontFamily: DS.font.semibold, fontSize: 14, color: DS.colors.text },

  seccion: { fontFamily: DS.font.bold, fontSize: 18, color: DS.colors.text, marginBottom: 10, marginHorizontal: DS.space.screen },
  card: { marginHorizontal: DS.space.screen, overflow: 'hidden' },
  lista: { gap: 10, paddingHorizontal: DS.space.screen },
  tutor: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  tutorAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#FCE7F3', alignItems: 'center', justifyContent: 'center' },
  tutorAvatarTexto: { fontFamily: DS.font.bold, fontSize: 15, color: '#BE185D' },
  tutorNombre: { fontFamily: DS.font.bold, fontSize: 15, color: DS.colors.text },
  tutorSub: { fontFamily: DS.font.regular, fontSize: 13, color: DS.colors.textTertiary, marginTop: 2 },
  equipo: { paddingHorizontal: DS.space.screen },
});
