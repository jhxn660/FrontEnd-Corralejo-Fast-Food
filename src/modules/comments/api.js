import { datos } from '../../api/client'
import { commentsApi } from '../../api/comments.api'
import { numeroTiquete } from '../sales/servicio'

// MÓDULO `comments` del backend: los comentarios del muro público y sus "me gusta".
//   comments: { _id, usuario: { name, email } | null, codigo, venta, comentario, valoracion,
//               calificacion, likes, likedByMe, status, createdAt }
//
// Es un módulo APARTE de PQRS: un comentario es público, nace de una compra (el QR del tiquete)
// y recibe "me gusta"; una PQRS es privada y la responde el restaurante (modules/pqrs).

/** Valoración 1-10. Los comentarios anteriores a esa escala solo traen `calificacion` (1-5). */
const valoracionDelComentario = (comentario) =>
  comentario.valoracion ?? (comentario.calificacion ? comentario.calificacion * 2 : 0)

/* ───────────── Calificar desde el QR del tiquete ───────────── */

/** Prepara el código del QR; el backend lo valida al registrar la valoración. */
export const ticketsApi = {
  buscarPorQr: async (qr) => {
    const codigo = String(qr ?? '').trim().toUpperCase()
    if (!codigo) throw new Error('Escribe el código del ticket.')
    return { qr: codigo, ticket: codigo }
  },
}

/** Valoración desde el QR del tiquete: POST /comments { codigo, comentario, valoracion }. */
export const valoracionesApi = {
  registrar: ({ ticket, valoracion, texto }) =>
    commentsApi.create({ codigo: ticket.qr, comentario: texto ?? '', valoracion }),
}

/* ───────────── Muro de opiniones ───────────── */

const aOpinionUi = (comentario) => ({
  id: comentario._id,
  usuario: comentario.usuario?.name ?? null,
  nombre: comentario.usuario?.name ?? null,
  valoracion: valoracionDelComentario(comentario),
  texto: comentario.comentario ?? '',
  fecha: comentario.createdAt,
  likes: comentario.likes ?? 0,
  // Lo calcula el backend con el token: sin sesión siempre es false
  meGusta: comentario.likedByMe === true,
})

export const opinionesApi = {
  /** Comentarios visibles. `conDetalle` (el personal) añade QR, tiquete y productos. */
  listar: async ({ conDetalle = false } = {}) => {
    const publicos = (await datos(commentsApi.listPublic())).map(aOpinionUi)
    if (!conDetalle) return publicos

    const completos = await datos(commentsApi.list())
    const detalleDe = new Map(completos.map((c) => [String(c._id), c]))
    return publicos.map((opinion) => {
      const completo = detalleDe.get(String(opinion.id))
      return {
        ...opinion,
        qr: completo?.codigo ?? null,
        ticket: numeroTiquete(completo?.venta?.ticketId),
        productos: (completo?.venta?.detalles ?? []).map((d) => ({ producto: d.producto, cantidad: d.cantidad })),
      }
    })
  },
}

/**
 * "Me gusta" de quien inició sesión (Owner, Administrador o Cliente; ver PERMISO.DAR_ME_GUSTA).
 * El backend lleva la cuenta por persona: POST lo da, DELETE lo quita, y repetir no cambia nada.
 */
export const meGustaApi = {
  /** Si ya lo tienes dado lo quita; si no, lo da. Devuelve { likes, meGusta } actualizados. */
  alternar: async (id, yaLoTengo) => {
    const resumen = await datos(yaLoTengo ? commentsApi.unlike(id) : commentsApi.like(id))
    return { likes: resumen.likes, meGusta: resumen.likedByMe }
  },
}

/* ───────────── Moderación (administración) ───────────── */

const aComentarioUi = (comentario) => ({
  id: comentario._id,
  texto: comentario.comentario ?? '',
  nombre: comentario.usuario?.name ?? 'Visitante',
  usuario: comentario.usuario?.email ?? null,
  fecha: comentario.createdAt,
  // status = visible en el muro público
  visible: comentario.status !== false,
  qr: comentario.codigo ?? null,
  ticket: numeroTiquete(comentario.venta?.ticketId),
  valoracion: valoracionDelComentario(comentario),
  likes: comentario.likes ?? 0,
})

export const moderacionApi = {
  /** Solo los comentarios con texto: una puntuación sin texto no tiene nada que moderar. */
  listarComentarios: async () =>
    (await datos(commentsApi.list())).map(aComentarioUi).filter((c) => c.texto.trim() !== ''),

  /** PATCH /comments/:id/status: true = se ve en el muro, false = oculto. */
  cambiarVisibilidad: (id, visible) => commentsApi.setStatus(id, visible),

  /** Borra el comentario; sus "me gusta" viven dentro de él y se van con él. */
  eliminarComentario: (id) => commentsApi.remove(id),
}
