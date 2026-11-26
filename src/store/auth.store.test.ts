import { useAuthStore } from './auth.store';
import { Usuario } from '../types/auth.types';

const usuario: Usuario = {
  id: 1,
  nombre: 'Admin',
  apellido: 'Sistema',
  email: 'admin@pcd.com',
  tipoUsuario: 'ADMINISTRADOR',
  esAdministrador: true,
};

describe('useAuthStore', () => {
  afterEach(() => {
    useAuthStore.getState().logout();
  });

  it('login() guarda el usuario, el access token y el refresh token', () => {
    useAuthStore.getState().login(usuario, 'un-jwt-cualquiera', 'un-refresh-cualquiera');

    expect(useAuthStore.getState().user).toEqual(usuario);
    expect(useAuthStore.getState().token).toBe('un-jwt-cualquiera');
    expect(useAuthStore.getState().refreshToken).toBe('un-refresh-cualquiera');
  });

  it('setTokens() rota el access token y el refresh token sin tocar el usuario', () => {
    useAuthStore.getState().login(usuario, 'viejo-jwt', 'viejo-refresh');
    useAuthStore.getState().setTokens('nuevo-jwt', 'nuevo-refresh');

    expect(useAuthStore.getState().user).toEqual(usuario);
    expect(useAuthStore.getState().token).toBe('nuevo-jwt');
    expect(useAuthStore.getState().refreshToken).toBe('nuevo-refresh');
  });

  it('logout() limpia el usuario, el token y el refresh token', () => {
    useAuthStore.getState().login(usuario, 'un-jwt-cualquiera', 'un-refresh-cualquiera');
    useAuthStore.getState().logout();

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
  });
});
