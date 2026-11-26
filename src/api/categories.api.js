import { apiClient } from './client'

// Módulo `categories` del backend (/categories). Categorías de productos e insumos (campo type).
export const categoriesApi = {
  list: (params) => apiClient.get('/categories', { params }),
  get: (id) => apiClient.get(`/categories/${id}`),
  create: (payload) => apiClient.post('/categories', payload),
  update: (id, payload) => apiClient.patch(`/categories/${id}`, payload),
  remove: (id) => apiClient.delete(`/categories/${id}`),
}
