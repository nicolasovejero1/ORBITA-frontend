import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { actividadesApi } from '@/api/actividades';
import { AppIcon, Tappable } from '@/components/a11y';
import { CalendarioDia, ConteoDia, ESTADO_COLOR, ESTADO_LABEL, MarcaEstado } from '@/components/CalendarioDia';
import { Button, Card, Chip, OrbitDecor, ProgressRing, ScreenHeader } from '@/components/ds';
import type { ChipTone } from '@/components/ds';
import { DS } from '@/constants/tokens';
import { useAsyncData } from '@/hooks/useAsyncData';
import { Actividad, ActividadInstancia, EstadoInstancia } from '@/types/actividad.types';
import { formatFechaLocal, hoyLocal } from '@/utils/date';
import { volver } from '@/utils/navegacion';

interface DiaItem {
  actividad: Actividad;
  instancia: ActividadInstancia;
}

const ESTADO_TONO: Record<EstadoInstancia, ChipTone> = {
  REALIZADA: 'success',
  PENDIENTE: 'warning',
  CANCELADA: 'neutral',
};

const NOMBRE_MES = new Intl.DateTimeFormat('es-AR', { month: 'long' });

export default function CalendarioScreen() {
  const router = useRouter();
  // El loader tiene que ser estable: useAsyncData recarga cada vez que cambia su identidad.
  const cargarLoader = useCallback(() => actividadesApi.getAll(), []);
  const { data, loading, error, reload } = useAsyncData<Actividad[]>(cargarLoader);
  const actividades = data ?? [];
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(hoyLocal());
  // Mes que se está mirando (AAAA-MM), para el resumen de arriba.
  const [mes, setMes] = useState(hoyLocal().slice(0, 7));

  const onRefresh = () => {
    setRefreshing(true);
    void reload().finally(() => setRefreshing(false));
  };

  const markedDates: Record<string, any> = {};
  actividades.forEach((act) => {
    (act.instancias ?? []).forEach((inst) => {
      const fecha = inst.fechaProgramada.slice(0, 10);
      if (!markedDates[fecha]) markedDates[fecha] = { conteo: {} as ConteoDia };
      const conteo: ConteoDia = markedDates[fecha].conteo;
      conteo[inst.estado] = (conteo[inst.estado] ?? 0) + 1;
    });
  });
  markedDates[selectedDate] = {
    ...(markedDates[selectedDate] ?? {}),
    selected: true,
    selectedColor: DS.colors.primary,
  };

  const instanciasDelDia: DiaItem[] = [];
  const delMes: ActividadInstancia[] = [];
  actividades.forEach((act) => {
    (act.instancias ?? []).forEach((inst) => {
      const fecha = inst.fechaProgramada.slice(0, 10);
      if (fecha === selectedDate) instanciasDelDia.push({ actividad: act, instancia: inst });
      if (fecha.startsWith(mes)) delMes.push(inst);
    });
  });
  // Por horario de inicio; las sesiones sin horario van al final del día.
  instanciasDelDia.sort((a, b) =>
    (a.actividad.horarioInicio ?? '99:99').localeCompare(b.actividad.horarioInicio ?? '99:99'),
  );

  const completadas = instanciasDelDia.filter((d) => d.instancia.estado === 'REALIZADA').length;
  const pendientes = instanciasDelDia.filter((d) => d.instancia.estado === 'PENDIENTE').length;
  const canceladas = instanciasDelDia.filter((d) => d.instancia.estado === 'CANCELADA').length;

  // Resumen del mes: lo cancelado no cuenta para el avance.
  const mesValidas = delMes.filter((i) => i.estado !== 'CANCELADA');
  const mesRealizadas = mesValidas.filter((i) => i.estado === 'REALIZADA').length;
  const mesPendientes = mesValidas.length - mesRealizadas;
  const mesPorcentaje = mesValidas.length > 0 ? (mesRealizadas / mesValidas.length) * 100 : 0;
  const [anio, nroMes] = mes.split('-').map(Number);
  const tituloMes = `${NOMBRE_MES.format(new Date(anio, nroMes - 1, 1))} ${anio}`;

  const cabecera = (
    <View style={styles.cabeceraLista}>
      <Card dark featured style={styles.resumen}>
        <OrbitDecor />
        <ProgressRing percent={mesPorcentaje} size={92} stroke={9} />
        <View style={styles.flex}>
          <Text style={styles.resumenTitulo}>Avance de {tituloMes}</Text>
          <View style={styles.resumenNumeros}>
            <View>
              <Text style={styles.resumenValor}>{mesValidas.length}</Text>
              <Text style={styles.resumenLabel}>Sesiones</Text>
            </View>
            <View>
              <Text style={styles.resumenValor}>{mesRealizadas}</Text>
              <Text style={styles.resumenLabel}>Realizadas</Text>
            </View>
            <View>
              <Text style={styles.resumenValor}>{mesPendientes}</Text>
              <Text style={styles.resumenLabel}>Pendientes</Text>
            </View>
          </View>
        </View>
      </Card>

      <Card style={styles.calendarioCard}>
        <Calendar
          current={selectedDate}
          onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
          onMonthChange={(m: DateData) => setMes(m.dateString.slice(0, 7))}
          markedDates={markedDates}
          dayComponent={CalendarioDia as any}
          theme={{
            todayTextColor: DS.colors.accent,
            selectedDayBackgroundColor: DS.colors.primary,
            arrowColor: DS.colors.text,
            dotColor: DS.colors.primary,
            textSectionTitleColor: DS.colors.textTertiary,
            dayTextColor: DS.colors.text,
            monthTextColor: DS.colors.text,
            textMonthFontFamily: DS.font.bold,
            textMonthFontSize: 18,
            textDayHeaderFontFamily: DS.font.semibold,
            textDayHeaderFontSize: 12,
            calendarBackground: DS.colors.surface,
          }}
        />
      </Card>

      <View style={styles.leyenda}>
        {(Object.keys(ESTADO_COLOR) as EstadoInstancia[]).map((e) => (
          <View key={e} style={styles.leyendaItem}>
            <MarcaEstado estado={e} />
            <Text style={styles.leyendaTexto}>{ESTADO_LABEL[e]}</Text>
          </View>
        ))}
      </View>

      <View style={styles.diaHeader}>
        <Text style={styles.diaTitulo} accessibilityRole="header">
          {formatFechaLocal(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
        {instanciasDelDia.length > 0 && (
          <View style={styles.diaChips}>
            {completadas > 0 && <Chip label={`${completadas} ok`} tone="success" />}
            {pendientes > 0 && <Chip label={`${pendientes} pend.`} tone="warning" />}
            {canceladas > 0 && <Chip label={`${canceladas} canc.`} tone="neutral" />}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScreenHeader
        titulo="Calendario"
        subtitulo="Sesiones programadas"
        onVolver={() => volver(router, '/(app)')}
        volverLabel="Volver al inicio"
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator accessibilityLabel="Cargando" size="large" color={DS.colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <View style={styles.vacioIcono}><AppIcon name="alert-circle-outline" size={32} color={DS.colors.textTertiary} /></View>
          <Text style={styles.vacioTexto}>{error}</Text>
          <Button label="Reintentar" variant="secondary" height={48} onPress={reload} accessibilityLabel="Reintentar cargar el calendario" />
        </View>
      ) : (
        <FlatList
          data={instanciasDelDia}
          keyExtractor={(d) => `${d.actividad.id}-${d.instancia.id}`}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={cabecera}
          ListEmptyComponent={
            <Card style={styles.vacioCard}>
              <AppIcon name="calendar-outline" size={32} color={DS.colors.textTertiary} />
              <Text style={styles.vacioTexto}>Sin programación este día</Text>
            </Card>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={DS.colors.primary} colors={[DS.colors.primary]} />
          }
          renderItem={({ item }) => {
            const color = ESTADO_COLOR[item.instancia.estado];
            const hora = item.actividad.horarioInicio?.slice(0, 5);
            return (
              <Tappable
                accessibilityRole="button"
                accessibilityLabel={`${item.actividad.titulo}, ${item.actividad.pcd.usuario.nombre} ${item.actividad.pcd.usuario.apellido}${hora ? `, ${hora}` : ''}, ${ESTADO_LABEL[item.instancia.estado]}`}
                style={styles.sesion}
                onPress={() => router.navigate(`/(app)/actividades/${item.actividad.id}` as any)}
                activeOpacity={0.85}
              >
                <View style={[styles.sesionBarra, { backgroundColor: color }]} />
                <View style={styles.sesionHora}>
                  <Text style={styles.sesionHoraTexto}>{hora ?? '--:--'}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.sesionTitulo} numberOfLines={1}>{item.actividad.titulo}</Text>
                  <View style={styles.sesionPersona}>
                    <AppIcon name="person-outline" size={14} color={DS.colors.textTertiary} />
                    <Text style={styles.sesionPersonaTexto} numberOfLines={1}>
                      {item.actividad.pcd.usuario.nombre} {item.actividad.pcd.usuario.apellido}
                    </Text>
                  </View>
                </View>
                <Chip label={ESTADO_LABEL[item.instancia.estado]} tone={ESTADO_TONO[item.instancia.estado]} />
              </Tappable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: DS.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  lista: { paddingHorizontal: DS.space.screen, paddingTop: 8, paddingBottom: 56, gap: 10 },
  cabeceraLista: { gap: 14, marginBottom: 4 },

  resumen: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 18, overflow: 'hidden' },
  resumenTitulo: { fontFamily: DS.font.semibold, fontSize: 14, color: DS.colors.onPrimaryMuted, textTransform: 'capitalize' },
  resumenNumeros: { flexDirection: 'row', gap: 20, marginTop: 8 },
  resumenValor: { fontFamily: DS.font.bold, fontSize: 26, color: DS.colors.onPrimary },
  resumenLabel: { fontFamily: DS.font.regular, fontSize: 12, color: DS.colors.onPrimaryMuted },

  calendarioCard: { overflow: 'hidden', paddingBottom: 6 },
  leyenda: { flexDirection: 'row', justifyContent: 'center', gap: 18 },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leyendaTexto: { fontFamily: DS.font.medium, fontSize: 13, color: DS.colors.textSecondary },

  diaHeader: { gap: 8, marginTop: 6 },
  diaTitulo: { fontFamily: DS.font.bold, fontSize: 18, color: DS.colors.text, textTransform: 'capitalize' },
  diaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  sesion: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 14, overflow: 'hidden', minHeight: 76,
    backgroundColor: DS.colors.surface, borderRadius: DS.radius.card, borderWidth: DS.border, borderColor: DS.colors.border,
  },
  sesionBarra: { width: 5, alignSelf: 'stretch' },
  sesionHora: {
    minWidth: 56, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center',
    backgroundColor: DS.colors.background,
  },
  sesionHoraTexto: { fontFamily: DS.font.bold, fontSize: 14, color: DS.colors.text },
  sesionTitulo: { fontFamily: DS.font.bold, fontSize: 15, color: DS.colors.text },
  sesionPersona: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  sesionPersonaTexto: { flexShrink: 1, fontFamily: DS.font.medium, fontSize: 13, color: DS.colors.textTertiary },

  vacioCard: { alignItems: 'center', gap: 8, padding: 24 },
  vacioIcono: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: DS.colors.surface,
    borderWidth: DS.border, borderColor: DS.colors.border, alignItems: 'center', justifyContent: 'center',
  },
  vacioTexto: { fontFamily: DS.font.regular, fontSize: 14, lineHeight: 20, color: DS.colors.textSecondary, textAlign: 'center' },
});
