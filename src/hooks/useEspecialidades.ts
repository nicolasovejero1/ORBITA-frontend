import { useEffect, useState } from 'react';
import { especialidadesApi } from '@/api/especialidades';
import { Especialidad } from '@/types/usuario.types';

/** Catálogo de especialidades del backend (reemplaza la lista fija de la app). */
export function useEspecialidades(activo = true) {
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);

  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    especialidadesApi.getAll()
      .then((lista) => { if (vigente) setEspecialidades(lista); })
      .catch(() => {});
    return () => { vigente = false; };
  }, [activo]);

  return {
    especialidades,
    nombres: especialidades.map((e) => e.nombre),
    idDe: (nombre: string) => especialidades.find((e) => e.nombre === nombre)?.id,
  };
}
