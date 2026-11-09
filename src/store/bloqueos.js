import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'

// BLOQUEOS OPTIMISTAS — LO QUE ESTE STORE ES Y LO QUE NO ES
//
// NO es el bloqueo de concurrencia. El bloqueo real es del servidor (RNF-12:
// campo `version` + rechazo con 409). Un store en el navegador no puede
// impedir que otro empleado, en otro equipo, guarde primero: no hay forma de
// que dos pestañas distintas se vean entre sí.
//
// SÍ hace tres cosas que el servidor no puede hacer solo:
//   1. Guardar la `version` que tenía el registro cuando se abrió el
//      formulario, para enviarla en el PUT. Sin ella no hay bloqueo optimista
//      posible, porque el back no sabe contra qué comparar.
//   2. Evitar que la MISMA pestaña abra dos ediciones del mismo registro (dos
//      modales, dos guardados), que es un conflicto evitable sin red.
//   3. Recordar que un 409 ocurrió, para que la pantalla muestre "alguien más
//      lo modificó, recarga" en lugar de un error genérico.
//
// Clave compuesta `recurso:id` en vez de un store por módulo: Pedidos y Ventas
// se bloquean mutuamente (resolver un pedido crea su venta), y si cada módulo
// tuviera su propio registro tendrían que importarse entre sí, que es
// justamente lo que R45 prohíbe.

const claveDe = (recurso, id) => `${recurso}:${id}`

export const useBloqueos = create((set, get) => ({
  // { "ventas:7": { version, desde, conflicto } }
  registros: {},

  /** Al abrir un formulario de edición. Devuelve false si ya estaba abierto. */
  tomar: (recurso, id, { version = null } = {}) => {
    const clave = claveDe(recurso, id)
    if (get().registros[clave] && !get().registros[clave].conflicto) return false
    set((s) => ({
      registros: {
        ...s.registros,
        [clave]: { version, desde: Date.now(), conflicto: false },
      },
    }))
    return true
  },

  /** Al cerrar el formulario, con éxito o cancelado. */
  liberar: (recurso, id) =>
    set((s) => {
      const { [claveDe(recurso, id)]: _descartado, ...resto } = s.registros
      return { registros: resto }
    }),

  /** Tras un 409 del servidor: el registro cambió bajo nuestros pies. */
  marcarConflicto: (recurso, id) =>
    set((s) => {
      const clave = claveDe(recurso, id)
      const actual = s.registros[clave]
      if (!actual) return s
      return { registros: { ...s.registros, [clave]: { ...actual, conflicto: true } } }
    }),

  /** La versión a enviar en el PUT. `null` = el back aún no expone versiones. */
  versionDe: (recurso, id) => get().registros[claveDe(recurso, id)]?.version ?? null,

  estaTomado: (recurso, id) => Boolean(get().registros[claveDe(recurso, id)]),

  tieneConflicto: (recurso, id) =>
    Boolean(get().registros[claveDe(recurso, id)]?.conflicto),

  liberarTodos: () => set({ registros: {} }),
}))

export const RECURSOS_BLOQUEABLES = { pedidos: 'pedidos', ventas: 'ventas' }

/**
 * Vista del bloqueo de un registro concreto, lista para un componente.
 * Se devuelven primitivas y no el objeto del registro para que un cambio en
 * otro registro no vuelva a renderizar esta pantalla.
 */
export const useBloqueo = (recurso, id) =>
  useBloqueos(
    useShallow((s) => {
      const registro = s.registros[`${recurso}:${id}`]
      return {
        tomado: Boolean(registro),
        conflicto: Boolean(registro?.conflicto),
        version: registro?.version ?? null,
        tomar: s.tomar,
        liberar: s.liberar,
        marcarConflicto: s.marcarConflicto,
      }
    })
  )
