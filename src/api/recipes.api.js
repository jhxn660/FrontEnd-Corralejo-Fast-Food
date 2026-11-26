import { apiClient } from './client'

// Módulo `recipes` del backend (/recipes). Receta de un producto: product, items: [{ supply, quantity }].
// Leer: Owner, Administrador y Empleado. Crear, editar y eliminar: solo Owner y Administrador.
export const recipesApi = {
  list: (params) => apiClient.get('/recipes', { params }),
  get: (id) => apiClient.get(`/recipes/${id}`),
  create: (payload) => apiClient.post('/recipes', payload),
  /** Solo cambian los insumos: { items }. El producto de una receta es fijo. */
  update: (id, payload) => apiClient.patch(`/recipes/${id}`, payload),
  remove: (id) => apiClient.delete(`/recipes/${id}`),
}
