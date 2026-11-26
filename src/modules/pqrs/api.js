import { datos } from '../../api/client'
import { pqrsApi as pqrsBackend } from '../../api/pqrs.api'

// MÓDULO `pqrs` del backend: peticiones, quejas, reclamos y sugerencias.
//   pqrs: { _id, usuario: { _id, name, email }, tipo, asunto, descripcion, estado,
//           respuesta, respondedAt, createdAt }
//
// Es un módulo APARTE de los comentarios: una PQRS es privada (solo la ven su autor y el
// personal) y la responde el restaurante. No tiene "me gusta": eso es de los comentarios del
// muro público (modules/comments).

const aPqrsUi = (pqrs) => ({
  id: pqrs._id,
  tipo: pqrs.tipo,
  asunto: pqrs.asunto,
  texto: pqrs.descripcion ?? '',
  nombre: pqrs.usuario?.name ?? 'Cliente',
  usuario: pqrs.usuario?.email ?? null,
  estado: pqrs.estado,
  // Sin respuesta, el backend no manda el campo: la PQRS está "sin responder"
  respuesta: pqrs.respuesta ?? '',
  fecha: pqrs.createdAt,
  // Fecha en que se guardó la respuesta (la registra el backend al responder)
  fechaRespuesta: pqrs.respondedAt ?? null,
})

export const pqrsApi = {
  /** Todas las PQRS (personal). */
  listar: async () => (await datos(pqrsBackend.list())).map(aPqrsUi),

  /** Solo las del Cliente que inició sesión: el backend lo reconoce por su token. */
  listarMias: async () => (await datos(pqrsBackend.listMine())).map(aPqrsUi),

  /** Solo el Cliente crea PQRS; el backend la asocia a su cuenta y la deja "Pendiente". */
  crear: ({ tipo, asunto, texto }) => pqrsBackend.create({ tipo, asunto: asunto.trim(), descripcion: texto.trim() }),

  /**
   * Administración: guarda la respuesta (10-1000 caracteres) y el estado. El backend registra
   * quién respondió y cuándo, y no deja cambiar lo que escribió el Cliente.
   */
  responder: (id, { respuesta, estado }) => pqrsBackend.update(id, { estado, respuesta }),

  eliminar: (id) => pqrsBackend.remove(id),
}
