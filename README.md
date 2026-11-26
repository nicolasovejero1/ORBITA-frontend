# Trabajo Final: Frontend

Aplicación móvil para la gestión de personas con discapacidad (PCD), sus tutores y los profesionales a cargo. Permite administrar usuarios y vínculos, programar y confirmar actividades (medicamentos, terapias, ejercicios), generar reportes de progreso, recibir notificaciones y compartir la ubicación en vivo.

Es el cliente del backend de este proyecto (repositorio aparte). Hay cuatro roles, con una pantalla de inicio y un menú propios: Administrador, Profesional, Tutor y PCD.

## Tecnologías

- **React Native** con **Expo SDK 56** y **Expo Router** (navegación por archivos).
- **TypeScript**.
- **Axios** para la API, con renovación automática del token.
- **socket.io-client** para la ubicación en vivo.
- **Jest** y **React Native Testing Library** para las pruebas.
- **pnpm** como gestor de paquetes.

## Requisitos

- Node.js 22 o superior.
- pnpm (`corepack enable` si no está instalado).
- El backend en funcionamiento (ver su README) o acceso al backend desplegado.
- Para ver la app, cualquiera de estas opciones:
  - **Navegador web** (la más simple para probarla, no requiere nada más).
  - La aplicación **Expo Go** en un celular.
  - Un emulador de Android o iOS.

## Instalación

```bash
pnpm install
cp .env.example .env
```

En `.env` se debe indicar, en `EXPO_PUBLIC_API_URL`, la dirección del backend:

| Dónde corre la app | Valor de `EXPO_PUBLIC_API_URL` |
|---|---|
| Navegador web en la misma PC | `http://localhost:3000` |
| Emulador de Android | Puede quedar sin definir: usa `http://10.0.2.2:3000` |
| Celular físico (Expo Go) | `http://<IP de la PC en la red local>:3000` (el celular y la PC deben estar en la misma red) |
| Simulador de iOS | `http://localhost:3000` |

Si no se define, la app apunta a `http://localhost:3000` (o a `http://10.0.2.2:3000` en el emulador de Android). Una APK compilada fija su propia dirección al generarse y no depende de esta variable.

## Ejecución

```bash
pnpm run web        # abre la app en el navegador
pnpm start          # abre Expo; se escanea el QR con Expo Go
pnpm run android    # emulador de Android
pnpm run ios        # simulador de iOS (solo en macOS)
```

### Probar en el navegador

La app también se puede abrir en la web, sin instalar nada en el celular, y es la forma más rápida de revisarla:

1. Dejar el backend en marcha (por defecto en `http://localhost:3000`) y definir `EXPO_PUBLIC_API_URL=http://localhost:3000` en `.env`.
2. Ejecutar `pnpm run web`. Expo abre la app en `http://localhost:8081`.
3. Iniciar sesión con alguna de las cuentas de la tabla de abajo.

Notas sobre la versión web:

- El backend acepta por defecto pedidos desde `http://localhost:8081`. Si la web se abre en otra dirección, esa dirección debe agregarse a `CORS_ORIGINS` en el `.env` del backend.
- Si `EXPO_PUBLIC_API_URL` apunta a un backend desplegado, el navegador puede bloquear los pedidos cuando ese servidor no permite el origen `http://localhost:8081`. Para probar la web conviene usar el backend local.
- Las **notificaciones push** y el **envío automático de ubicación en segundo plano** no existen en la web. El resto de las pantallas funciona igual, incluido el mapa y la ubicación en vivo.

## Usuarios de prueba

Para iniciar sesión se usa el **correo electrónico** y la contraseña. Con los datos de ejemplo del backend (`pnpm run seed`), la contraseña de todos es `admin123`:

| Rol | Email |
|---|---|
| Administrador | `admin@pcd.com` |
| Profesional con permisos de administrador | `laura.gomez@pcd.com` |
| Profesional | `profesional@gmail.com` |
| Tutor | `tutor@gmail.com` |
| PCD | `pcd@gmail.com` |

## Pruebas

```bash
pnpm test
```

## Limitaciones en Expo Go y en la web

- Las **notificaciones push** y la **ubicación en segundo plano** requieren un build nativo (APK). En Expo Go funcionan de forma parcial y en la web no están disponibles. El resto de la app funciona igual.

## Estructura

```
app/        rutas de Expo Router (cada archivo es una pantalla)
src/
  api/          cliente HTTP y un módulo por recurso del backend
  components/   componentes compartidos (barra inferior, diálogos, sistema de diseño)
  pages/        el contenido de cada pantalla
  hooks/        hooks (ubicación, notificaciones, carga de datos)
  store/        estado de sesión
  tasks/        tarea de ubicación en segundo plano
  constants/    configuración, colores y tamaños
  utils/        utilidades
assets/     íconos, logo y pantalla de carga
```
