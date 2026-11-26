import { useToastStore } from './toast.store';

describe('useToastStore', () => {
  afterEach(() => {
    useToastStore.getState().hide();
  });

  it('empieza sin mensaje', () => {
    expect(useToastStore.getState().message).toBeNull();
  });

  it('show() setea el mensaje', () => {
    useToastStore.getState().show('Tu sesión expiró. Iniciá sesión de nuevo.');
    expect(useToastStore.getState().message).toBe('Tu sesión expiró. Iniciá sesión de nuevo.');
  });

  it('show() es de error por defecto y acepta éxito', () => {
    useToastStore.getState().show('algo');
    expect(useToastStore.getState().type).toBe('error');
    useToastStore.getState().show('Actividad eliminada', 'success');
    expect(useToastStore.getState().type).toBe('success');
  });

  it('hide() limpia el mensaje', () => {
    useToastStore.getState().show('algo');
    useToastStore.getState().hide();
    expect(useToastStore.getState().message).toBeNull();
  });
});
