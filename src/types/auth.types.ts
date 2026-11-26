export type TipoUsuario = 'ADMINISTRADOR' | 'PROFESIONAL' | 'TUTOR' | 'PCD';

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  tipoUsuario: TipoUsuario;
  esAdministrador: boolean;
  dni?: string;
  telefono?: string | null;
  direccion?: string | null;
  fechaNacimiento?: string;
  /** Solo Profesional (lo trae GET /usuarios/me). */
  profesional?: { especialidad?: { id: number; nombre: string } };
}

export interface UpdateProfileDto {
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  usuario: Usuario;
}

export type RefreshResponse = LoginResponse;
