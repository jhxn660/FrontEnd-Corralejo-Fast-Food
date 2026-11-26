import { apiClient } from './client'

// Módulo `pqrs` del backend (/pqrs). Peticiones, quejas, reclamos y sugerencias: tipo, asunto,
// descripcion, estado y la respuesta del restaurante (respuesta, respondedAt).
export const pqrsApi = {
  /** Solo las PQRS del Cliente que inició sesión (GET /pqrs/mine). */
  listMine: () => apiClient.get('/pqrs/mine'),
  list: (params) => apiClient.get('/pqrs', { params }),
  get: (id) => apiClient.get(`/pqrs/${id}`),
  create: (payload) => apiClient.post('/pqrs', payload),
  /** Administración: { estado?, respuesta? }. Lo que escribió el Cliente no se edita. */
  update: (id, payload) => apiClient.patch(`/pqrs/${id}`, payload),
  remove: (id) => apiClient.delete(`/pqrs/${id}`),
}
