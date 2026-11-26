import { TipoUsuario } from './auth.types';

export interface Especialidad {
  id: number;
  nombre: string;
}

export type EstadoUsuario = 'ACTIVO' | 'INACTIVO';

export interface UsuarioListItem {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono?: string;
  direccion?: string;
  fechaNacimiento?: string;
  tipoUsuario: TipoUsuario;
  esAdministrador: boolean;
  estado: EstadoUsuario;
  createdAt: string;
  profesional?: { matricula: string; especialidad: Especialidad; establecimiento?: string };
  tutor?: { userId: number };
  pcd?: { tipoDiscapacidad?: string; grado?: string; diagnostico?: string };
}

export interface CreateUsuarioDto {
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  password: string;
  fechaNacimiento: string;
  telefono?: string;
  direccion?: string;
  tipoUsuario: TipoUsuario;
  
  esAdministrador?: boolean;
  matricula?: string;
  especialidadId?: number;
  establecimiento?: string;
  descripcionFunciones?: string;
  
  tipoDiscapacidad?: string;
  grado?: string;
  diagnostico?: string;
}
