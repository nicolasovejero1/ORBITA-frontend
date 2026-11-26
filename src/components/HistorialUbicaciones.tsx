import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ubicacionesApi } from '@/api/ubicaciones';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { Ubicacion } from '@/types/ubicacion.types';
import { direccionDe } from '@/utils/direccion';
import { agruparEstadias, Estadia, formatearDuracion } from '@/utils/recorrido';
import { AppIcon, Tappable } from '@/components/a11y';

const POR_PAGINA = 50;
/** Cuántos lugares se traducen a dirección por vez (el servicio del teléfono tiene límite de consultas). */
const MAX_DIRECCIONES = 20;

const dosDigitos = (n: number) => String(n).padStart(2, '0');

function inicioDelDia(dia: Date) {
  return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 0, 0, 0, 0);
}
function finDelDia(dia: Date) {
  return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), 23, 59, 59, 999);
}
function mismoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function horaDe(iso: string) {
  const f = new Date(iso);
  return `${dosDigitos(f.getHours())}:${dosDigitos(f.getMinutes())}`;
}
function etiquetaDia(dia: Date) {
  const hoy = new Date();
  const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
  if (mismoDia(dia, hoy)) return 'Hoy';
  if (mismoDia(dia, ayer)) return 'Ayer';
  return dia.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/**
 * Recorrido del día con selector de día: los registros se juntan en "estuvo en
 * tal lugar de X a Y", con la dirección cuando el teléfono puede averiguarla, y
 * cada lugar se muestra en el mapa de la app (`onElegir`). Se piden de a 50; "Ver más" trae los anteriores.
 */
export interface PuntoElegido {
  estadia: Estadia;
  /** "10:05 a 11:20" */
  horario: string;
  direccion: string | null;
}

export function HistorialUbicaciones({ pcdId, nombre, elegidoId, onElegir }: {
  pcdId: number;
  nombre: string;
  /** Tramo que se está mostrando en el mapa, para resaltarlo. */
  elegidoId?: number | null;
  onElegir?: (punto: PuntoElegido) => void;
}) {
  const [dia, setDia] = useState(() => new Date());
  const [items, setItems] = useState<Ubicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [hayMas, setHayMas] = useState(false);
  const [error, setError] = useState(false);
  const [direcciones, setDirecciones] = useState<Record<number, string>>({});

  const estadias = useMemo(() => agruparEstadias(items), [items]);

  // Traduce a dirección los lugares todavía sin nombre, de a uno.
  useEffect(() => {
    let vigente = true;
    (async () => {
      for (const e of estadias.slice(0, MAX_DIRECCIONES)) {
        if (!vigente) return;
        if (direcciones[e.id] !== undefined) continue;
        const texto = await direccionDe(e.latitud, e.longitud);
        if (!vigente) return;
        if (texto) setDirecciones((previas) => ({ ...previas, [e.id]: texto }));
      }
    })();
    return () => { vigente = false; };
    // `direcciones` queda fuera a propósito: cada respuesta no tiene que relanzar la cola.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadias]);

  const pedir = useCallback(async (antes?: number) => {
    const lista = await ubicacionesApi.getHistorial(pcdId, {
      desde: inicioDelDia(dia).toISOString(),
      hasta: finDelDia(dia).toISOString(),
      limite: POR_PAGINA,
      ...(antes && { antes }),
    });
    return lista;
  }, [pcdId, dia]);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(false);
    pedir()
      .then((lista) => {
        if (!vigente) return;
        setItems(lista);
        setHayMas(lista.length === POR_PAGINA);
      })
      .catch(() => vigente && setError(true))
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [pedir]);

  const verMas = async () => {
    const ultimo = items[items.length - 1];
    if (!ultimo) return;
    setCargando(true);
    try {
      const lista = await pedir(ultimo.id);
      setItems((previas) => [...previas, ...lista]);
      setHayMas(lista.length === POR_PAGINA);
    } catch {
      setError(true);
    } finally {
      setCargando(false);
    }
  };

  const cambiarDia = (delta: number) =>
    setDia((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta));
  const esHoy = mismoDia(dia, new Date());

  return (
    <View style={styles.card} accessibilityLabel={`Historial de ubicaciones de ${nombre}`}>
      <Text style={styles.titulo} accessibilityRole="header">Historial</Text>
      <View style={styles.selector}>
        <Tappable centrado
          style={styles.flecha}
          onPress={() => cambiarDia(-1)}
          accessibilityRole="button"
          accessibilityLabel="Ver el día anterior"
        >
          <AppIcon name="chevron-back" size={22} color={COLORS.primary} />
        </Tappable>
        <Text style={styles.dia}>{etiquetaDia(dia)}</Text>
        <Tappable centrado
          style={[styles.flecha, esHoy && styles.flechaOff]}
          onPress={() => cambiarDia(1)}
          disabled={esHoy}
          accessibilityRole="button"
          accessibilityLabel="Ver el día siguiente"
          accessibilityState={{ disabled: esHoy }}
        >
          <AppIcon name="chevron-forward" size={22} color={COLORS.primary} />
        </Tappable>
      </View>

      {error ? (
        <Text style={styles.vacio}>No se pudo cargar el historial</Text>
      ) : cargando && items.length === 0 ? (
        <ActivityIndicator accessibilityLabel="Cargando" color={COLORS.primary} style={{ margin: SIZES.md }} />
      ) : items.length === 0 ? (
        <Text style={styles.vacio}>Sin ubicaciones registradas ese día</Text>
      ) : (
        <>
          <Text style={styles.resumen}>
            {estadias.length} {estadias.length === 1 ? 'lugar' : 'lugares'}{hayMas ? ' o más' : ''}
          </Text>
          {estadias.map((e) => {
            const horario = e.desde === e.hasta || horaDe(e.desde) === horaDe(e.hasta)
              ? horaDe(e.desde)
              : `${horaDe(e.desde)} a ${horaDe(e.hasta)}`;
            const duracion = formatearDuracion(e.desde, e.hasta);
            const lugar = direcciones[e.id] ?? 'Sin dirección. Tocá para verlo en el mapa';
            const elegido = elegidoId === e.id;
            return (
              <Tappable
                key={e.id}
                style={[styles.fila, elegido && styles.filaElegida]}
                onPress={() => onElegir?.({ estadia: e, horario, direccion: direcciones[e.id] ?? null })}
                accessibilityRole="button"
                selected={elegido}
                accessibilityLabel={`${horario}${duracion ? `, ${duracion}` : ''}. ${direcciones[e.id] ? `Estuvo en ${direcciones[e.id]}` : 'Lugar sin dirección'}. Ver en el mapa`}
              >
                <AppIcon name="location" size={18} color={COLORS.primary} />
                <View style={styles.filaTexto}>
                  <Text style={styles.horario}>
                    {horario}{duracion ? `  ·  ${duracion}` : ''}
                  </Text>
                  <Text style={[styles.lugar, !direcciones[e.id] && styles.lugarLink]} numberOfLines={2}>{lugar}</Text>
                </View>
                <AppIcon name="map-outline" size={16} color={elegido ? COLORS.primary : COLORS.textMuted} />
              </Tappable>
            );
          })}
          {hayMas && (
            <Tappable
              style={styles.verMas}
              onPress={verMas}
              disabled={cargando}
              accessibilityRole="button"
              accessibilityLabel="Ver ubicaciones anteriores de ese día"
            >
              {cargando ? <ActivityIndicator accessibilityLabel="Cargando" color={COLORS.primary} /> : <Text style={styles.verMasText}>Ver más</Text>}
            </Tappable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0',
    padding: SIZES.md, marginTop: SIZES.md,
  },
  titulo: { ...FONTS.bodyBold, color: '#0F172A', marginBottom: SIZES.xs },
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  flecha: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  flechaOff: { opacity: 0.3 },
  dia: { ...FONTS.bodyBold, color: COLORS.primary, textTransform: 'capitalize', flex: 1, textAlign: 'center' },
  resumen: { ...FONTS.caption, color: '#556274', marginBottom: SIZES.xs },
  fila: {
    flexDirection: 'row', alignItems: 'center', gap: SIZES.sm, minHeight: 56, paddingVertical: SIZES.xs,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  filaElegida: { backgroundColor: '#EEF2FF', borderRadius: 10, paddingHorizontal: SIZES.xs },
  filaTexto: { flex: 1 },
  horario: { ...FONTS.bodyBold, color: '#0F172A' },
  lugar: { ...FONTS.caption, color: '#475569', marginTop: 2 },
  lugarLink: { color: COLORS.primary, fontWeight: '600' },
  vacio: { ...FONTS.caption, color: '#556274', textAlign: 'center', padding: SIZES.md },
  verMas: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  verMasText: { ...FONTS.bodyBold, color: COLORS.primary },
});
