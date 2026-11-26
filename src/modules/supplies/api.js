import { categoriesApi } from '../../api/categories.api'
import { datos } from '../../api/client'
import { suppliesApi } from '../../api/supplies.api'

// INSUMOS usa los módulos supplies y categories del backend.
//   supplies: { _id, name, description, medida, cost, stock, minStock,
//               status: 'Con_Stock' | 'Sin_Stock', category: { _id, name } }

// Insumos y productos comparten la colección de categorías y el nombre no se repite: las de
// insumos llevan este prefijo y la pantalla lo oculta.
const PREFIJO_CATEGORIA = 'Insumos - '
const TIPO_INSUMO = 'Insumo'

const ESTADO_UI = { Con_Stock: 'Disponible', Sin_Stock: 'Fuera de stock' }
const ESTADO_API = { Disponible: 'Con_Stock', 'Fuera de stock': 'Sin_Stock' }

/** Insumo del backend → pantalla. `stockMinimo` es el mínimo de reposición (minStock). */
const aInsumoUi = (insumo) => ({
  id: insumo._id,
  nombre: insumo.name,
  descripcion: insumo.description ?? '',
  categoria: String(insumo.category?.name ?? '').replace(PREFIJO_CATEGORIA, ''),
  unidad: insumo.medida ?? '',
  estado: ESTADO_UI[insumo.status] ?? 'Disponible',
  stockActual: Number(insumo.stock) || 0,
  costo: Number(insumo.cost) || 0,
  stockMinimo: Number(insumo.minStock) || 0,
})

/** Busca la categoría de insumos por nombre y, si no existe, la crea. */
async function idDeCategoria(nombre) {
  const nombreApi = `${PREFIJO_CATEGORIA}${nombre}`
  const existente = (await datos(categoriesApi.list())).find((c) => c.type === TIPO_INSUMO && c.name === nombreApi)
  if (existente) return existente._id
  return (await datos(categoriesApi.create({ name: nombreApi, type: TIPO_INSUMO })))._id
}

const aInsumoApi = async (ui) => ({
  name: ui.nombre,
  description: ui.descripcion,
  medida: ui.unidad,
  cost: Number(ui.costo) || 0,
  stock: Number(ui.stockActual) || 0,
  minStock: Number(ui.stockMinimo) || 0,
  status: ESTADO_API[ui.estado] ?? 'Con_Stock',
  category: await idDeCategoria(ui.categoria),
})

export const insumosApi = {
  listar: async () => (await datos(suppliesApi.list())).map(aInsumoUi),
  crear: async (ui) => suppliesApi.create(await aInsumoApi(ui)),
  actualizar: async (id, ui) => suppliesApi.update(id, await aInsumoApi(ui)),
  eliminar: (id) => suppliesApi.remove(id),
}
