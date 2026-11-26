export interface Ubicacion {
  id: number;
  pcdId: number;
  latitud: number;
  longitud: number;
  precision?: number;
  fechaHora: string;
}

export interface UbicacionCompartida {
  usuarioId: number;
  pcdId: number;
  fechaDesde: string;
  usuario: { id: number; nombre: string; apellido: string; tipoUsuario: string };
}

export interface CreateUbicacionDto {
  latitud: number;
  longitud: number;
  precision?: number;
}
