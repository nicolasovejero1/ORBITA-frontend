import { StyleSheet, Text, View } from 'react-native';
import { DateData } from 'react-native-calendars';
import { Tappable } from '@/components/a11y';
import { DS } from '@/constants/tokens';
import { EstadoInstancia } from '@/types/actividad.types';
import { formatFechaLocal } from '@/utils/date';

export const ESTADO_COLOR: Record<EstadoInstancia, string> = {
  REALIZADA: '#0F766E',
  PENDIENTE: '#B45309',
  CANCELADA: '#B91C1C',
};
export const ESTADO_LABEL: Record<EstadoInstancia, string> = {
  REALIZADA: 'Realizada',
  PENDIENTE: 'Pendiente',
  CANCELADA: 'Cancelada',
};
const PLURAL: Record<EstadoInstancia, [string, string]> = {
  REALIZADA: ['realizada', 'realizadas'],
  PENDIENTE: ['pendiente', 'pendientes'],
  CANCELADA: ['cancelada', 'canceladas'],
};

export type ConteoDia = Partial<Record<EstadoInstancia, number>>;

/**
 * Marca de cada estado: la forma lo distingue sin depender del color
 * (círculo = realizada, cuadrado = pendiente, rombo = cancelada).
 */
export function MarcaEstado({ estado, size = 8 }: { estado: EstadoInstancia; size?: number }) {
  const base = { width: size, height: size, backgroundColor: ESTADO_COLOR[estado] };
  const forma =
    estado === 'REALIZADA' ? { borderRadius: size / 2 }
      : estado === 'CANCELADA' ? { transform: [{ rotate: '45deg' }, { scale: 0.85 }] }
        : { borderRadius: 1 };
  return <View style={[base, forma]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}

const ESTADOS = Object.keys(ESTADO_COLOR) as EstadoInstancia[];

function etiquetaDia(fecha: string, conteo: ConteoDia | undefined, seleccionado: boolean): string {
  const base = formatFechaLocal(fecha, { weekday: 'long', day: 'numeric', month: 'long' });
  const partes = ESTADOS.filter((e) => conteo?.[e]).map((e) => {
    const n = conteo![e]!;
    return `${n} ${PLURAL[e][n === 1 ? 0 : 1]}`;
  });
  const sesiones = partes.length > 0 ? `, ${partes.join(', ')}` : ', sin sesiones';
  return `${base}${sesiones}`;
}

/** Celda de día del calendario: 48 dp, etiqueta con el conteo y una marca con forma por estado. */
export function CalendarioDia({ date, state, marking, onPress }: {
  date?: DateData;
  state?: string;
  marking?: { conteo?: ConteoDia; selected?: boolean };
  onPress?: (d: DateData) => void;
}) {
  if (!date) return null;
  const seleccionado = !!marking?.selected;
  const fueraDeMes = state === 'disabled';
  return (
    <Tappable
      style={[styles.celda, seleccionado && styles.celdaSel]}
      onPress={() => onPress?.(date)}
      accessibilityRole="button"
      accessibilityLabel={etiquetaDia(date.dateString, marking?.conteo, seleccionado)}
      selected={seleccionado}
    >
      <Text style={[styles.num, state === 'today' && styles.hoy, fueraDeMes && styles.fuera, seleccionado && styles.numSel]}>
        {date.day}
      </Text>
      <View style={styles.marcas}>
        {ESTADOS.filter((e) => marking?.conteo?.[e]).map((e) => <MarcaEstado key={e} estado={e} />)}
      </View>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  celda: { width: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 3 },
  celdaSel: { backgroundColor: DS.colors.primary },
  num: { fontFamily: DS.font.medium, fontSize: 16, color: DS.colors.text },
  numSel: { color: DS.colors.onPrimary, fontFamily: DS.font.bold },
  hoy: { color: DS.colors.accent, fontFamily: DS.font.bold },
  fuera: { color: DS.colors.textTertiary },
  marcas: { flexDirection: 'row', gap: 3, height: 10, alignItems: 'center' },
});
