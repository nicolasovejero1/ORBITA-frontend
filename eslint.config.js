// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");
const a11y = require("eslint-plugin-react-native-a11y");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Accesibilidad (WCAG 2.2 AA): avisa, no bloquea. Para todo lo que se toca se usa
    // `Tappable` (src/components/a11y), que exige rol y etiqueta en el tipo.
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-native-a11y": a11y },
    rules: {
      ...Object.fromEntries(Object.keys(a11y.rules).map((r) => [`react-native-a11y/${r}`, "warn"])),
      // Un hint repite lo que ya dicen el rol y la etiqueta; se usa solo donde aclara algo.
      "react-native-a11y/has-accessibility-hint": "off",
    },
  },
  {
    // Archivo de arranque de Jest: usa el global `jest` (mocks de módulos nativos).
    files: ["jest.setup.js"],
    languageOptions: { globals: { jest: "readonly" } },
  },
  {
    rules: {
      // El patrón `useEffect(() => { cargar(); }, [deps])` para fetch de datos en
      // mount/cambio de dependencias es el estándar en toda la app (sin
      // React Query/SWR). Esta regla lo trata como anti-patrón; se baja a
      // warning en vez de reescribir ~20 pantallas que ya funcionan así.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);
