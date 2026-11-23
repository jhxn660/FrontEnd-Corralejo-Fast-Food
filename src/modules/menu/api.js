import { http } from '../../services/http'

// LA CARTA en el backend son DOS recursos (R48):
//   - /categories: { _id, name, type: 'Producto' | 'Insumo', description, icono, status }
//   - /products:   { _id, nombre, description, price, precioCombo, calificacion, imagen,
//                    receta, isActive, category: { _id, name } }
// La pantalla, en cambio, trabaja con categorías que llevan sus platos dentro. Este archivo
// es el ÚNICO que conoce las dos formas y traduce entre ellas: la UI nunca ve `_id`,
// `price` ni `isActive`.

const RUTAS = {
  categorias: '/categories',
  productos: '/products',
  // Solo productos activos, sin token: es lo que ve la carta de clientes y visitantes.
  productosPublicos: '/products/public',
}

// Las categorías de insumos viven en la misma colección; la carta solo usa las de productos.
const TIPO_PRODUCTO = 'Producto'

// Un id de MongoDB son 24 caracteres hexadecimales. Un plato nuevo en pantalla todavía no
// tiene uno: así se distingue "crear" de "actualizar" al guardar la categoría.
const esIdDelBackend = (id) => /^[a-f\d]{24}$/i.test(String(id ?? ''))

const aNumero = (valor) => Number(valor) || 0

/* ───────────────────────── Backend → pantalla ───────────────────────── */

/** Receta del backend [{ supply, cantidad }] → la de la pantalla [{ insumo_id, cantidad_requerida }]. */
export const recetaDesdeApi = (receta = []) =>
  receta.map((linea) => ({ insumo_id: String(linea.supply), cantidad_requerida: linea.cantidad }))

const aPlatoUi = (producto) => ({
  id: producto._id,
  nombre: producto.nombre,
  precio: aNumero(producto.price),
  // Precio con papa francesa y gaseosa 250 ml. null = el plato no tiene combo.
  precioCombo: producto.precioCombo > 0 ? producto.precioCombo : null,
  descripcion: producto.description ?? '',
  calificacion: producto.calificacion || null,
  // null = sin imagen propia: se pinta el logo (`imagenDe` en esquema.js).
  imagen: producto.imagen ?? null,
  receta: recetaDesdeApi(producto.receta),
  estado: producto.isActive === false ? 'Inhabilitado' : 'Disponible',
})

const aCategoriaUi = (categoria, productos) => ({
  id: categoria._id,
  nombre: categoria.name,
  descripcion: categoria.description ?? '',
  icono: categoria.icono ?? 'fa-solid fa-utensils',
  estado: categoria.status === false ? 'Inhabilitado' : 'Disponible',
  disponible: categoria.status !== false,
  productos: productos
    .filter((producto) => String(producto.category?._id ?? producto.category) === String(categoria._id))
    .map(aPlatoUi),
})

/* ───────────────────────── Pantalla → backend ───────────────────────── */

const aCategoriaApi = (ui) => ({
  name: ui.nombre,
  type: TIPO_PRODUCTO,
  description: ui.descripcion,
  icono: ui.icono,
})

// La receta NO viaja al guardar la categoría: se edita aparte (guardarReceta), así cambiar un
// precio nunca borra la receta de un plato.
const aProductoApi = (plato, categoriaId) => ({
  nombre: plato.nombre,
  description: plato.descripcion ?? '',
  price: aNumero(plato.precio),
  precioCombo: Number(plato.precioCombo) > 0 ? Number(plato.precioCombo) : null,
  calificacion: aNumero(plato.calificacion),
  imagen: plato.imagen ?? null,
  category: categoriaId,
})

const activo = (plato) => plato.estado !== 'Inhabilitado'

/**
 * Guarda los platos de una categoría comparando lo que hay en pantalla con lo que hay en el
 * backend: los nuevos se crean, los existentes se actualizan y los que ya no están se borran.
 * Si el estado (Disponible / Inhabilitado) cambió, se usa la ruta propia de estado.
 */
async function sincronizarPlatos(categoriaId, platosUi) {
  const todos = await http.get(RUTAS.productos)
  const actuales = todos.filter(
    (producto) => String(producto.category?._id ?? producto.category) === String(categoriaId)
  )
  const idsEnPantalla = new Set(platosUi.map((plato) => String(plato.id)))

  for (const plato of platosUi) {
    const cuerpo = aProductoApi(plato, categoriaId)
    const existente = actuales.find((producto) => String(producto._id) === String(plato.id))

    if (!esIdDelBackend(plato.id) || !existente) {
      const creado = await http.post(RUTAS.productos, cuerpo)
      if (!activo(plato)) await http.patch(`${RUTAS.productos}/${creado._id}/status`, { isActive: false })
      continue
    }

    await http.patch(`${RUTAS.productos}/${plato.id}`, cuerpo)
    if ((existente.isActive !== false) !== activo(plato)) {
      await http.patch(`${RUTAS.productos}/${plato.id}/status`, { isActive: activo(plato) })
    }
  }

  // Lo que estaba en el backend y ya no está en pantalla, se quitó de la carta
  const quitados = actuales.filter((producto) => !idsEnPantalla.has(String(producto._id)))
  for (const producto of quitados) await http.delete(`${RUTAS.productos}/${producto._id}`)
}

/**
 * Lo que se puede vender: un producto por plato y, si tiene combo, otro más con " (combo)"
 * en el nombre. Es la ÚNICA fuente del catálogo de Pedidos y de la edición de ventas.
 * Cada producto lleva `productoId` (el _id del plato en el backend) y `combo`, que es lo que
 * el backend necesita para armar el pedido con los precios del catálogo.
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
        .flatMap((plato) => [
          {
            id: plato.id,
            productoId: plato.id,
            combo: false,
            nombre: plato.nombre,
            precio: plato.precio,
            descripcion: plato.descripcion,
            imagen: plato.imagen,
          },
          ...(plato.precioCombo
            ? [
                {
                  id: `${plato.id}-combo`,
                  productoId: plato.id,
                  combo: true,
                  nombre: `${plato.nombre} (combo)`,
                  precio: plato.precioCombo,
                  descripcion: 'Con papa francesa y gaseosa 250 ml.',
                  // El combo es el mismo plato con acompañamiento: se queda con su imagen.
                  imagen: plato.imagen,
                },
              ]
            : []),
        ]),
    }))
    .filter((categoria) => categoria.productos.length > 0)

export const menuApi = {
  /**
   * `soloDisponibles` (carta de clientes, visitantes y catálogo de Pedidos): usa la ruta
   * pública, que ya excluye los platos inhabilitados, y oculta las categorías inhabilitadas.
   * Sin él (Gestión de Menú del administrador) se pide todo, incluido lo inhabilitado.
   */
  listarCategorias: async ({ soloDisponibles = false, senal } = {}) => {
    const [categorias, productos] = await Promise.all([
      http.get(RUTAS.categorias, { senal }),
      http.get(soloDisponibles ? RUTAS.productosPublicos : RUTAS.productos, { senal }),
    ])

    const deProductos = categorias
      .filter((categoria) => categoria.type === TIPO_PRODUCTO)
      .filter((categoria) => !soloDisponibles || categoria.status !== false)
      .map((categoria) => aCategoriaUi(categoria, productos))

    return { categorias: deProductos, total: deProductos.length }
  },

  crearCategoria: async (ui) => {
    const creada = await http.post(RUTAS.categorias, { ...aCategoriaApi(ui), status: true })
    await sincronizarPlatos(creada._id, ui.productos ?? [])
    return creada
  },

  actualizarCategoria: async (id, ui) => {
    const actualizada = await http.patch(`${RUTAS.categorias}/${id}`, aCategoriaApi(ui))
    await sincronizarPlatos(id, ui.productos ?? [])
    return actualizada
  },

  cambiarEstadoCategoria: (id, estado) =>
    http.patch(`${RUTAS.categorias}/${id}`, { status: estado !== 'Inhabilitado' }),

  /** El backend no borra en cascada: primero se quitan los platos, luego la categoría. */
  eliminarCategoria: async (id) => {
    const todos = await http.get(RUTAS.productos)
    const suyos = todos.filter((producto) => String(producto.category?._id ?? producto.category) === String(id))
    for (const producto of suyos) await http.delete(`${RUTAS.productos}/${producto._id}`)
    return http.delete(`${RUTAS.categorias}/${id}`)
  },
}
