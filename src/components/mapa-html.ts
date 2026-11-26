import { COLORS } from '@/constants/theme';

export interface UbicacionMapaProps {
  latitud: number;
  longitud: number;
  precision?: number;
  titulo: string;
  /** Mapa chico de vista previa: sin botones de zoom. */
  compacto?: boolean;
}

/** Marca de los mensajes que el iframe (versión web) le manda a la app, para filtrar otros `message`. */
export const FUENTE_MENSAJE = 'pcd-mapa';

/** Mensajes que manda la página del mapa: falló la carga (sin internet) o se recuperó. */
export type MensajeMapa = 'sin-conexion' | 'ok';

/**
 * Datos que la página del mapa recibe en `window.actualizar(...)`, serializados como literal JS.
 * Se escapa `<` para que un nombre con `</script>` no pueda cortar el script de la página.
 */
export function datosMapa({ latitud, longitud, precision, titulo }: UbicacionMapaProps) {
  return JSON.stringify({ latitud, longitud, precision: precision ?? null, titulo })
    .replace(/</g, '\\u003c');
}

/**
 * Página HTML con un mapa Leaflet sobre las teselas estándar de OpenStreetMap.
 * Reemplaza a react-native-maps, que en Android exige una clave de Google Maps.
 * Antes se usaban las teselas de CARTO, pero ahora piden API key (devolvían una
 * imagen con "API KEY REQUIRED" en lugar de las calles). OpenStreetMap no pide
 * clave; su política de uso exige mostrar la atribución y mandar un Referer,
 * que sale del `baseUrl` del WebView.
 * Si se pasan `datosIniciales`, el mapa se dibuja al cargar; si no, espera a `window.actualizar(...)`.
 */
export function construirHtmlMapa(datosIniciales?: string, compacto = false) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #F1F5F9; }
  .pcd-ring { width: 28px; height: 28px; border-radius: 14px; background: rgba(76,58,142,0.25);
    display: flex; align-items: center; justify-content: center; }
  .pcd-dot { width: 14px; height: 14px; border-radius: 7px; background: ${COLORS.primary};
    border: 2px solid #ffffff; box-sizing: border-box; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  // Avisa a la app ('sin-conexion' | 'ok'): por el puente del WebView en el celular, o al padre del iframe en web.
  function avisar(tipo) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(tipo);
    else if (window.parent !== window) window.parent.postMessage({ fuente: '${FUENTE_MENSAJE}', tipo: tipo }, '*');
  }
  window.actualizar = function () {};

  (function () {
  // Sin internet no se baja Leaflet: no hay mapa que dibujar.
  if (typeof L === 'undefined') { avisar('sin-conexion'); return; }

  var map = L.map('map', { zoomControl: ${!compacto}, attributionControl: true });
  var falloTeselas = false;
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).on('tileerror', function () {
    if (!falloTeselas) { falloTeselas = true; avisar('sin-conexion'); }
  }).on('tileload', function () {
    if (falloTeselas) { falloTeselas = false; avisar('ok'); }
  }).addTo(map);

  var icono = L.divIcon({ className: '', html: '<div class="pcd-ring"><div class="pcd-dot"></div></div>',
    iconSize: [28, 28], iconAnchor: [14, 14] });
  var capa = L.layerGroup().addTo(map);

  window.actualizar = function (d) {
    capa.clearLayers();
    var centro = [d.latitud, d.longitud];
    if (d.precision) {
      L.circle(centro, { radius: d.precision, color: 'rgba(76,58,142,0.4)', weight: 1,
        fillColor: 'rgba(76,58,142,0.12)', fillOpacity: 1 }).addTo(capa);
    }
    var etiqueta = document.createElement('span');
    etiqueta.textContent = d.titulo;
    L.marker(centro, { icon: icono }).bindPopup(etiqueta).addTo(capa);
    map.setView(centro, 16);
  };
  })();

  ${datosIniciales ? `window.actualizar(${datosIniciales});` : ''}
</script>
</body>
</html>`;
}
