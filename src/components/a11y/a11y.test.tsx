import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { CalendarioDia } from '@/components/CalendarioDia';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SelectField } from '@/components/SelectField';
import { AppIcon, AppTextInput, MIN_TOUCH, Tappable } from '.';

describe('Tappable', () => {
  it('se anuncia con su rol y su etiqueta, y responde al toque', async () => {
    const onPress = jest.fn();
    await render(
      <Tappable accessibilityRole="button" accessibilityLabel="Guardar" onPress={onPress}>
        <Text>Guardar</Text>
      </Tappable>,
    );
    const boton = screen.getByRole('button', { name: 'Guardar' });
    await fireEvent.press(boton);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('mide al menos 48 dp aunque el estilo no lo pida', async () => {
    await render(
      <Tappable accessibilityRole="button" accessibilityLabel="Cerrar" style={{ padding: 2 }} />,
    );
    const estilo = StyleSheet.flatten(screen.getByRole('button', { name: 'Cerrar' }).props.style);
    expect(estilo.minHeight).toBe(MIN_TOUCH);
    expect(estilo.minWidth).toBe(MIN_TOUCH);
  });

  it('comunica seleccionado, desplegado y deshabilitado', async () => {
    await render(
      <Tappable accessibilityRole="radio" accessibilityLabel="Opción" selected expanded={false} disabled />,
    );
    const el = screen.getByRole('radio', { name: 'Opción' });
    expect(el.props.accessibilityState).toMatchObject({ selected: true, expanded: false, disabled: true });
  });
});

describe('AppIcon', () => {
  it('es decorativo: queda oculto al lector de pantalla', async () => {
    await render(<AppIcon name="close" testID="icono" />);
    const icono = screen.getByTestId('icono', { includeHiddenElements: true });
    expect(icono.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(icono.props.accessibilityElementsHidden).toBe(true);
  });
});

describe('AppTextInput', () => {
  it('se encuentra por su etiqueta y tiene alto mínimo de 48 dp', async () => {
    await render(<AppTextInput accessibilityLabel="Buscar paciente" placeholder="Buscar..." />);
    const campo = screen.getByLabelText('Buscar paciente');
    expect(StyleSheet.flatten(campo.props.style).minHeight).toBe(MIN_TOUCH);
  });
});

describe('ConfirmDialog', () => {
  it('sus botones tienen rol y nombre', async () => {
    const onConfirm = jest.fn();
    await render(
      <ConfirmDialog visible title="¿Eliminar?" confirmLabel="Eliminar" onConfirm={onConfirm} onCancel={() => {}} />,
    );
    expect(screen.getByRole('header', { name: '¿Eliminar?' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Volver' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar' }));
    expect(onConfirm).toHaveBeenCalled();
  });
});

describe('SelectField', () => {
  it('abre la lista y marca la opción elegida', async () => {
    const onSelect = jest.fn();
    await render(<SelectField label="Especialidad" value="Kinesiología" options={['Kinesiología', 'Pediatría']} onSelect={onSelect} />);
    const boton = screen.getByRole('button', { name: /Especialidad: Kinesiología/ });
    expect(boton.props.accessibilityState).toMatchObject({ expanded: false });
    await fireEvent.press(boton);
    expect(screen.getByRole('radio', { name: 'Kinesiología' }).props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByRole('radio', { name: 'Pediatría' }));
    expect(onSelect).toHaveBeenCalledWith('Pediatría');
  });
});

describe('CalendarioDia', () => {
  it('dice la fecha y cuántas sesiones hay de cada estado', async () => {
    await render(
      <CalendarioDia
        date={{ dateString: '2026-11-03', day: 3, month: 11, year: 2026, timestamp: 0 }}
        marking={{ conteo: { PENDIENTE: 2, REALIZADA: 1 } }}
        onPress={() => {}}
      />,
    );
    const dia = screen.getByRole('button');
    expect(dia.props.accessibilityLabel).toMatch(/3 de noviembre/);
    expect(dia.props.accessibilityLabel).toMatch(/1 realizada, 2 pendientes/);
  });

  it('sin sesiones lo dice', async () => {
    await render(
      <CalendarioDia date={{ dateString: '2026-11-04', day: 4, month: 11, year: 2026, timestamp: 0 }} onPress={() => {}} />,
    );
    expect(screen.getByRole('button').props.accessibilityLabel).toMatch(/sin sesiones/);
  });
});
