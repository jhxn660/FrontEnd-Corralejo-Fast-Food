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
    // Precio con papa francesa y gaseosa 250 ml. null = el plato no tiene combo.
    precioCombo: item.precioCombo ? aNumero(item.precioCombo) : null,
    descripcion: item.descripcion ?? '',
    calificacion: item.calificacion ?? null,
    // Imagen del plato, subida por el administrador. Hoy es una `data:` URL
    // guardada en el propio registro; cuando el back tenga almacenamiento de
    // archivos será una URL http y aquí no cambia nada, porque la UI solo la
    // pone en un `src`. null = sin imagen propia, se pinta el logo
    // (`imagenDe` en esquema.js).
    imagen: item.imagen ?? null,
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
  items: ui.productos.map(
    ({ nombre, precio, precioCombo, descripcion, calificacion, imagen, estado }) => ({
      nombre,
      precio,
      ...(Number(precioCombo) > 0 ? { precioCombo: Number(precioCombo) } : {}),
      ...(descripcion ? { descripcion } : {}),
      ...(calificacion ? { calificacion } : {}),
      // El campo se omite cuando no hay imagen, no se guarda en null: así
      // quitarla deja el registro como si nunca hubiera tenido una.
      ...(imagen ? { imagen } : {}),
      estado,
    })
  ),
})

/**
 * Lo que se puede vender: un producto por plato y, si tiene combo, otro más
 * con " (combo)" en el nombre. Es la ÚNICA fuente del catálogo de Pedidos y de
 * la edición de ventas, así que un plato nuevo, un precio cambiado o una
 * categoría oculta por el administrador se reflejan allí sin tocar nada más.
 * Los platos agotados y las categorías ocultas no se venden.
 */
export const productosVendibles = (categorias) =>
  categorias
    .filter((categoria) => categoria.disponible)
    .map((categoria) => ({
      id: categoria.id,
      nombre: categoria.nombre,
      icono: categoria.icono,
      productos: categoria.productos
        .filter((plato) => plato.estado !== 'Inhabilitado')
        .flatMap((plato) => [
          {
            id: plato.id,
            nombre: plato.nombre,
            precio: plato.precio,
            descripcion: plato.descripcion,
            imagen: plato.imagen,
          },
          ...(plato.precioCombo
            ? [
                {
                  id: `${plato.id}-combo`,
                  nombre: `${plato.nombre} (combo)`,
                  precio: plato.precioCombo,
                  descripcion: 'Con papa francesa y gaseosa 250 ml.',
                  // El combo es el mismo plato con acompañamiento: se queda
                  // con su imagen.
                  imagen: plato.imagen,
                  combo: true,
                },
              ]
            : []),
        ]),
    }))
    .filter((categoria) => categoria.productos.length > 0)

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
