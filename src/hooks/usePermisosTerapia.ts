import { useEffect, useState } from 'react';
import { usuariosApi } from '@/api/usuarios';
import { vinculosApi } from '@/api/vinculos';
import { useAuthStore } from '@/store/auth.store';

interface ConEspecialidad {
  especialidad?: { id: number } | null;
}

/**
 * Qué terapias puede usar quien está logueado (misma regla que el backend):
 * - Administrador (y Profesional con permisos de administrador): cualquiera.
 * - Médico de cabecera del PCD: cualquiera, para ese PCD.
 * - Especialista: solo las de su especialidad.
 * En el catálogo, un Profesional solo gestiona las de su especialidad.
 */
export function usePermisosTerapia() {
  const { user } = useAuthStore();
  const userId = user?.id;
  const esProfesional = user?.tipoUsuario === 'PROFESIONAL';
  const esAdmin = !!user?.esAdministrador;
  const necesitaDatos = esProfesional && !esAdmin;

  const [miEspecialidad, setMiEspecialidad] = useState<{ id: number; nombre: string } | null>(null);
  const [cabeceraDe, setCabeceraDe] = useState<number[]>([]);

  useEffect(() => {
    if (!necesitaDatos || userId === undefined) return;
    let vigente = true;
    Promise.all([
      usuariosApi.getMe(),
      vinculosApi.getAll({ profesionalId: userId, estado: 'ACTIVO' }),
    ])
      .then(([me, vinculos]) => {
        if (!vigente) return;
        setMiEspecialidad(me.profesional?.especialidad ?? null);
        setCabeceraDe(vinculos.filter((v) => v.rolProfesional === 'CABECERA').map((v) => v.pcdId));
      })
      .catch(() => {});
    return () => { vigente = false; };
  }, [necesitaDatos, userId]);

  const esCabeceraDe = (pcdId: number | null | undefined) => pcdId != null && cabeceraDe.includes(pcdId);

  return {
    /** Especialidad del Profesional (null si no es Profesional o todavía carga). */
    miEspecialidad,
    esCabeceraDe,
    /** ¿Puede programar esta terapia en una actividad del PCD? */
    puedeProgramar: (terapia: ConEspecialidad, pcdId: number | null | undefined) => {
      if (!necesitaDatos) return true;
      if (esCabeceraDe(pcdId)) return true;
      return terapia.especialidad != null && terapia.especialidad.id === miEspecialidad?.id;
    },
    /** ¿Puede editar o borrar esta terapia del catálogo? */
    puedeGestionar: (terapia: ConEspecialidad) => {
      if (user?.tipoUsuario === 'ADMINISTRADOR' || esAdmin) return true;
      if (!esProfesional) return false;
      return terapia.especialidad != null && terapia.especialidad.id === miEspecialidad?.id;
    },
  };
}
