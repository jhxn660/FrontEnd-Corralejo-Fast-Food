import { http } from '../../services/http'

// Las rutas del contrato acordado con el back viven aquí y en ningún otro
// sitio. Hoy apuntan a las colecciones de json-server; el día de la migración
// se cambian estas dos constantes y el adaptador, y ni el hook ni la pantalla
// se enteran.
const RUTAS = {
  categorias: '/adminMenu', // futuro: /menu/categorias
  productos: '/menu/productos', // aún no existe: los productos van anidados
}

/**
 * ADAPTADOR. El back acordado devuelve `precio: number` y los productos como
 * recurso propio con `id` y `estado`; json-server guarda `precio: "$12.500"` y
 * los anida dentro de la categoría. La UI consume SIEMPRE la forma del
 * contrato, así que la diferencia se absorbe en estas dos funciones y la
 * pantalla nunca ve un precio con formato.
 */
const aNumero = (precio) =>
  typeof precio === 'number' ? precio : Number(String(precio ?? '').replace(/\D/g, '')) || 0

export const aCategoriaUi = (cruda) => ({
  id: cruda.id,
  nombre: cruda.nombre ?? cruda.categoria ?? '',
  descripcion: cruda.descripcion ?? '',
  icono: cruda.icono ?? 'fa-solid fa-utensils',
  estado: cruda.estado ?? 'Disponible',
  disponible: (cruda.estado ?? 'Disponible') !== 'Inhabilitado',
  productos: (cruda.items ?? cruda.productos ?? []).map((item, i) => ({
    id: item.id ?? `${cruda.id}-${i}`,
    nombre: item.nombre,
    precio: aNumero(item.precio),
    descripcion: item.descripcion ?? '',
    calificacion: item.calificacion ?? null,
    estado: item.estado ?? 'Disponible',
  })),
})

/** Vuelta a la forma que acepta la API; se descartan los campos derivados. */
export const aCategoriaApi = (ui) => ({
  ...(ui.id ? { id: ui.id } : {}),
  categoria: ui.nombre,
  descripcion: ui.descripcion,
  icono: ui.icono,
  estado: ui.estado,
  items: ui.productos.map(({ nombre, precio, descripcion, calificacion, estado }) => ({
    nombre,
    precio,
    ...(descripcion ? { descripcion } : {}),
    ...(calificacion ? { calificacion } : {}),
    estado,
  })),
})

export const menuApi = {
  // `soloDisponibles` será un filtro del servidor (?estado=Disponible). Hasta
  // que exista, el hook recorta en cliente y lo deja anotado como deuda.
  listarCategorias: async ({ soloDisponibles = false, senal } = {}) => {
    const { datos, total } = await http.lista(RUTAS.categorias, {
      query: soloDisponibles ? { estado: 'Disponible' } : undefined,
      senal,
    })
    return { categorias: datos.map(aCategoriaUi), total }
  },

  crearCategoria: (ui) => http.post(RUTAS.categorias, aCategoriaApi(ui)),
  actualizarCategoria: (id, ui) => http.put(`${RUTAS.categorias}/${id}`, aCategoriaApi(ui)),
  cambiarEstadoCategoria: (id, estado) => http.patch(`${RUTAS.categorias}/${id}`, { estado }),
  eliminarCategoria: (id) => http.delete(`${RUTAS.categorias}/${id}`),

  // RF-19: inhabilitar un producto suelto. Requiere que el back lo exponga como
  // recurso propio; hasta entonces lanza en vez de simular el borrado lógico
  // reescribiendo la categoría entera, que es lo que generaría inconsistencias.
  cambiarEstadoProducto: (id, estado) => http.patch(`${RUTAS.productos}/${id}`, { estado }),
}
