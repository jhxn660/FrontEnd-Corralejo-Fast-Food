import { apiClient } from './client'

// Módulo `orders` del backend (/orders). Pedidos: orderNumber, estado, detalles, totalPedido.
export const ordersApi = {
  list: (params) => apiClient.get('/orders', { params }),
  get: (id) => apiClient.get(`/orders/${id}`),
  create: (payload) => apiClient.post('/orders', payload),
  update: (id, payload) => apiClient.patch(`/orders/${id}`, payload),
  remove: (id) => apiClient.delete(`/orders/${id}`),
  /** Reemplaza TODOS los productos de un pedido abierto (también quita y baja cantidades). */
  replaceItems: (id, items) => apiClient.put(`/orders/${id}/items`, { items }),
}
