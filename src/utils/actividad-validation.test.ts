import { CamposActividad, diaSiguiente, validarActividad } from './actividad-validation';

const base: CamposActividad = {
  titulo: 'Caminata',
  descripcion: 'Caminar 30 minutos',
  pcdSeleccionado: true,
  fechaInicio: '2026-11-01',
  fechaFin: '2026-11-30',
  horarioInicio: '',
  horarioFin: '',
  recordarActivo: false,
  recordarAntesMinutos: '',
  frecuencia: 'DIARIA',
  diasSeleccionados: [],
  tipo: 'EJERCICIO',
  medicamentoSeleccionado: false,
  terapiaSeleccionada: false,
};

describe('validarActividad', () => {
  it('sin errores con los datos completos', () => {
    expect(validarActividad(base)).toEqual({});
  });

  it('marca los obligatorios vacíos', () => {
    const e = validarActividad({ ...base, titulo: ' ', descripcion: '', pcdSeleccionado: false, fechaInicio: '', fechaFin: '' });
    expect(Object.keys(e).sort()).toEqual(['descripcion', 'fechaFin', 'fechaInicio', 'pcd', 'titulo']);
  });

  it('rechaza una fecha de fin igual o anterior a la de inicio', () => {
    expect(validarActividad({ ...base, fechaFin: '2026-11-01' }).fechaFin).toBeDefined();
    expect(validarActividad({ ...base, fechaFin: '2026-10-15' }).fechaFin).toBeDefined();
  });

  it('compara horarios aunque vengan con segundos', () => {
    expect(validarActividad({ ...base, horarioInicio: '10:00:00', horarioFin: '09:30' }).horario).toBeDefined();
    expect(validarActividad({ ...base, horarioInicio: '09:00:00', horarioFin: '09:30:00' }).horario).toBeUndefined();
  });

  it('exige medicamento, terapia y días según el tipo y la frecuencia', () => {
    expect(validarActividad({ ...base, tipo: 'MEDICAMENTO' }).medicamento).toBeDefined();
    expect(validarActividad({ ...base, tipo: 'TERAPIA' }).terapia).toBeDefined();
    expect(validarActividad({ ...base, frecuencia: 'DIAS_ESPECIFICOS' }).dias).toBeDefined();
  });

  it('con el recordatorio encendido pide los minutos y el horario de inicio', () => {
    expect(validarActividad({ ...base, recordarActivo: true, horarioInicio: '09:00' }).recordar).toBeDefined();
    expect(validarActividad({ ...base, recordarActivo: true, recordarAntesMinutos: '15' }).recordar).toBeDefined();
    expect(validarActividad({ ...base, recordarActivo: true, recordarAntesMinutos: '15', horarioInicio: '09:00' }).recordar).toBeUndefined();
  });

  it('con el recordatorio apagado ignora los minutos', () => {
    expect(validarActividad({ ...base, recordarActivo: false, recordarAntesMinutos: 'abc' }).recordar).toBeUndefined();
  });

  it('al editar (sin pcdSeleccionado) no pide el PCD', () => {
    expect(validarActividad({ ...base, pcdSeleccionado: undefined }).pcd).toBeUndefined();
  });
});

describe('diaSiguiente', () => {
  it('suma un día, también al cambiar de mes y de año', () => {
    expect(diaSiguiente('2026-11-01')).toBe('2026-11-02');
    expect(diaSiguiente('2026-11-30')).toBe('2026-12-01');
    expect(diaSiguiente('2026-12-31')).toBe('2027-01-01');
  });

  it('devuelve undefined si no hay fecha', () => {
    expect(diaSiguiente('')).toBeUndefined();
  });
});
