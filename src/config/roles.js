// Los roles del sistema, sin dependencias: lo importan tanto el contexto de
// sesión como la tabla de navegación, así que no puede importar pantallas.
//
// JERARQUÍA (de mayor a menor)
//   owner    → todo lo del admin + eliminar administradores (y empleados, heredado).
//   admin    → todo lo del empleado + sus funciones administrativas.
//   empleado → vistas operativas base.
//   cliente  → panel del cliente registrado (incluye PQRS).
//   usuario  → visitante SIN sesión: lo del cliente salvo lo que exige cuenta (PQRS).
//
// El rol de una sesión es el `role` del usuario que devuelve el backend
// (Owner, Administrador, Empleado, Cliente). 'usuario' no se guarda en ningún
// sitio: es la ausencia de sesión.

export const ROL = Object.freeze({
  OWNER: 'Owner',
  ADMIN: 'Administrador',
  EMPLEADO: 'Empleado',
  CLIENTE: 'Cliente',
  USUARIO: 'Usuario',
})

/** Roles que solo se obtienen con una sesión iniciada. */
const ROLES_CON_SESION = Object.freeze([ROL.OWNER, ROL.ADMIN, ROL.EMPLEADO, ROL.CLIENTE])

/**
 * Herencia: cada rol hereda TODO lo del rol indicado (vistas y permisos).
 * El visitante no hereda del cliente: se DERIVA de él quitando lo que exige
 * cuenta (ver `requiereCuenta` en config/navegacion.jsx).
 */
const HEREDA_DE = Object.freeze({
  [ROL.OWNER]: ROL.ADMIN,
  [ROL.ADMIN]: ROL.EMPLEADO,
  [ROL.EMPLEADO]: null,
  [ROL.CLIENTE]: null,
  [ROL.USUARIO]: null,
})

/** El rol y todos sus ancestros, del más específico al más general. */
export const cadenaDe = (rol) => {
  const cadena = []
  for (let actual = rol; actual; actual = HEREDA_DE[actual]) cadena.push(actual)
  return cadena
}

/** Acciones que no son "ver una pantalla" y se deciden por permiso. */
export const PERMISO = Object.freeze({
  /** Exclusivo del Owner: dar de baja cuentas de Administrador. */
  ELIMINAR_ADMINS: 'admins:eliminar',
  /**
   * Dar de baja Empleados. Owner y, DE MOMENTO, también el Admin (decisión
   * provisional). Para dejarlo solo al Owner basta con moverlo de fila.
   */
  ELIMINAR_EMPLEADOS: 'empleados:eliminar',
  /** Alta y edición del personal (admin y, por herencia, owner). */
  GESTIONAR_PERSONAL: 'personal:gestionar',
  /** Enviar y consultar PQRS propias: exige cuenta de cliente. */
  PQRS_PROPIAS: 'pqrs:propias',
  /**
   * Ver QUÉ productos se calificaron en cada opinión (y su ticket/QR).
   * Solo Admin y, por herencia, Owner. Visitante y Cliente ven la opinión
   * general: valoración, fecha, descripción y me gusta.
   */
  VER_DETALLE_OPINIONES: 'opiniones:detalle',
  /** Editar misión, visión y narrativa ("Gestión de Información"). Admin y Owner. */
  EDITAR_INFORMACION: 'informacion:editar',
})

const PERMISOS_PROPIOS = Object.freeze({
  [ROL.OWNER]: [PERMISO.ELIMINAR_ADMINS],
  [ROL.ADMIN]: [
    PERMISO.GESTIONAR_PERSONAL,
    PERMISO.ELIMINAR_EMPLEADOS,
    PERMISO.VER_DETALLE_OPINIONES,
    PERMISO.EDITAR_INFORMACION,
  ],
  [ROL.EMPLEADO]: [],
  [ROL.CLIENTE]: [PERMISO.PQRS_PROPIAS],
  [ROL.USUARIO]: [],
})

/** Permisos efectivos: los propios más los heredados. */
const permisosDe = (rol) => new Set(cadenaDe(rol).flatMap((r) => PERMISOS_PROPIOS[r] ?? []))

export const puede = (rol, permiso) => permisosDe(rol).has(permiso)

/** ¿`rol` alcanza el nivel de `minimo`? (p. ej. tieneNivel('owner', 'admin') → true) */
export const tieneNivel = (rol, minimo) => cadenaDe(rol).includes(minimo)

export const TITULO_PANEL = {
  [ROL.OWNER]: 'Panel Owner',
  [ROL.ADMIN]: 'Panel de Control',
  [ROL.EMPLEADO]: 'Panel Empleado',
  [ROL.CLIENTE]: 'Panel Cliente',
  [ROL.USUARIO]: 'Panel Visitante',
}

/** Roles con la estética translúcida del cliente (ver Layout). */
export const ROLES_VITRINA = Object.freeze([ROL.CLIENTE, ROL.USUARIO])

/** Nombre del rol en el backend (enum `role` del modelo User) → rol de la app. */
const DESDE_BACKEND = Object.freeze({
  owner: ROL.OWNER,
  administrador: ROL.ADMIN,
  empleado: ROL.EMPLEADO,
  cliente: ROL.CLIENTE,
})

/**
 * Rol de una sesión iniciada. Cualquier valor desconocido cae en el de menor
 * privilegio CON cuenta (R2). 'usuario' no se acepta aquí: quien tiene sesión
 * nunca es un visitante.
 */
export const normalizarRol = (valor) => {
  const texto = String(valor ?? '').toLowerCase().trim()
  const rol = DESDE_BACKEND[texto] ?? texto
  return ROLES_CON_SESION.includes(rol) ? rol : ROL.CLIENTE
}
