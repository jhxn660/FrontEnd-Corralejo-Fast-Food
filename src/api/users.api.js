import { apiClient } from './client'

// Módulo `users` del backend (/users). Cuentas de usuario (administración y la propia cuenta).
export const usersApi = {
  list: (params) => apiClient.get('/users', { params }),
  get: (id) => apiClient.get(`/users/${id}`),
  create: (payload) => apiClient.post('/users', payload),
  update: (id, payload) => apiClient.patch(`/users/${id}`, payload),
  remove: (id) => apiClient.delete(`/users/${id}`),
}
