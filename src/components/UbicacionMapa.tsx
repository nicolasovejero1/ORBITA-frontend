import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { MapaSinConexion } from './MapaSinConexion';
import { construirHtmlMapa, datosMapa, MensajeMapa, UbicacionMapaProps } from './mapa-html';

export function UbicacionMapa(props: UbicacionMapaProps) {
  const webRef = useRef<WebView>(null);
  const cargado = useRef(false);
  const [sinConexion, setSinConexion] = useState(false);
  const datos = datosMapa(props);

  // El HTML se arma una sola vez; los cambios de posición se inyectan sin recargar la página.
  const html = useMemo(() => construirHtmlMapa(undefined, props.compacto), [props.compacto]);

  useEffect(() => {
    if (cargado.current) webRef.current?.injectJavaScript(`window.actualizar(${datos}); true;`);
  }, [datos]);

  const reintentar = () => {
    setSinConexion(false);
    cargado.current = false;
    webRef.current?.reload();
  };

  return (
    <View style={styles.map}>
      <WebView
        ref={webRef}
        source={{ html, baseUrl: 'https://pcd-app.local/' }}
        originWhitelist={['*']}
        javaScriptEnabled
        nestedScrollEnabled
        scrollEnabled={false}
        onLoadEnd={() => {
          cargado.current = true;
          webRef.current?.injectJavaScript(`window.actualizar(${datos}); true;`);
        }}
        onMessage={(e) => {
          const mensaje = e.nativeEvent.data as MensajeMapa;
          if (mensaje === 'sin-conexion') setSinConexion(true);
          else if (mensaje === 'ok') setSinConexion(false);
        }}
        onError={() => setSinConexion(true)}
        onHttpError={() => setSinConexion(true)}
        style={styles.webview}
      />
      {sinConexion ? <MapaSinConexion onReintentar={reintentar} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: '#F1F5F9' },
});
