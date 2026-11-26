import { datos } from '../../api/client'
import { productsApi } from '../../api/products.api'
import { recipesApi } from '../../api/recipes.api'
import { insumosApi } from '../supplies/api'

import { limpiarReceta, redondear, unidadesPosibles } from './calculos'

// MÓDULO `recipes` del backend: qué insumos gasta cada producto.
//   recipes: { _id, product: { _id, name, price }, items: [{ supply: { _id, name, medida, stock }, quantity }] }
// La pantalla usa la forma de calculos.js: receta = [{ insumo_id, cantidad_requerida }].

/** Receta del backend → { id, productoId, receta } de la pantalla. */
const aRecetaUi = (recipe) => ({
  id: recipe._id,
  productoId: String(recipe.product?._id ?? recipe.product),
  receta: (recipe.items ?? [])
    // Un insumo eliminado del inventario llega como null: esa línea ya no cuenta
    .filter((item) => item.supply)
    .map((item) => ({ insumo_id: String(item.supply._id ?? item.supply), cantidad_requerida: Number(item.quantity) })),
})

/** Receta de la pantalla → items del backend. */
const aItemsApi = (receta) =>
  limpiarReceta(receta).map(({ insumo_id, cantidad_requerida }) => ({
    supply: insumo_id,
    quantity: cantidad_requerida,
  }))

export const recetasApi = {
  /** Todas las recetas, indexadas por el id del producto: Map(productoId → { id, receta }). */
  listar: async () => new Map((await datos(recipesApi.list())).map(aRecetaUi).map((r) => [r.productoId, r])),

  /**
   * Guarda la receta de un producto (Owner y Administrador):
   *   - sin receta previa → la crea;  - con receta → cambia sus insumos;
   *   - lista vacía → elimina la receta (el producto deja de gastar inventario).
   */
  guardar: async (productoId, receta, recetaId) => {
    const items = aItemsApi(receta)
    if (items.length === 0) return recetaId ? recipesApi.remove(recetaId) : null
    if (recetaId) return recipesApi.update(recetaId, { items })
    return recipesApi.create({ product: productoId, items })
  },

  eliminar: (recetaId) => recipesApi.remove(recetaId),

  /**
   * Disponibilidad de inventario para Pedidos: qué gasta cada producto y cuánto hay de cada
   * insumo. La lee también el Empleado (recetas, productos e insumos son de lectura para él).
   *   { productos: [{ nombre, receta, limitante }], insumos: { [id]: { nombre, unidad, stockActual } } }
   * Un combo no tiene receta propia: su receta es la suma de las de sus productos × cantidad.
   */
  disponibilidad: async () => {
    const [recetas, productos, insumos] = await Promise.all([
      recetasApi.listar(),
      datos(productsApi.list()),
      insumosApi.listar(),
    ])
    const insumoPorId = Object.fromEntries(
      insumos.map((insumo) => [
        String(insumo.id),
        { nombre: insumo.nombre, unidad: insumo.unidad, stockActual: insumo.stockActual },
      ])
    )
    const recetaPropia = (productoId) => recetas.get(String(productoId))?.receta ?? []

    /** Receta de un producto; la de un combo suma las de sus productos (cantidad × receta). */
    const recetaDe = (producto) => {
      if (!producto.comboItems?.length) return recetaPropia(producto._id)
      const total = new Map()
      producto.comboItems.forEach(({ product, quantity }) => {
        recetaPropia(product?._id ?? product).forEach(({ insumo_id, cantidad_requerida }) => {
          total.set(insumo_id, redondear((total.get(insumo_id) ?? 0) + cantidad_requerida * quantity))
        })
      })
      return [...total].map(([insumo_id, cantidad_requerida]) => ({ insumo_id, cantidad_requerida }))
    }

    /** El insumo que pone el techo: con el que salen menos unidades. */
    const limitanteDe = (receta) => {
      const [peor] = receta
        .map((linea) => ({ linea, unidades: unidadesPosibles([linea], (id) => insumoPorId[id]?.stockActual ?? 0) }))
        .sort((a, b) => a.unidades - b.unidades)
      return peor ? { nombre: insumoPorId[peor.linea.insumo_id]?.nombre ?? 'Insumo eliminado' } : null
    }

    return {
      productos: productos.map((producto) => {
        const receta = recetaDe(producto)
        return { nombre: producto.name, receta, limitante: limitanteDe(receta) }
      }),
      insumos: insumoPorId,
    }
  },
}
