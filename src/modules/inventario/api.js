import { http } from '../../services/http'

// INSUMOS E INVENTARIO: un solo módulo, igual que en el backend (/api/supplies).
//   - insumosApi:    el CRUD de la pantalla Inventario.
//   - inventarioApi: recetas y unidades disponibles. El descuento de stock al vender lo hace
//                    el backend solo, al registrar la venta (y lo devuelve al eliminarla).
// Las rutas viven aquí y en ningún otro sitio (R48).

const RUTAS = {
  insumos: '/supplies',
  categorias: '/categories',
  disponibilidad: '/supplies/availability',
  productos: '/products',
}

// En el backend, insumos y productos comparten la colección de categorías y el nombre no se
// puede repetir. Para que la categoría de insumos "Bebidas" no choque con la categoría de la
// carta "Bebidas", las de insumos se guardan con este prefijo y la pantalla lo oculta.
const PREFIJO_CATEGORIA = 'Insumos - '
const TIPO_INSUMO = 'Insumo'

const ESTADO_UI = { Con_Stock: 'Disponible', Sin_Stock: 'Fuera de stock' }
const ESTADO_API = { Disponible: 'Con_Stock', 'Fuera de stock': 'Sin_Stock' }

/**
 * Insumo del backend → forma de la pantalla.
 * El backend guarda nombre, descripción, medida, costo, stock, estado y categoría. Los demás
 * campos de la ficha (stock mínimo, vencimiento, proveedor…) no existen allí: llegan vacíos.
 */
const aInsumoUi = (insumo) => ({
  id: insumo._id,
  nombre: insumo.name,
  descripcion: insumo.description ?? '',
  categoria: String(insumo.category?.name ?? '').replace(PREFIJO_CATEGORIA, ''),
  unidad: insumo.medida ?? '',
  estado: ESTADO_UI[insumo.state] ?? 'Disponible',
  stockActual: Number(insumo.stock) || 0,
  costo: Number(insumo.cost) || 0,
  stockMinimo: 0,
  vencimiento: '',
  pesoUnidad: '',
  calorias: '',
  proveedor: '',
})

/** Busca la categoría de insumos por nombre y, si no existe todavía, la crea. */
async function idDeCategoria(nombre) {
  const nombreApi = `${PREFIJO_CATEGORIA}${nombre}`
  const categorias = await http.get(RUTAS.categorias)
  const existente = categorias.find((c) => c.type === TIPO_INSUMO && c.name === nombreApi)
  if (existente) return existente._id

  const creada = await http.post(RUTAS.categorias, { name: nombreApi, type: TIPO_INSUMO })
  return creada._id
}

const aInsumoApi = async (ui) => ({
  name: ui.nombre,
  description: ui.descripcion,
  medida: ui.unidad,
  cost: Number(ui.costo) || 0,
  stock: Number(ui.stockActual) || 0,
  state: ESTADO_API[ui.estado] ?? 'Con_Stock',
  category: await idDeCategoria(ui.categoria),
})

export const insumosApi = {
  listar: async ({ senal } = {}) => (await http.get(RUTAS.insumos, { senal })).map(aInsumoUi),
  crear: async (ui) => http.post(RUTAS.insumos, await aInsumoApi(ui)),
  actualizar: async (id, ui) => http.patch(`${RUTAS.insumos}/${id}`, await aInsumoApi(ui)),
  eliminar: (id) => http.delete(`${RUTAS.insumos}/${id}`),
}

export const inventarioApi = {
  /** { productos: [{ id, nombre, receta, controlado, disponibles, agotado, limitante }], insumos } */
  disponibilidad: ({ senal } = {}) => http.get(RUTAS.disponibilidad, { senal }),

  /**
   * Reemplaza la receta de un plato. Vacía = el plato deja de controlarse.
   * La pantalla usa [{ insumo_id, cantidad_requerida }]; el backend [{ supply, cantidad }].
   */
  guardarReceta: (platoId, receta) =>
    http.patch(`${RUTAS.productos}/${platoId}`, {
      receta: receta.map((linea) => ({ supply: linea.insumo_id, cantidad: Number(linea.cantidad_requerida) })),
    }),
}
