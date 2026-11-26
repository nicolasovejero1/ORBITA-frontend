import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { vinculosApi } from '@/api/vinculos';
import { TutorPcd, tutorPcdApi } from '@/api/tutor-pcd';
import { AppIcon, Tappable } from '@/components/a11y';
import { ActionPill, AvatarRing, Button, Card, Chip, OrbitDecor, ScreenHeader } from '@/components/ds';
import { SearchBar } from '@/components/SearchBar';
import { Skeleton } from '@/components/Skeleton';
import { nombresPersonasACargo } from '@/constants/personas-a-cargo';
import { DS } from '@/constants/tokens';
import { useAuthStore } from '@/store/auth.store';
import { useAsyncData, useRecargarAlEnfocar } from '@/hooks/useAsyncData';
import { Vinculo } from '@/types/vinculo.types';
import { volver } from '@/utils/navegacion';
import { buscar } from '@/utils/search';

interface PcdItem {
  pcdId: number;
  nombre: string;
  apellido: string;
  rolLabel?: string;
}

const iniciales = (nombre: string, apellido: string) => `${nombre[0] ?? ''}${apellido[0] ?? ''}`.toUpperCase();
const capitalizar = (t: string) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();

function MisPcdsSkeleton() {
  return (
    <View style={styles.lista}>
      <Skeleton height={120} borderRadius={DS.radius.featured} />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} height={148} borderRadius={DS.radius.card} />
      ))}
    </View>
  );
}

/** Tarjeta oscura con la cantidad total y los primeros avatares. */
function Resumen({ pcds, plural }: { pcds: PcdItem[]; plural: string }) {
  const visibles = pcds.slice(0, 4);
  const resto = pcds.length - visibles.length;
  return (
    <Card dark featured style={styles.resumen}>
      <OrbitDecor />
      <View style={styles.flex}>
        <Text style={styles.resumenNumero}>{pcds.length}</Text>
        <Text style={styles.resumenTexto}>{plural}</Text>
      </View>
      <View style={styles.avatares}>
        {visibles.map((p, i) => (
          <View key={p.pcdId} style={i > 0 ? styles.avatarSolapado : undefined}>
            <AvatarRing initials={iniciales(p.nombre, p.apellido)} size={44} />
          </View>
        ))}
        {resto > 0 && (
          <View style={styles.avatarSolapado}>
            <AvatarRing initials={`+${resto}`} size={44} />
          </View>
        )}
      </View>
    </Card>
  );
}

export default function MisPcdsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [busqueda, setBusqueda] = useState('');
  const nombres = nombresPersonasACargo(user?.tipoUsuario);

  const cargarLoader = useCallback(async (): Promise<PcdItem[]> => {
    if (!user) return [];
    if (user.tipoUsuario === 'PROFESIONAL') {
      const vinculos: Vinculo[] = await vinculosApi.getAll({ profesionalId: user.id, estado: 'ACTIVO' });
      return vinculos.map((v) => ({
        pcdId: v.pcd.usuario.id,
        nombre: v.pcd.usuario.nombre,
        apellido: v.pcd.usuario.apellido,
        rolLabel: v.rolProfesional,
      }));
    }
    const vinculos: TutorPcd[] = await tutorPcdApi.getAll({ tutorId: user.id, estado: 'ACTIVO' });
    return vinculos.map((v) => ({
      pcdId: v.pcd.usuario.id,
      nombre: v.pcd.usuario.nombre,
      apellido: v.pcd.usuario.apellido,
    }));
  }, [user]);

  const { data: pcdsData, loading, error, reload, refrescarSilencioso } = useAsyncData<PcdItem[]>(cargarLoader);
  useRecargarAlEnfocar(refrescarSilencioso);
  const pcds = pcdsData ?? [];

  // Con pocas personas el buscador sobra.
  const conBuscador = pcds.length > 4;
  const filtrados = conBuscador ? buscar(pcds, busqueda, (p) => `${p.nombre} ${p.apellido}`, 0).visibles : pcds;

  const abrirFicha = (p: PcdItem) => router.push(`/(app)/mis-pcds/${p.pcdId}` as any);
  const abrirActividades = (p: PcdItem) =>
    router.push({ pathname: '/(app)/actividades', params: { pcdId: p.pcdId, pcdNombre: p.nombre, pcdApellido: p.apellido } } as any);
  const abrirUbicacion = (p: PcdItem) =>
    router.push({ pathname: '/(app)/ubicaciones', params: { pcdId: p.pcdId, pcdNombre: p.nombre, pcdApellido: p.apellido } } as any);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScreenHeader
        titulo={nombres.titulo}
        subtitulo={loading ? undefined : `${pcds.length} ${pcds.length === 1 ? 'vínculo activo' : 'vínculos activos'}`}
        onVolver={() => volver(router, '/(app)')}
        volverLabel="Volver al inicio"
      />

      {loading ? (
        <MisPcdsSkeleton />
      ) : error ? (
        <View style={styles.center}>
          <View style={styles.vacioIcono}><AppIcon name="alert-circle-outline" size={32} color={DS.colors.textTertiary} /></View>
          <Text style={styles.vacioTexto}>{error}</Text>
          <Button label="Reintentar" variant="secondary" height={48} onPress={reload} accessibilityLabel="Reintentar cargar la lista" />
        </View>
      ) : pcds.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.vacioIcono}><AppIcon name="people-circle-outline" size={36} color={DS.colors.textTertiary} /></View>
          <Text style={styles.vacioTitulo} accessibilityRole="header">{nombres.vacio}</Text>
          <Text style={styles.vacioTexto}>No tenés vínculos activos.</Text>
        </View>
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(p) => String(p.pcdId)}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.cabeceraLista}>
              <Resumen pcds={pcds} plural={nombres.activos.toLowerCase()} />
              {conBuscador && (
                <SearchBar
                  accessibilityLabel={`Buscar entre tus ${nombres.activos.toLowerCase()}`}
                  placeholder="Buscar por nombre o apellido..."
                  value={busqueda}
                  onChangeText={setBusqueda}
                />
              )}
            </View>
          }
          ListEmptyComponent={<Text style={styles.sinResultados}>Sin resultados</Text>}
          renderItem={({ item: p }) => (
            <View style={styles.card}>
              <Tappable
                style={styles.cardMain}
                onPress={() => abrirFicha(p)}
                accessibilityRole="button"
                accessibilityLabel={`${p.nombre} ${p.apellido}${p.rolLabel ? `, ${p.rolLabel}` : ''}`}
                accessibilityHint="Abre la ficha"
              >
                <AvatarRing initials={iniciales(p.nombre, p.apellido)} size={58} />
                <View style={styles.flex}>
                  <Text style={styles.nombre} numberOfLines={1}>{p.nombre} {p.apellido}</Text>
                  {p.rolLabel ? (
                    <Chip label={capitalizar(p.rolLabel)} tone={p.rolLabel === 'CABECERA' ? 'accent' : 'success'} />
                  ) : (
                    <Text style={styles.detalle}>Ver ficha completa</Text>
                  )}
                </View>
                <AppIcon name="chevron-forward" size={22} color={DS.colors.textTertiary} />
              </Tappable>

              <View style={styles.accesos}>
                <ActionPill
                  label="Actividades"
                  icon="clipboard-outline"
                  onPress={() => abrirActividades(p)}
                  accessibilityLabel={`Ver las actividades de ${p.nombre} ${p.apellido}`}
                />
                <ActionPill
                  label="Ubicación"
                  icon="location-outline"
                  onPress={() => abrirUbicacion(p)}
                  accessibilityLabel={`Ver la ubicación de ${p.nombre} ${p.apellido}`}
                />
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: DS.colors.background },
  lista: { paddingHorizontal: DS.space.screen, paddingTop: 8, paddingBottom: 56, gap: 12 },
  cabeceraLista: { gap: 12, marginBottom: 4 },

  resumen: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, overflow: 'hidden' },
  resumenNumero: { fontFamily: DS.font.bold, fontSize: 40, lineHeight: 44, color: DS.colors.onPrimary },
  resumenTexto: { fontFamily: DS.font.medium, fontSize: 14, color: DS.colors.onPrimaryMuted },
  avatares: { flexDirection: 'row', alignItems: 'center' },
  avatarMini: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: DS.colors.accentSoft,
    borderWidth: 3, borderColor: DS.colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarSolapado: { marginLeft: -12 },
  avatarResto: { backgroundColor: DS.colors.successSoft },
  avatarMiniTexto: { fontFamily: DS.font.bold, fontSize: 13, color: DS.colors.primary },

  card: {
    backgroundColor: DS.colors.surface, borderRadius: DS.radius.card, padding: 14, gap: 12,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  nombre: { fontFamily: DS.font.bold, fontSize: 17, color: DS.colors.text, marginBottom: 6 },
  detalle: { fontFamily: DS.font.regular, fontSize: 13, color: DS.colors.textTertiary },
  accesos: {
    flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: DS.border, borderTopColor: DS.colors.border,
  },
  acceso: {
    flex: 1, flexDirection: 'row', gap: 8, minHeight: 46, borderRadius: DS.radius.control,
    backgroundColor: DS.colors.accentSoft,
  },
  accesoTexto: { fontFamily: DS.font.semibold, fontSize: 14, color: DS.colors.accent },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  vacioIcono: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: DS.colors.surface,
    borderWidth: DS.border, borderColor: DS.colors.border, alignItems: 'center', justifyContent: 'center',
  },
  vacioTitulo: { fontFamily: DS.font.bold, fontSize: 18, color: DS.colors.text, textAlign: 'center' },
  vacioTexto: { fontFamily: DS.font.regular, fontSize: 14, lineHeight: 20, color: DS.colors.textSecondary, textAlign: 'center' },
  sinResultados: { fontFamily: DS.font.regular, fontSize: 14, color: DS.colors.textSecondary, textAlign: 'center', padding: 24 },
});
