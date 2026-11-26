import { apiClient } from './client'

// Módulo `sales` del backend (/sales). Ventas: saleId, ticketId, qr, fecha, cliente, totalPagado, detalles.
export const salesApi = {
  list: (params) => apiClient.get('/sales', { params }),
  get: (id) => apiClient.get(`/sales/${id}`),
  create: (payload) => apiClient.post('/sales', payload),
  update: (id, payload) => apiClient.patch(`/sales/${id}`, payload),
  remove: (id) => apiClient.delete(`/sales/${id}`),
}
