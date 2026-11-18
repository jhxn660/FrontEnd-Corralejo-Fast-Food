// Acceso genérico a las colecciones de json-server (`api.list('insumos')`).
// Pasa por http.js: timeout y errores normalizados. Los módulos con reglas
// propias declaran sus rutas en su `api.js` (modules/<dominio>/api.js).

import { http } from './http'

export const api = {
  list: async (recurso, query) => (await http.lista(`/${recurso}`, { query })).datos,

  /**
   * Recurso que NO es una colección: en db.json hay claves que guardan un
   * objeto suelto (`catalogo`, `goal`, `comparison`), no un array.
   *
   * Hace falta una entrada propia porque `list()` normaliza toda respuesta a la
   * forma de lista, y ante un objeto que no trae `datos` devuelve un array
   * vacío. Eso es lo que dejaba el catálogo de Pedidos sin productos —la
   * gráfica marcaba un único 100% de "Otros" y el modal de catálogo se abría en
   * blanco— y lo que tumbaba Gestión de Indicadores al leer `comparison`.
   */
  obtener: (recurso, query) => http.get(`/${recurso}`, { query }),

  get: (recurso, id) => http.get(`/${recurso}/${id}`),
  create: (recurso, body) => http.post(`/${recurso}`, body),
  update: (recurso, id, body) => http.put(`/${recurso}/${id}`, body),
  patch: (recurso, id, body) => http.patch(`/${recurso}/${id}`, body),
  remove: (recurso, id) => http.delete(`/${recurso}/${id}`),
}
