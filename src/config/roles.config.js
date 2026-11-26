// ROLES DEL SISTEMA: copia de src/config/roles.config.js del BACKEND (mismos nombres, valores
// y grupos). Si este archivo y el backend no coinciden, manda el backend.
//
// No importa pantallas: lo usan el contexto de sesión y la tabla de navegación.

/* ───────────── Igual que el backend ───────────── */

/** Roles (ROLES del backend). Los valores son los del enum `role` del modelo User. */
export const ROLES = Object.freeze({
  OWNER: 'Owner',
  ADMIN: 'Administrador',
  EMPLOYEE: 'Empleado',
  CLIENT: 'Cliente',
  // Visitante sin cuenta: no está en el enum porque nunca se guarda en la base de datos.
  // Es la ausencia de sesión (en el backend, la ausencia de token).
  VISITOR: 'Usuario',
})

/** Roles que puede tener una cuenta: el enum `role` del modelo User (USER_ROLES del backend). */
export const USER_ROLES = Object.freeze([ROLES.OWNER, ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.CLIENT])

/** Administración: crear, editar y borrar (ADMIN_ROLES del backend). */
export const ADMIN_ROLES = Object.freeze([ROLES.OWNER, ROLES.ADMIN])

/** Personal: administración + empleado; consultan y operan (STAFF_ROLES del backend). */
export const STAFF_ROLES = Object.freeze([...ADMIN_ROLES, ROLES.EMPLOYEE])

/** Cuentas que se gestionan en Gestión de Usuarios (OWNER_MANAGEABLE_ROLES del backend). */
export const OWNER_MANAGEABLE_ROLES = Object.freeze([ROLES.ADMIN, ROLES.EMPLOYEE])

/* ───────────── Solo del frontend: herencia y permisos de botones ───────────── */

// JERARQUÍA (la misma del backend): Owner → Administrador → Empleado; cada uno hereda lo
// del siguiente. Cliente y Usuario (visitante) no heredan.
// El visitante se DERIVA del cliente quitando lo que exige cuenta (`requiereCuenta` en
// config/navegacion.jsx).
const HEREDA_DE = Object.freeze({
  [ROLES.OWNER]: ROLES.ADMIN,
  [ROLES.ADMIN]: ROLES.EMPLOYEE,
  [ROLES.EMPLOYEE]: null,
  [ROLES.CLIENT]: null,
  [ROLES.VISITOR]: null,
})

/** El rol y todos sus ancestros, del más específico al más general. */
export const cadenaDe = (rol) => {
  const cadena = []
  for (let actual = rol; actual; actual = HEREDA_DE[actual]) cadena.push(actual)
  return cadena
}

/**
 * Acciones que no son "ver una pantalla". Cada una dice qué ruta del backend la respalda:
 * un botón solo se muestra a quien el backend le va a aceptar la petición.
 */
export const PERMISO = Object.freeze({
  /** Dar de baja cuentas de Administrador. Exclusivo del Owner (OWNER_MANAGEABLE_ROLES). */
  ELIMINAR_ADMINS: 'users:eliminar-admins',
  /** Dar de baja cuentas de Empleado: DELETE /api/users/:id → ADMIN_ROLES. */
  ELIMINAR_EMPLEADOS: 'users:eliminar-empleados',
  /** Alta y edición del personal: POST y PATCH /api/users → ADMIN_ROLES. */
  GESTIONAR_PERSONAL: 'users:gestionar',
  /** Enviar PQRS propias: POST /api/pqrs → solo ROLES.CLIENT. */
  PQRS_PROPIAS: 'pqrs:propias',
  /** Ver QUÉ productos se calificaron en cada opinión (ticket/QR): GET /api/comments → personal. */
  VER_DETALLE_OPINIONES: 'comments:detalle',
  /** Dar y quitar "me gusta": POST/DELETE /api/comments/:id/like → ADMIN_ROLES y ROLES.CLIENT. */
  DAR_ME_GUSTA: 'comments:like',
  /** Editar misión, visión y narrativa: POST/PATCH/DELETE /api/establecimiento → ADMIN_ROLES. */
  EDITAR_INFORMACION: 'establecimiento:editar',
  /**
   * Modificar o eliminar una venta ya registrada, y eliminar o reabrir un pedido facturado
   * (reabrir borra su venta): PATCH y DELETE /api/sales, DELETE /api/orders → ADMIN_ROLES.
   */
  GESTIONAR_VENTAS: 'sales:gestionar',
})

/** Permisos que aporta cada rol; el resto lo hereda (HEREDA_DE). */
const PERMISOS_PROPIOS = Object.freeze({
  [ROLES.OWNER]: [PERMISO.ELIMINAR_ADMINS],
  [ROLES.ADMIN]: [
    PERMISO.GESTIONAR_PERSONAL,
    PERMISO.ELIMINAR_EMPLEADOS,
    PERMISO.EDITAR_INFORMACION,
    PERMISO.GESTIONAR_VENTAS,
    PERMISO.DAR_ME_GUSTA,
  ],
  // GET /api/comments es STAFF_ROLES: el detalle de las opiniones es de todo el personal.
  [ROLES.EMPLOYEE]: [PERMISO.VER_DETALLE_OPINIONES],
  [ROLES.CLIENT]: [PERMISO.PQRS_PROPIAS, PERMISO.DAR_ME_GUSTA],
  [ROLES.VISITOR]: [],
})

/** Permisos efectivos: los propios más los heredados. */
const permisosDe = (rol) => new Set(cadenaDe(rol).flatMap((r) => PERMISOS_PROPIOS[r] ?? []))

export const puede = (rol, permiso) => permisosDe(rol).has(permiso)

/** ¿`rol` alcanza el nivel de `minimo`? (p. ej. tieneNivel(ROLES.OWNER, ROLES.ADMIN) → true) */
export const tieneNivel = (rol, minimo) => cadenaDe(rol).includes(minimo)

export const TITULO_PANEL = {
  [ROLES.OWNER]: 'Panel Owner',
  [ROLES.ADMIN]: 'Panel de Control',
  [ROLES.EMPLOYEE]: 'Panel Empleado',
  [ROLES.CLIENT]: 'Panel Cliente',
  [ROLES.VISITOR]: 'Panel Visitante',
}

/** Roles con la estética translúcida del cliente (ver Layout). */
export const ROLES_VITRINA = Object.freeze([ROLES.CLIENT, ROLES.VISITOR])

/**
 * Rol de una sesión iniciada: el `role` que devuelve el backend, tal cual. Un valor que no
 * esté en USER_ROLES cae en el de menor privilegio CON cuenta (Cliente). 'Usuario' nunca se
 * acepta aquí: quien tiene sesión no es un visitante.
 */
export const normalizarRol = (valor) => {
  const texto = String(valor ?? '').trim().toLowerCase()
  return USER_ROLES.find((rol) => rol.toLowerCase() === texto) ?? ROLES.CLIENT
}
