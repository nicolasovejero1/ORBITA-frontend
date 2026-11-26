import { createElement, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MapaSinConexion } from './MapaSinConexion';
import { construirHtmlMapa, datosMapa, FUENTE_MENSAJE, MensajeMapa, UbicacionMapaProps } from './mapa-html';

/** Versión web: react-native-webview no funciona en el navegador, así que se usa un iframe con el mismo mapa. */
export function UbicacionMapa(props: UbicacionMapaProps) {
  const html = construirHtmlMapa(datosMapa(props), props.compacto);
  const [sinConexion, setSinConexion] = useState(false);
  // Cambiar la key vuelve a montar el iframe, que es la forma de reintentar la carga.
  const [intento, setIntento] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const escuchar = (e: MessageEvent<{ fuente?: string; tipo?: MensajeMapa }>) => {
      if (e.source !== iframeRef.current?.contentWindow || e.data?.fuente !== FUENTE_MENSAJE) return;
      if (e.data.tipo === 'sin-conexion') setSinConexion(true);
      else if (e.data.tipo === 'ok') setSinConexion(false);
    };
    window.addEventListener('message', escuchar);
    return () => window.removeEventListener('message', escuchar);
  }, []);

  const reintentar = () => {
    setSinConexion(false);
    setIntento((n) => n + 1);
  };

  return (
    <View style={styles.map}>
      {createElement('iframe', {
        key: intento,
        ref: iframeRef,
        srcDoc: html,
        title: props.titulo,
        style: { border: 0, width: '100%', height: '100%' },
      })}
      {sinConexion ? <MapaSinConexion onReintentar={reintentar} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, borderRadius: 16, overflow: 'hidden' },
});
