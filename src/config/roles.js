// Los roles del sistema, sin dependencias: lo importan tanto el contexto de
// sesión como la tabla de navegación, así que no puede importar pantallas.

export const ROLES = ['admin', 'empleado', 'cliente']

export const TITULO_PANEL = {
  admin: 'Panel de Control',
  empleado: 'Panel Empleado',
  cliente: 'Panel Cliente',
}

/** Cualquier valor desconocido cae en el rol de menor privilegio (R2). */
export const normalizarRol = (valor) => {
  const rol = String(valor ?? '').toLowerCase().trim()
  return ROLES.includes(rol) ? rol : 'cliente'
}
