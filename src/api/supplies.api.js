import { apiClient } from './client'

// Módulo `supplies` del backend (/supplies). Insumos del inventario: name, medida, cost, stock,
// minStock (stock mínimo), status, category.
export const suppliesApi = {
  list: (params) => apiClient.get('/supplies', { params }),
  get: (id) => apiClient.get(`/supplies/${id}`),
  create: (payload) => apiClient.post('/supplies', payload),
  update: (id, payload) => apiClient.patch(`/supplies/${id}`, payload),
  remove: (id) => apiClient.delete(`/supplies/${id}`),
}
