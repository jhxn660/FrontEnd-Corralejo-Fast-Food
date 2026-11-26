// Esquema de las CUENTAS de personal (Administrador y Empleado) de Gestión de Usuarios.
// Cuenta en el backend (/users): id, name, email, role, phone, state, empleado_rol, createdAt,
// más la contraseña cifrada (ver api.js). Los empleados son usuarios con rol Empleado.

import { OWNER_MANAGEABLE_ROLES, PERMISO, ROLES } from '../../config/roles.config'
import { FORMATO_TELEFONO, validarEmail, validarPassword } from '../auth/validaciones'

/** Roles de cuenta que se gestionan aquí: OWNER_MANAGEABLE_ROLES, igual que en el backend. */
export const ROLES_GESTIONABLES = OWNER_MANAGEABLE_ROLES

/** Presentación y permiso de baja de cada rol (config/roles.config.js). */
const INFO_ROL = {
  [ROLES.ADMIN]: {
    plural: 'Administradores',
    icono: 'fa-user-tie',
    color: 'primary',
    permisoEliminar: PERMISO.ELIMINAR_ADMINS,
    ayuda: 'Gestiona el local, el menú, el inventario y el equipo.',
  },
  [ROLES.EMPLOYEE]: {
    plural: 'Empleados',
    icono: 'fa-user',
    color: 'info',
    permisoEliminar: PERMISO.ELIMINAR_EMPLEADOS,
    ayuda: 'Atiende pedidos, ventas y PQRS.',
  },
}

export const infoDe = (rol) => INFO_ROL[rol] ?? INFO_ROL[ROLES.EMPLOYEE]

/** ¿El rol activo puede dar de baja esta cuenta? `puede` viene de useAuth(). */
export const puedeEliminarCuenta = (puede, cuenta) =>
  ROLES_GESTIONABLES.includes(cuenta?.role) && puede(infoDe(cuenta.role).permisoEliminar)

export const CUENTA_VACIA = {
  name: '',
  email: '',
  role: ROLES.EMPLOYEE,
  empleado_rol: '',
  phone: '',
  password: '',
  state: true,
}

/** Cuenta existente → valores del formulario (la contraseña nunca viaja de vuelta). */
export const aFormulario = (cuenta) => ({
  ...CUENTA_VACIA,
  ...cuenta,
  phone: cuenta.phone ?? '',
  empleado_rol: cuenta.empleado_rol ?? '',
  password: '',
})

const MAX_NOMBRE = 100
const MAX_EMAIL = 100
const MAX_CARGO = 30

export const LIMITES = { MAX_NOMBRE, MAX_EMAIL, MAX_CARGO }

/**
 * Validación de experiencia. `creando` exige contraseña: es la inicial de la
 * cuenta y solo se pide en el alta (misma política que el registro).
 */
export const validarCuenta = (valores, { creando }) => {
  const fallos = {}
  const nombre = valores.name.trim()

  if (!nombre) fallos.name = 'Escribe el nombre completo.'
  else if (nombre.length > MAX_NOMBRE) fallos.name = `Máximo ${MAX_NOMBRE} caracteres.`

  const email = validarEmail(valores.email)
  if (email) fallos.email = email
  else if (valores.email.trim().length > MAX_EMAIL) fallos.email = `Máximo ${MAX_EMAIL} caracteres.`

  if (!ROLES_GESTIONABLES.includes(valores.role)) fallos.role = 'Elige Administrador o Empleado.'

  if (valores.role === ROLES.EMPLOYEE && valores.empleado_rol.trim().length > MAX_CARGO) {
    fallos.empleado_rol = `Máximo ${MAX_CARGO} caracteres.`
  }

  const telefono = valores.phone.replace(/\s+/g, '')
  if (telefono && !FORMATO_TELEFONO.test(telefono)) {
    fallos.phone = 'Celular colombiano: 3XXXXXXXXX, con o sin +57.'
  }

  if (creando) {
    const password = validarPassword(valores.password)
    if (password) fallos.password = password
  }

  return fallos
}

export const hayFallos = (fallos) => Object.keys(fallos).length > 0

/** Valores del formulario → ficha para la API (más la contraseña en el alta). */
export const aPayload = (valores, { creando }) => {
  const payload = {
    name: valores.name.trim(),
    email: valores.email.trim().toLowerCase(),
    role: valores.role,
    state: valores.state !== false,
    // Sin teléfono se guarda null, no '': así no choca la comprobación de únicos.
    phone: valores.phone.replace(/\s+/g, '') || null,
    empleado_rol: valores.role === ROLES.EMPLOYEE ? valores.empleado_rol.trim() || null : null,
  }
  if (creando) payload.password = valores.password
  return payload
}
