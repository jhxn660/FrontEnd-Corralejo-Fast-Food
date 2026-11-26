import { categoriesApi } from '../../api/categories.api'
import { datos, getImageUrl } from '../../api/client'
import { productsApi } from '../../api/products.api'

// LA CARTA usa dos módulos del backend: categories y products.
//   categories: { _id, name, type: 'Producto' | 'Insumo', description, status }
//   products:   { _id, name, description, price, stock, status, images: [{ url, isMain }],
//                 category: { _id, name },
//                 comboItems: [{ product: { _id, name, price }, quantity }], comboPriceMode,
//                 rating: { score, count } }   ← rating solo en la carta pública
// La pantalla trabaja con categorías que llevan sus platos dentro; este archivo traduce.
//
// COMBO = un producto que agrupa productos ya hechos (comboItems no vacío). Su precio:
//   'sum'    → "Sumar Precio Productos" (el backend lo recalcula si cambian sus productos)
//   'custom' → "Determinar Precio" (lo escribe la administración)

const TIPO_PRODUCTO = 'Producto'

// Un _id de MongoDB son 24 caracteres hexadecimales: un plato nuevo en pantalla no lo tiene.
const esIdDelBackend = (id) => /^[a-f\d]{24}$/i.test(String(id ?? ''))

const idCategoriaDe = (producto) => String(producto.category?._id ?? producto.category ?? '')

/** La imagen principal (isMain) o, si no hay, la primera. */
const imagenPrincipal = (images = []) => {
  const imagen = images.find((i) => i.isMain) ?? images[0]
  return imagen ? getImageUrl(imagen.url) : null
}

/** Productos de un combo → { productoId, nombre, precio, cantidad } y lo que costarían por separado. */
const aComboUi = (producto) => {
  const items = (producto.comboItems ?? []).map(({ product, quantity }) => ({
    productoId: String(product?._id ?? product),
    nombre: product?.name ?? 'Producto eliminado',
    precio: Number(product?.price) || 0,
    cantidad: Number(quantity) || 1,
  }))
  return {
    modoPrecio: producto.comboPriceMode ?? 'custom',
    items,
    porSeparado: items.reduce((total, item) => total + item.precio * item.cantidad, 0),
  }
}

const aPlatoUi = (producto) => ({
  id: producto._id,
  nombre: producto.name,
  precio: Number(producto.price) || 0,
  descripcion: producto.description ?? '',
  imagen: imagenPrincipal(producto.images),
  estado: producto.status === false ? 'Inhabilitado' : 'Disponible',
  categoriaId: idCategoriaDe(producto),
  esCombo: (producto.comboItems?.length ?? 0) > 0,
  combo: aComboUi(producto),
  // Estrellas (1-5) que le dieron los clientes al calificar sus compras con el QR del tiquete.
  // Solo las trae la carta pública; sin valoraciones queda en null.
  calificacion: Number(producto.rating?.score) > 0 ? Number(producto.rating.score) : null,
  totalCalificaciones: Number(producto.rating?.count) || 0,
})

const aCategoriaUi = (categoria, productos) => ({
  id: categoria._id,
  nombre: categoria.name,
  descripcion: categoria.description ?? '',
  icono: 'fa-solid fa-utensils',
  estado: categoria.status === false ? 'Inhabilitado' : 'Disponible',
  disponible: categoria.status !== false,
  productos: productos.filter((p) => idCategoriaDe(p) === String(categoria._id)).map(aPlatoUi),
})

/** Plato de la pantalla → producto del backend. La imagen viaja como images[{ url, isMain }]. */
const aProductoApi = (plato, categoriaId) => ({
  name: plato.nombre,
  description: plato.descripcion ?? '',
  price: Number(plato.precio) || 0,
  images: plato.imagen ? [{ url: plato.imagen, isMain: true }] : [],
  category: categoriaId,
})

const activo = (plato) => plato.estado !== 'Inhabilitado'

/**
 * Guarda los platos de una categoría comparando la pantalla con el backend: los nuevos se
 * crean, los existentes se actualizan y los que ya no están se borran. El estado
 * (Disponible / Inhabilitado) usa su ruta propia: PATCH /products/:id/status.
 */
async function sincronizarPlatos(categoriaId, platosUi) {
  const actuales = (await datos(productsApi.list())).filter((p) => idCategoriaDe(p) === String(categoriaId))
  const idsEnPantalla = new Set(platosUi.map((plato) => String(plato.id)))

  for (const plato of platosUi) {
    const existente = actuales.find((p) => String(p._id) === String(plato.id))
    if (!esIdDelBackend(plato.id) || !existente) {
      const creado = await datos(productsApi.create(aProductoApi(plato, categoriaId)))
      if (!activo(plato)) await productsApi.setStatus(creado._id, false)
      continue
    }
    await productsApi.update(plato.id, aProductoApi(plato, categoriaId))
    if ((existente.status !== false) !== activo(plato)) await productsApi.setStatus(plato.id, activo(plato))
  }

  for (const producto of actuales.filter((p) => !idsEnPantalla.has(String(p._id)))) {
    await productsApi.remove(producto._id)
  }
}

/**
 * Lo que se puede vender: un producto por plato; los combos se venden como un producto más.
 * Es la única fuente del catálogo de Pedidos.
 */
export const productosVendibles = (categorias) =>
  categorias
    .filter((categoria) => categoria.disponible)
    .map((categoria) => ({
      id: categoria.id,
      nombre: categoria.nombre,
      icono: categoria.icono,
      productos: categoria.productos
        .filter(activo)
        .map((plato) => ({
          id: plato.id,
          productoId: plato.id,
          combo: plato.esCombo,
          nombre: plato.nombre,
          precio: plato.precio,
          descripcion: plato.descripcion,
          imagen: plato.imagen,
        })),
    }))
    .filter((categoria) => categoria.productos.length > 0)

export const menuApi = {
  /**
   * `soloDisponibles` (carta de clientes, visitantes y catálogo de Pedidos): la ruta pública
   * de productos, agrupada por su categoría (no necesita sesión).
   * Sin él (Gestión de Menú): categorías y productos completos, incluido lo inhabilitado.
   */
  listarCategorias: async ({ soloDisponibles = false } = {}) => {
    if (soloDisponibles) {
      const productos = await datos(productsApi.listPublic())
      // Las categorías salen de los propios productos (sin repetir: un Map por id)
      const porId = new Map()
      productos.filter((p) => p.category).forEach((p) => porId.set(idCategoriaDe(p), p.category))
      const categorias = [...porId.values()]
      const lista = categorias.map((c) => aCategoriaUi(c, productos))
      return { categorias: lista, total: lista.length }
    }

    const [categorias, productos] = await Promise.all([datos(categoriesApi.list()), datos(productsApi.list())])
    const lista = categorias.filter((c) => c.type === TIPO_PRODUCTO).map((c) => aCategoriaUi(c, productos))
    return { categorias: lista, total: lista.length }
  },

  crearCategoria: async (ui) => {
    const nueva = { name: ui.nombre, type: TIPO_PRODUCTO, description: ui.descripcion, status: true }
    const creada = await datos(categoriesApi.create(nueva))
    await sincronizarPlatos(creada._id, ui.productos ?? [])
    return creada
  },

  actualizarCategoria: async (id, ui) => {
    const actualizada = await datos(categoriesApi.update(id, { name: ui.nombre, description: ui.descripcion }))
    await sincronizarPlatos(id, ui.productos ?? [])
    return actualizada
  },

  cambiarEstadoCategoria: (id, estado) => categoriesApi.update(id, { status: estado !== 'Inhabilitado' }),

  /**
   * Crea o edita un combo (un producto con comboItems). Con modo 'sum' el backend calcula el
   * precio; con 'custom' se guarda el que escribió la administración.
   */
  guardarCombo: ({ id, nombre, descripcion, categoriaId, imagen, modoPrecio, precio, items }) => {
    const producto = {
      name: nombre,
      description: descripcion ?? '',
      category: categoriaId,
      images: imagen ? [{ url: imagen, isMain: true }] : [],
      comboPriceMode: modoPrecio,
      price: Number(precio) || 0,
      comboItems: items.map((item) => ({ product: item.productoId, quantity: Number(item.cantidad) })),
    }
    return id ? productsApi.update(id, producto) : productsApi.create(producto)
  },

  /** El backend no borra en cascada: primero los platos, luego la categoría. */
  eliminarCategoria: async (id) => {
    const suyos = (await datos(productsApi.list())).filter((p) => idCategoriaDe(p) === String(id))
    for (const producto of suyos) await productsApi.remove(producto._id)
    return categoriesApi.remove(id)
  },
}
