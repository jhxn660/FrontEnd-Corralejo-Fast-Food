// LÓGICA DEL MÓDULO DE PEDIDOS con los módulos orders y sales del backend.
//   orders: { _id, orderNumber, estado, totalPedido, detalles: [{ productId, producto, cantidad,
//             precio_unitario, subtotal }], createdAt }
//
// Reglas del backend que esta capa respeta:
// - Un pedido no puede guardarse vacío: "Nuevo pedido" crea un BORRADOR en pantalla, que se
//   guarda en el backend al añadir el primer producto.
// - Los productos de un pedido guardado y abierto se reemplazan con la lista completa
//   (PUT /orders/:id/items): así se añaden, se quitan y se cambian cantidades.
// - Facturar = registrar la venta (POST /sales { orderId }): el pedido pasa a "Finalizado" y
//   el backend descuenta los insumos de las recetas (409 si no alcanzan).

import { datos } from '../../api/client'
import { ordersApi } from '../../api/orders.api'
import { salesApi } from '../../api/sales.api'
import { fechaISO, hora12 } from '../../utils/format'
import { COLOR_SIN_CATEGORIA, PALETA_CATEGORIAS } from '../../data/graficas'
import { menuApi, productosVendibles } from '../products/api'
import { recetasApi } from '../recipes/api'
import { describirFaltante } from '../recipes/calculos'
import { aVentaUi, eliminarVentasDePedido } from '../sales/servicio'

/** Estados: claves de la pantalla ↔ estados del backend. Los 'Cancelado' no se listan. */
const ESTADO_UI = {
  'En preparación': 'pendiente',
  Listo: 'preparacion',
  Entregado: 'preparacion',
  Finalizado: 'resuelto',
}
const ESTADO_API = { pendiente: 'En preparación', preparacion: 'Listo' }

// Borradores: pedidos creados en pantalla que aún no tienen productos (viven solo aquí).
let borradores = []

const aPedidoUi = (pedido) => {
  const creado = new Date(pedido.createdAt ?? Date.now())
  return {
    id: pedido._id,
    numero: pedido.orderNumber,
    estado: ESTADO_UI[pedido.estado] ?? 'pendiente',
    fecha: fechaISO(creado),
    hora: hora12(creado),
    items: (pedido.detalles ?? []).map((d) => ({
      name: d.producto,
      price: d.precio_unitario,
      qty: d.cantidad,
      productoId: d.productId ? String(d.productId) : null,
    })),
  }
}

const aItemApi = (item) => ({ productId: item.productoId, quantity: Number(item.qty) })

/** Número visible del pedido. */
export const numeroDe = (pedido) => pedido?.numero ?? pedido?.id

/** Siguiente número estimado para la interfaz: el mayor existente + 1. */
export const siguienteNumero = (pedidos) => {
  const numeros = pedidos.map(numeroDe).filter((n) => Number.isFinite(Number(n))).map(Number)
  return numeros.length > 0 ? Math.max(...numeros) + 1 : 1
}

/** Pedidos (borradores primero), catálogo vendible y disponibilidad de inventario. */
export const cargarPedidos = async () => {
  const [pedidos, { categorias }, disponibilidad] = await Promise.all([
    datos(ordersApi.list()),
    menuApi.listarCategorias({ soloDisponibles: true }),
    recetasApi.disponibilidad().catch((err) => ({ error: err.message })),
  ])
  const guardados = pedidos
    .filter((p) => p.estado !== 'Cancelado')
    .map(aPedidoUi)
    .sort((a, b) => Number(b.numero) - Number(a.numero))
  return {
    pedidos: [...borradores, ...guardados],
    catalogo: productosVendibles(categorias),
    disponibilidad: disponibilidad?.error ? null : disponibilidad,
    errorInventario: disponibilidad?.error ?? '',
  }
}

/** Crea un BORRADOR: se guarda en el backend cuando reciba su primer producto. */
export const crearPedido = async (numero) => {
  const ahora = new Date()
  const borrador = {
    id: `borrador-${ahora.getTime()}`,
    numero,
    estado: 'pendiente',
    fecha: fechaISO(ahora),
    hora: hora12(ahora),
    items: [],
    borrador: true,
  }
  borradores = [borrador, ...borradores]
  return borrador
}

/**
 * Guarda las líneas del pedido.
 * - Borrador: con productos, se crea en el backend (POST /orders) y deja de ser borrador.
 * - Pedido guardado: se envía la lista COMPLETA (PUT /orders/:id/items): lo que no esté se
 *   quita. Un pedido guardado no puede quedar vacío: para eso se cancela.
 */
export const guardarItems = async (pedido, items) => {
  if (pedido.borrador) {
    if (items.length === 0) return pedido
    const creado = aPedidoUi(await datos(ordersApi.create({ items: items.map(aItemApi) })))
    borradores = borradores.filter((b) => b.id !== pedido.id)
    return creado
  }

  if (items.length === 0) {
    throw new Error('Un pedido guardado no puede quedar vacío: si ya no se quiere, cancélalo.')
  }
  return aPedidoUi(await datos(ordersApi.replaceItems(pedido.id, items.map(aItemApi))))
}

/**
 * Une al pedido los productos elegidos en el catálogo: si el producto ya estaba, suma la
 * cantidad; si no, añade una línea nueva. No modifica `items`.
 */
export const combinarItems = (items, elegidos) => {
  const nuevos = items.map((item) => ({ ...item }))
  elegidos.forEach((elegido) => {
    const existente = nuevos.find((item) => item.name === elegido.name)
    if (existente) existente.qty += elegido.qty
    else nuevos.push({ ...elegido })
  })
  return nuevos
}

/**
 * Factura el pedido: registra su venta y la devuelve lista para el tiquete.
 * Si no alcanzan los insumos (409), el mensaje dice cuáles faltan y cuánto.
 */
export const facturarPedido = async (pedido) => {
  try {
    return aVentaUi(await datos(salesApi.create({ orderId: pedido.id })))
  } catch (error) {
    const faltantes = error.response?.data?.missingSupplies ?? []
    if (faltantes.length > 0) {
      const detalle = faltantes
        .map((falta) =>
          describirFaltante({ nombre: falta.name, unidad: falta.medida, requerido: falta.needed, disponible: falta.available })
        )
        .join(' · ')
      throw new Error(`${error.message}: ${detalle}.`)
    }
    throw error
  }
}

/** Cambia el estado. Reabrir uno resuelto elimina antes su venta (administración). */
export const cambiarEstado = async (pedido, estado, { borrarVenta = false } = {}) => {
  if (pedido.borrador) throw new Error('Agrega productos al pedido antes de cambiar su estado.')
  if (borrarVenta) await eliminarVentasDePedido(pedido)
  await ordersApi.update(pedido.id, { estado: ESTADO_API[estado] ?? estado })
}

/**
 * Quita el pedido de la lista.
 * - Borrador: se descarta en pantalla.
 * - Sin venta: se CANCELA (cualquier persona del personal).
 * - Con venta: se eliminan la venta y el pedido (solo administración).
 */
export const eliminarPedido = async (pedido) => {
  if (pedido.borrador) {
    borradores = borradores.filter((b) => b.id !== pedido.id)
    return
  }
  if (pedido.estado !== 'resuelto') {
    await ordersApi.update(pedido.id, { estado: 'Cancelado' })
    return
  }
  await eliminarVentasDePedido(pedido)
  await ordersApi.remove(pedido.id)
}

/**
 * Reparte el total de unidades vendidas por categoría para el gráfico de torta.
 * Un producto vendido que ya no está en la carta cae en "Otros".
 */
export function calcularVentasPorCategoria(pedidos, categorias) {
  const categoriaDe = {}
  categorias.forEach((categoria) =>
    categoria.productos.forEach((producto) => {
      categoriaDe[producto.nombre] = categoria.nombre
    })
  )

  const totales = {}
  pedidos
    .filter((pedido) => pedido.estado === 'resuelto')
    .forEach((pedido) =>
      (pedido.items ?? []).forEach((item) => {
        const nombre = categoriaDe[item.name] ?? 'Otros'
        totales[nombre] = (totales[nombre] ?? 0) + (Number(item.qty) || 0)
      })
    )

  const total = Object.values(totales).reduce((suma, valor) => suma + valor, 0)
  if (total === 0) return { total: 0, tramos: [] }

  let acumulado = 0
  const tramos = Object.entries(totales)
    .sort((a, b) => b[1] - a[1])
    .map(([nombre, cantidad], posicion) => {
      const inicio = acumulado
      acumulado += (cantidad / total) * 100
      return {
        nombre,
        cantidad,
        color: nombre === 'Otros' ? COLOR_SIN_CATEGORIA : PALETA_CATEGORIAS[posicion % PALETA_CATEGORIAS.length],
        porcentaje: (cantidad / total) * 100,
        desde: inicio,
        hasta: acumulado,
      }
    })

  return { total, tramos }
}
