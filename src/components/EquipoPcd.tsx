import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { usuariosApi } from '@/api/usuarios';
import { vinculosApi } from '@/api/vinculos';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Toast, useToast } from '@/components/Toast';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useAuthStore } from '@/store/auth.store';
import { UsuarioListItem } from '@/types/usuario.types';
import { Vinculo } from '@/types/vinculo.types';
import { getErrorMessage } from '@/utils/http-error';
import { buscar } from '@/utils/search';
import { AppIcon, Tappable } from '@/components/a11y';

/**
 * Equipo de profesionales de un PCD. Solo lo ve el médico de cabecera del PCD,
 * que puede asignarle especialistas y quitarlos (el cabecera lo cambia el
 * Administrador).
 */
export function EquipoPcd({ pcdId }: { pcdId: number }) {
  const { user } = useAuthStore();
  const { toast, showToast, hideToast } = useToast();
  const cargar = useCallback(() => vinculosApi.getAll({ pcdId }), [pcdId]);
  const { data, reload } = useAsyncData<Vinculo[]>(cargar);
  const equipo = data ?? [];

  const [eligiendo, setEligiendo] = useState(false);
  const [candidatos, setCandidatos] = useState<UsuarioListItem[]>([]);
  const [cargandoCandidatos, setCargandoCandidatos] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [aAsignar, setAAsignar] = useState<UsuarioListItem | null>(null);
  const [aQuitar, setAQuitar] = useState<Vinculo | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const soyCabecera = equipo.some(
    (v) => v.profesionalId === user?.id && v.rolProfesional === 'CABECERA' && v.estado === 'ACTIVO',
  );
  if (!soyCabecera) return null;

  const abrirSelector = async () => {
    setEligiendo(true);
    setBusqueda('');
    setCargandoCandidatos(true);
    try {
      setCandidatos(await usuariosApi.getAll('PROFESIONAL'));
    } catch (e) {
      showToast(getErrorMessage(e, 'No se pudo cargar la lista de profesionales'), 'error');
    } finally {
      setCargandoCandidatos(false);
    }
  };

  const yaEnElEquipo = new Set(equipo.map((v) => v.profesionalId));
  const disponibles = candidatos.filter((c) => c.estado === 'ACTIVO' && !yaEnElEquipo.has(c.id));
  const { visibles: filtrados, hayMas } = buscar(
    disponibles,
    busqueda,
    (c) => `${c.nombre} ${c.apellido} ${c.profesional?.especialidad?.nombre ?? ''}`,
    0,
  );

  const asignar = async () => {
    if (!aAsignar) return;
    setTrabajando(true);
    try {
      await vinculosApi.create({ pcdId, profesionalId: aAsignar.id, rolProfesional: 'ESPECIALISTA' });
      showToast(`${aAsignar.nombre} ${aAsignar.apellido} es parte del equipo`, 'success');
      setEligiendo(false);
      void reload();
    } catch (e) {
      showToast(getErrorMessage(e, 'No se pudo asignar al especialista'), 'error');
    } finally {
      setTrabajando(false);
      setAAsignar(null);
    }
  };

  const quitar = async () => {
    if (!aQuitar) return;
    setTrabajando(true);
    try {
      await vinculosApi.remove(pcdId, aQuitar.profesionalId);
      showToast('Especialista quitado del equipo', 'success');
      void reload();
    } catch (e) {
      // Por ejemplo: ya creó actividades para este paciente.
      showToast(getErrorMessage(e, 'No se pudo quitar al especialista'), 'error');
    } finally {
      setTrabajando(false);
      setAQuitar(null);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">Equipo de profesionales</Text>
      <View style={styles.card}>
        {equipo.map((v) => (
          <View key={v.profesionalId} style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.name}>{v.profesional.usuario.nombre} {v.profesional.usuario.apellido}</Text>
              <Text style={styles.sub}>
                {v.rolProfesional === 'CABECERA' ? 'Médico de cabecera' : 'Especialista'} · {v.profesional.especialidad?.nombre}
                {v.estado === 'INACTIVO' ? ' · Inactivo' : ''}
              </Text>
            </View>
            {v.rolProfesional === 'ESPECIALISTA' && (
              <Tappable centrado
                style={styles.iconBtn}
                onPress={() => setAQuitar(v)}
                accessibilityRole="button"
                accessibilityLabel={`Quitar a ${v.profesional.usuario.nombre} ${v.profesional.usuario.apellido} del equipo`}
              >
                <AppIcon name="person-remove-outline" size={22} color={COLORS.error} />
              </Tappable>
            )}
          </View>
        ))}

        {eligiendo ? (
          <View style={styles.selector}>
            <TextInput
              style={styles.input}
              placeholder="Buscar por nombre o especialidad"
              placeholderTextColor="#556274"
              value={busqueda}
              onChangeText={setBusqueda}
              accessibilityLabel="Buscar profesional para asignar"
            />
            {cargandoCandidatos ? (
              <ActivityIndicator accessibilityLabel="Cargando" color={COLORS.primary} style={{ margin: SIZES.md }} />
            ) : filtrados.length === 0 ? (
              <Text style={styles.empty}>No hay profesionales para asignar</Text>
            ) : (
              filtrados.map((c) => (
                <Tappable
                  key={c.id}
                  style={styles.row}
                  onPress={() => setAAsignar(c)}
                  accessibilityRole="button"
                  accessibilityLabel={`Asignar a ${c.nombre} ${c.apellido}, ${c.profesional?.especialidad?.nombre ?? 'sin especialidad'}`}
                >
                  <View style={styles.rowInfo}>
                    <Text style={styles.name}>{c.nombre} {c.apellido}</Text>
                    <Text style={styles.sub}>{c.profesional?.especialidad?.nombre} · {c.profesional?.matricula}</Text>
                  </View>
                  <AppIcon name="add-circle-outline" size={22} color={COLORS.primary} />
                </Tappable>
              ))
            )}
            {hayMas && <Text style={styles.empty}>Hay más resultados. Escribí más para afinar la búsqueda.</Text>}
            <Tappable
              style={styles.linkBtn}
              onPress={() => setEligiendo(false)}
              accessibilityRole="button"
              accessibilityLabel="Cancelar la asignación"
            >
              <Text style={styles.linkText}>Cancelar</Text>
            </Tappable>
          </View>
        ) : (
          <Tappable
            style={styles.addBtn}
            onPress={abrirSelector}
            accessibilityRole="button"
            accessibilityLabel="Asignar especialista al equipo"
          >
            <AppIcon name="person-add-outline" size={20} color={COLORS.primary} />
            <Text style={styles.addText}>Asignar especialista</Text>
          </Tappable>
        )}
      </View>

      <ConfirmDialog
        visible={!!aAsignar}
        title="¿Asignar al especialista?"
        message={`${aAsignar?.nombre ?? ''} ${aAsignar?.apellido ?? ''} podrá programar actividades de su especialidad y escribir reportes para este paciente.`}
        icon="person-add-outline"
        confirmLabel="Asignar"
        loading={trabajando}
        onCancel={() => setAAsignar(null)}
        onConfirm={asignar}
      />
      <ConfirmDialog
        visible={!!aQuitar}
        variant="danger"
        title="¿Quitar del equipo?"
        message={`${aQuitar?.profesional.usuario.nombre ?? ''} ${aQuitar?.profesional.usuario.apellido ?? ''} deja de tener acceso a este paciente. No se puede quitar si ya creó actividades para él.`}
        confirmLabel="Quitar"
        loading={trabajando}
        onCancel={() => setAQuitar(null)}
        onConfirm={quitar}
      />
      <Toast {...toast} onClose={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: SIZES.md },
  sectionTitle: { ...FONTS.caption, fontWeight: '700', color: '#556274', letterSpacing: 0.5, marginBottom: SIZES.xs, paddingHorizontal: 4 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, minHeight: 56,
    paddingHorizontal: SIZES.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  rowInfo: { flex: 1 },
  name: { ...FONTS.bodyBold, color: '#0F172A' },
  sub: { ...FONTS.caption, color: '#556274' },
  iconBtn: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SIZES.xs, minHeight: 52,
  },
  addText: { ...FONTS.bodyBold, color: COLORS.primary },
  selector: { padding: SIZES.sm },
  input: {
    ...FONTS.body, color: '#0F172A', borderWidth: 1, borderColor: COLORS.textMuted, borderRadius: 12,
    paddingHorizontal: SIZES.md, minHeight: 48, margin: SIZES.xs,
  },
  empty: { ...FONTS.caption, color: '#556274', textAlign: 'center', padding: SIZES.md },
  linkBtn: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  linkText: { ...FONTS.bodyBold, color: COLORS.primary },
});
