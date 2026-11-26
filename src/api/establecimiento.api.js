import { apiClient } from './client'

// Módulo `establecimiento` del backend: tres recursos hermanos montados en /api:
//   /establecimiento  información institucional: titulo, subtitulo, contenido, categoria
//   /horarios         horario de atención (uno por día): dia, horaApertura, horaCierre,
//                     estaAbierto, estadoNota
//   /ubicaciones      ficha del local: titulo, descripcion, direccion, telefono, ciudad,
//                     referencia, enlaceMapa
// Lectura (GET) pública; crear, actualizar y eliminar solo ADMIN_ROLES.

/** Las cinco operaciones de un recurso del módulo: listar, obtener, crear, actualizar y eliminar. */
const recurso = (ruta) => ({
  list: (params) => apiClient.get(ruta, { params }),
  get: (id) => apiClient.get(`${ruta}/${id}`),
  create: (payload) => apiClient.post(ruta, payload),
  update: (id, payload) => apiClient.patch(`${ruta}/${id}`, payload),
  remove: (id) => apiClient.delete(`${ruta}/${id}`),
})

export const establecimientoApi = {
  ...recurso('/establecimiento'),
  horarios: recurso('/horarios'),
  ubicaciones: recurso('/ubicaciones'),
}
