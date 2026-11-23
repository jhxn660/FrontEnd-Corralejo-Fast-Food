import { http } from '../../services/http'

// Rutas del módulo PQRS (R48). El backend decide quién ve qué:
//   - Cliente: GET /pqrs devuelve SOLO sus PQRS y puede crear nuevas.
//   - Empleado: GET /pqrs devuelve todas (solo consulta).
//   - Administrador y Owner: además responden, cambian el estado y eliminan.
// La moderación de comentarios (mostrar u ocultar) también es de administración.
const RUTAS = {
  pqrs: '/pqrs',
  comentarios: '/comments',
}

/**
 * PQRS del backend → forma de la pantalla.
 * Backend: { _id, usuario: { _id, name, email }, tipo, asunto, descripcion, estado,
 *            respuesta, createdAt, updatedAt }
 */
const aPqrsUi = (pqrs) => ({
  id: pqrs._id,
  tipo: pqrs.tipo,
  asunto: pqrs.asunto,
  texto: pqrs.descripcion ?? '',
  nombre: pqrs.usuario?.name ?? 'Cliente',
  usuario: pqrs.usuario?.email ?? null,
  estado: pqrs.estado,
  respuesta: pqrs.respuesta ?? '',
  fecha: pqrs.createdAt,
  // Con respuesta, la fecha de la última modificación es la de la respuesta
  fechaRespuesta: pqrs.respuesta ? pqrs.updatedAt : null,
})

/** Comentario del backend → fila del buzón de moderación. */
const aComentarioUi = (comentario) => ({
  id: comentario._id,
  texto: comentario.comentario ?? '',
  nombre: comentario.usuario?.name ?? 'Visitante',
  usuario: comentario.usuario?.email ?? null,
  fecha: comentario.createdAt,
  // isActive = visible en la portada. Los comentarios nacen visibles; el admin puede ocultarlos.
  visible: comentario.isActive !== false,
  qr: comentario.codigo ?? null,
  valoracion: comentario.valoracion ?? 0,
})

export const pqrsApi = {
  listar: async ({ senal } = {}) => (await http.get(RUTAS.pqrs, { senal })).map(aPqrsUi),

  /** Solo el Cliente crea PQRS; el backend las asocia a su cuenta y las deja "Pendiente". */
  crear: ({ tipo, asunto, texto }) =>
    http.post(RUTAS.pqrs, { tipo, asunto: asunto.trim(), descripcion: texto.trim() }),

  /** Respuesta y estado en una sola llamada (administración). */
  responder: (id, { respuesta, estado }) => http.patch(`${RUTAS.pqrs}/${id}`, { respuesta, estado }),

  eliminar: (id) => http.delete(`${RUTAS.pqrs}/${id}`),
}

export const moderacionApi = {
  /** Solo los comentarios con texto: una puntuación sin texto no tiene nada que moderar. */
  listarComentarios: async ({ senal } = {}) =>
    (await http.get(RUTAS.comentarios, { senal }))
      .map(aComentarioUi)
      .filter((comentario) => comentario.texto.trim() !== ''),

  cambiarVisibilidad: (id, visible) => http.patch(`${RUTAS.comentarios}/${id}/status`, { isActive: visible }),

  eliminarComentario: (id) => http.delete(`${RUTAS.comentarios}/${id}`),
}
