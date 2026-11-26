// Mismas reglas que los DTO del backend, para avisar antes de mandar el formulario.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** DNI argentino: 7 u 8 dígitos, sin puntos. */
export const DNI_RE = /^\d{7,8}$/;
/** Números, espacios, +, - y paréntesis. */
export const TELEFONO_RE = /^[0-9+()\s-]{6,20}$/;
