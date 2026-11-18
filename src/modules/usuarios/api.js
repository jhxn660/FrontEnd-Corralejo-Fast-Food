// Cuentas de personal (Gestión de Usuarios, Owner).
//
// Dos almacenes, cada uno con lo suyo:
// - json-server, colección `usuarios`: la ficha (nombre, correo, rol, cargo,
//   teléfono, estado, baja lógica). Es lo que lista y edita la pantalla.
// - Supabase Auth: la cuenta de acceso. Se crea en el alta con la contraseña
//   inicial y el rol en user_metadata. La contraseña NO se guarda en
//   json-server.

import { http } from '../../services/http'
import { crearCuentaDeAcceso } from '../../services/supabase'
import { ROLES_GESTIONABLES, ROL_CUENTA } from './esquema'

const RUTA = '/usuarios'

/** Rol de la ficha → rol que lee AuthContext en user_metadata. */
const ROL_SESION = { [ROL_CUENTA.ADMIN]: 'admin', [ROL_CUENTA.EMPLEADO]: 'empleado' }

// Lo que no cambia una edición: la contraseña no se guarda aquí, y correo y rol
// están también en la cuenta de Supabase.
const CAMPOS_FIJOS = ['password', 'email', 'role', 'createdAt', 'deletedAt', 'deletedBy']

const fallo = (status, mensaje) => Object.assign(new Error(mensaje), { status })

const gestionable = (cuenta) => ROLES_GESTIONABLES.includes(cuenta.role) && !cuenta.deletedAt

const listarTodas = async () => (await http.lista(RUTA)).datos

// json-server no tiene restricciones de unicidad: se comprueban aquí.
const comprobarUnicos = (todas, { email, phone }, idPropio = null) => {
  const otras = todas.filter((cuenta) => cuenta.id !== idPropio)
  if (email && otras.some((cuenta) => cuenta.email === email)) {
    throw fallo(409, 'Ya existe una cuenta con ese correo.')
  }
  if (phone && otras.some((cuenta) => cuenta.phone === phone)) {
    throw fallo(409, 'Ya existe una cuenta con ese teléfono.')
  }
}

export const usuariosApi = {
  /** Cuentas de Administrador y Empleado, sin las dadas de baja. */
  listar: async () => (await listarTodas()).filter(gestionable),

  /** La ficha de un correo (o null), para que AuthContext bloquee las desactivadas. */
  fichaDe: async (email) => (await http.lista(RUTA, { query: { email } })).datos[0] ?? null,

  /** Alta: primero la cuenta de acceso (Supabase), después la ficha. */
  crear: async ({ password, ...ficha }) => {
    if (!ROLES_GESTIONABLES.includes(ficha.role)) throw fallo(400, 'Rol no permitido.')
    comprobarUnicos(await listarTodas(), ficha)

    await crearCuentaDeAcceso({
      email: ficha.email,
      password,
      rol: ROL_SESION[ficha.role],
      nombre: ficha.name,
    })

    return http.post(RUTA, {
      ...ficha,
      createdAt: new Date().toISOString(),
      deletedAt: null,
      deletedBy: null,
    })
  },

  /**
   * Edición de la ficha. Correo y rol no se cambian aquí: viven también en la
   * cuenta de Supabase, y cambiarlos solo en json-server las desincronizaría.
   */
  actualizar: async (id, valores) => {
    const cambios = Object.fromEntries(
      Object.entries(valores).filter(([campo]) => !CAMPOS_FIJOS.includes(campo))
    )
    comprobarUnicos(await listarTodas(), cambios, id)
    return http.patch(`${RUTA}/${id}`, cambios)
  },

  cambiarEstado: (id, state) => http.patch(`${RUTA}/${id}`, { state }),

  /**
   * BAJA LÓGICA: la ficha deja de listarse y queda marcada, pero se conserva
   * para no perder el historial de quién la creó o la dio de baja.
   */
  eliminar: (id, { quien = null } = {}) =>
    http.patch(`${RUTA}/${id}`, { state: false, deletedAt: new Date().toISOString(), deletedBy: quien }),
}
