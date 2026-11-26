import { datos } from '../../api/client'
import { usersApi } from '../../api/users.api'

import { ROLES_GESTIONABLES } from './esquema'

// Cuentas de personal (Gestión de Usuarios) con el módulo users del backend.
//   users: { _id, name, email, role, phone, status, empleado_rol, createdAt }
// La pantalla usa `id` y `state`; aquí se traducen desde `_id` y `status`.

// El backend pagina el listado: se pide una página que incluya todas las cuentas de personal.
const TODAS = { status: 'all', limit: 1000 }

// Correo y rol se fijan en el alta; la contraseña no se cambia por esta ruta.
const CAMPOS_FIJOS = ['password', 'email', 'role', 'createdAt', 'createdBy', 'deletedAt', 'deletedBy']

const aCuentaUi = ({ _id, status, ...cuenta }) => ({ id: _id, state: status !== false, ...cuenta })

/** Pantalla → backend: `state` pasa a `status` y un teléfono vacío no se envía (es único). */
const aCuentaApi = ({ state, phone, ...resto }) => ({
  ...resto,
  ...(state !== undefined && { status: state }),
  ...(phone && { phone }),
})

const gestionable = (cuenta) => ROLES_GESTIONABLES.includes(cuenta.role) && !cuenta.deletedAt

export const usuariosApi = {
  listar: async () => {
    const pagina = await datos(usersApi.list(TODAS))
    return (pagina?.users ?? []).map(aCuentaUi).filter(gestionable)
  },

  crear: async (ficha) => {
    if (!ROLES_GESTIONABLES.includes(ficha.role)) throw new Error('Rol no permitido.')
    return aCuentaUi(await datos(usersApi.create(aCuentaApi(ficha))))
  },

  actualizar: async (id, valores) => {
    const cambios = Object.fromEntries(Object.entries(valores).filter(([campo]) => !CAMPOS_FIJOS.includes(campo)))
    return aCuentaUi(await datos(usersApi.update(id, aCuentaApi(cambios))))
  },

  /** Activa o desactiva la cuenta: una desactivada no puede iniciar sesión. */
  cambiarEstado: (id, state) => usersApi.update(id, { status: state }),

  eliminar: (id) => usersApi.remove(id),
}
