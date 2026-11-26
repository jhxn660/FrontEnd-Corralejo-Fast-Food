import { apiClient } from './client'

// Módulo `products` del backend (/products). Productos de la carta: name, description, price,
// status, images, category y, en un combo, comboItems y comboPriceMode.
export const productsApi = {
  listPublic: () => apiClient.get('/products/public'),
  list: (params) => apiClient.get('/products', { params }),
  get: (id) => apiClient.get(`/products/${id}`),
  create: (payload) => apiClient.post('/products', payload),
  update: (id, payload) => apiClient.patch(`/products/${id}`, payload),
  remove: (id) => apiClient.delete(`/products/${id}`),
  setStatus: (id, status) => apiClient.patch(`/products/${id}/status`, { status }),
}
