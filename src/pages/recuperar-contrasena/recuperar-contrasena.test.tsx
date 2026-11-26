import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { authApi } from '@/api/auth';
import RecuperarContrasenaScreen, { ESPERA_REENVIO_SEG } from './recuperar-contrasena';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('@/api/auth', () => ({
  authApi: { forgotPassword: jest.fn(), verifyOtp: jest.fn(), resetPassword: jest.fn() },
}));

const api = authApi as jest.Mocked<typeof authApi>;

const abrir = () =>
  render(
    <PaperProvider>
      <RecuperarContrasenaScreen />
    </PaperProvider>,
  );

const escribir = (etiqueta: string, texto: string) =>
  fireEvent.changeText(screen.getByLabelText(etiqueta), texto);
const tocar = (nombre: string) => fireEvent.press(screen.getByRole('button', { name: nombre }));

async function hastaElCodigo() {
  await abrir();
  await escribir('Correo electrónico', 'ana@test.com');
  await tocar('Enviar código');
  await screen.findByLabelText('Código de 6 dígitos');
}

describe('Recuperar contraseña', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.forgotPassword.mockResolvedValue(undefined);
    api.verifyOtp.mockResolvedValue('token-de-reseteo');
    api.resetPassword.mockResolvedValue(undefined);
  });

  it('no manda nada con un email inválido', async () => {
    await abrir();
    await escribir('Correo electrónico', 'no-es-un-email');
    await tocar('Enviar código');

    expect(await screen.findByText('Ingresá un email válido')).toBeTruthy();
    expect(api.forgotPassword).not.toHaveBeenCalled();
  });

  it('pide el código y pasa al paso del código, con el reenvío en espera', async () => {
    await hastaElCodigo();

    expect(api.forgotPassword).toHaveBeenCalledWith('ana@test.com');
    expect(screen.getByText(/ana@test.com/)).toBeTruthy();
    expect(screen.getByText(`Reenviar código en ${ESPERA_REENVIO_SEG} s`)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: `Reenviar código, disponible en ${ESPERA_REENVIO_SEG} segundos` }).props
        .accessibilityState,
    ).toMatchObject({ disabled: true });
  });

  it('solo acepta dígitos y hasta 6 en el campo del código', async () => {
    await hastaElCodigo();
    await escribir('Código de 6 dígitos', '12a34b56789');

    expect(screen.getByLabelText('Código de 6 dígitos').props.value).toBe('123456');
  });

  it('un código incorrecto muestra el aviso y se queda en el paso', async () => {
    api.verifyOtp.mockRejectedValue({ response: { status: 400, data: { message: 'x' } } });
    await hastaElCodigo();
    await escribir('Código de 6 dígitos', '000000');
    await tocar('Verificar código');

    expect(await screen.findByText(/incorrecto o venció/)).toBeTruthy();
    expect(screen.queryByLabelText('Contraseña nueva')).toBeNull();
  });

  it('con el código correcto pide la contraseña nueva, valida y termina', async () => {
    await hastaElCodigo();
    await escribir('Código de 6 dígitos', '482913');
    await tocar('Verificar código');
    await screen.findByLabelText('Contraseña nueva');
    expect(api.verifyOtp).toHaveBeenCalledWith('ana@test.com', '482913');

    // Muy corta
    await escribir('Contraseña nueva', '123');
    await escribir('Repetí la contraseña nueva', '123');
    await tocar('Cambiar contraseña');
    expect(await screen.findByText('La contraseña debe tener al menos 6 caracteres')).toBeTruthy();

    // No coinciden
    await escribir('Contraseña nueva', 'ClaveNueva1');
    await escribir('Repetí la contraseña nueva', 'ClaveNueva2');
    await tocar('Cambiar contraseña');
    expect(await screen.findByText('Las contraseñas no coinciden')).toBeTruthy();
    expect(api.resetPassword).not.toHaveBeenCalled();

    // Bien
    await escribir('Repetí la contraseña nueva', 'ClaveNueva1');
    await tocar('Cambiar contraseña');
    await waitFor(() => expect(api.resetPassword).toHaveBeenCalledWith('token-de-reseteo', 'ClaveNueva1'));

    await tocar('Ir a iniciar sesión');
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('si el permiso de 10 minutos venció, vuelve al primer paso pidiendo un código nuevo', async () => {
    api.resetPassword.mockRejectedValue({
      response: { status: 400, data: { message: 'El permiso para cambiar la contraseña venció.' } },
    });
    await hastaElCodigo();
    await escribir('Código de 6 dígitos', '482913');
    await tocar('Verificar código');
    await screen.findByLabelText('Contraseña nueva');
    await escribir('Contraseña nueva', 'ClaveNueva1');
    await escribir('Repetí la contraseña nueva', 'ClaveNueva1');
    await tocar('Cambiar contraseña');

    expect(await screen.findByText('Pasó demasiado tiempo. Pedí un código nuevo.')).toBeTruthy();
    expect(screen.getByLabelText('Correo electrónico')).toBeTruthy();
  });

  it('"Volver a iniciar sesión" lleva al login', async () => {
    await abrir();
    await tocar('Volver a iniciar sesión');
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });
});
