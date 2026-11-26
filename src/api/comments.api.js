import { apiClient } from './client'

// Módulo `comments` del backend (/comments). Un comentario solo se crea con el código QR del tiquete.
export const commentsApi = {
  /** Comentarios visibles. Con sesión, cada uno trae `likedByMe` (si ya le diste "me gusta"). */
  listPublic: () => apiClient.get('/comments/public'),
  list: (params) => apiClient.get('/comments', { params }),
  get: (id) => apiClient.get(`/comments/${id}`),
  create: (payload) => apiClient.post('/comments', payload),
  update: (id, payload) => apiClient.patch(`/comments/${id}`, payload),
  remove: (id) => apiClient.delete(`/comments/${id}`),
  setStatus: (id, status) => apiClient.patch(`/comments/${id}/status`, { status }),
  /** "Me gusta" de quien inició sesión. Responde { _id, likes, likedByMe }; repetirlo no suma. */
  like: (id) => apiClient.post(`/comments/${id}/like`),
  /** Quita tu "me gusta". Responde { _id, likes, likedByMe }; repetirlo no resta. */
  unlike: (id) => apiClient.delete(`/comments/${id}/like`),
}
