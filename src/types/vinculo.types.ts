export type RolProfesional = 'CABECERA' | 'ESPECIALISTA';
export type EstadoVinculo = 'ACTIVO' | 'INACTIVO';

export interface Vinculo {
  pcdId: number;
  profesionalId: number;
  rolProfesional: RolProfesional;
  estado: EstadoVinculo;
  fechaAsignacion: string;
  pcd: {
    userId: number;
    usuario: { id: number; nombre: string; apellido: string; email: string };
  };
  profesional: {
    userId: number;
    matricula: string;
    especialidad: { id: number; nombre: string };
    usuario: { id: number; nombre: string; apellido: string; email: string };
  };
}

export interface CreateVinculoDto {
  pcdId: number;
  profesionalId: number;
  rolProfesional: RolProfesional;
}
