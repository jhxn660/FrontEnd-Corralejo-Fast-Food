// Cuentas de personal (Gestión de Usuarios, Owner) contra /api/users.
//
// Una sola fuente: el modelo User del backend guarda la ficha (nombre, correo,
// rol, cargo, teléfono, estado) y la contraseña cifrada. El backend valida la
// política de contraseña, que correo y teléfono no se repitan, y que solo un
// Owner gestione cuentas Owner.

import { http } from '../../services/http'
import { ROLES_GESTIONABLES } from './esquema'

const RUTA = '/users'

// El backend pagina el listado (15 por defecto). La pantalla muestra todas las
// cuentas de personal, que son pocas: se pide una página que las incluya.
const TODAS = { state: 'all', limit: 1000 }

// Lo que no cambia una edición: correo y rol se fijan en el alta, y la
// contraseña no se cambia por esta ruta (el backend la descartaría).
const CAMPOS_FIJOS = ['password', 'email', 'role', 'createdAt', 'createdBy', 'deletedAt', 'deletedBy']

/** Usuario del backend (`_id`) → forma de la pantalla (`id`). */
const aCuentaUi = ({ _id, ...cuenta }) => ({ id: _id, ...cuenta })

/**
 * El teléfono es único en el backend, también cuando vale null: dos cuentas
 * "sin teléfono" chocarían. Sin teléfono, el campo no se envía.
 */
const sinTelefonoVacio = ({ phone, ...resto }) => (phone ? { ...resto, phone } : resto)

const gestionable = (cuenta) => ROLES_GESTIONABLES.includes(cuenta.role) && !cuenta.deletedAt

export const usuariosApi = {
  /** Cuentas de Administrador y Empleado. */
  listar: async () => {
    const pagina = await http.get(RUTA, { query: TODAS })
    return (pagina?.users ?? []).map(aCuentaUi).filter(gestionable)
  },

  /** Alta con la contraseña inicial: el backend la cifra. */
  crear: async (ficha) => {
    if (!ROLES_GESTIONABLES.includes(ficha.role)) {
      throw Object.assign(new Error('Rol no permitido.'), { status: 400 })
    }
    return aCuentaUi(await http.post(RUTA, sinTelefonoVacio(ficha)))
  },

  /** Edición de la ficha. Correo y rol se fijan en el alta. */
  actualizar: async (id, valores) => {
    const cambios = Object.fromEntries(
      Object.entries(valores).filter(([campo]) => !CAMPOS_FIJOS.includes(campo))
    )
    return aCuentaUi(await http.patch(`${RUTA}/${id}`, sinTelefonoVacio(cambios)))
  },

  /** Activa o desactiva la cuenta: una desactivada no puede iniciar sesión. */
  cambiarEstado: (id, state) => http.patch(`${RUTA}/${id}`, { state }),

  /** Elimina la cuenta en el backend. */
  eliminar: (id) => http.delete(`${RUTA}/${id}`),
}
