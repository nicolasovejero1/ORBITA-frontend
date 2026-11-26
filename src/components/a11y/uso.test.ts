/// <reference types="node" />
import * as fs from 'fs';
import * as path from 'path';

function archivos(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'a11y' ? [] : archivos(p);
    return /\.tsx$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });
}

// Mantiene la regla de accesibilidad del proyecto: el código nuevo no vuelve a lo que no avisa al lector de pantalla.
describe('uso de los componentes accesibles', () => {
  const src = path.resolve(__dirname, '../..');
  const todos = archivos(src);

  it.each([
    ['<TouchableOpacity', 'usar Tappable'],
    ['<Ionicons', 'usar AppIcon'],
  ])('ninguna pantalla ni componente usa %s (%s)', (prohibido) => {
    const infractores = todos.filter((f) => fs.readFileSync(f, 'utf8').includes(prohibido)).map((f) => path.relative(src, f));
    expect(infractores).toEqual([]);
  });
});
