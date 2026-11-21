// LÓGICA DE NEGOCIO DEL MÓDULO DE VENTAS.
//
// Las pantallas (Ventas.jsx, Pedidos.jsx) no saben cómo llega una venta del backend ni qué
// pasa al corregirla: llaman a las funciones de este archivo. Hay dos tipos:
// - PURAS (aVentaUi, minutosRestantes, cumpleRango…): reciben datos y devuelven datos.
// - DE PERSISTENCIA (cargarVentas, guardarVentaEditada, eliminarVentasDePedido): hablan con
//   /api/sales a través de services/http.js.
//
// Lo que ahora hace el BACKEND (y ya no el navegador): numerar la venta y el tiquete, generar
// el código QR, calcular el total con los precios del catálogo y descontar los insumos.

import { http } from '../../services/http'
import { config } from '../../services/config'
import { fechaISO, hora12 } from '../../utils/format'
import { menuApi, productosVendibles } from '../menu/api'

const RUTA = '/sales'
const RUTA_PEDIDOS = '/orders'
const MINUTOS_MODIFICACION = 75

/**
 * Venta del backend → forma que usan las pantallas (tabla, detalle y tiquete).
 * Backend: { _id, saleId: 12, ticketId: 7, qr, fecha, cliente, totalPagado,
 *            empleadoResponsable, orderId: { _id, orderNumber } | null, estadoPedido,
 *            direccionEntrega, detalles: [{ producto, cantidad, precio_unitario, subtotal }] }
 */
export const aVentaUi = (venta) => {
  const fecha = new Date(venta.fecha ?? venta.createdAt)
  const dia = fechaISO(fecha)
  const [, mes, numeroDia] = dia.split('-')
  // `orderId` llega con el pedido completo (populate) o como un id suelto
  const pedido = venta.orderId && typeof venta.orderId === 'object' ? venta.orderId : null

  return {
    id: venta._id,
    saleId: `#V-${venta.saleId}`,
    date: dia,
    dateFormatted: `${numeroDia}/${mes}`,
    time: hora12(new Date(venta.createdAt ?? venta.fecha)),
    client: venta.cliente ?? 'Consumidor Final',
    total: Number(venta.totalPagado) || 0,
    ticketId: `#T-${String(venta.ticketId ?? '').padStart(4, '0')}`,
    qrCode: venta.qr ?? '',
    employeeId: venta.empleadoResponsable ?? '',
    orderId: pedido ? `#P-${pedido.orderNumber}` : '',
    pedidoId: pedido?._id ?? (venta.orderId ? String(venta.orderId) : null),
    status: venta.estadoPedido === 'Cancelado' ? 'Cancelado' : 'Entregado',
    deliveryAddress: venta.direccionEntrega ?? 'Local',
    createdAt: venta.createdAt,
    items: (venta.detalles ?? []).map((detalle, indice) => ({
      id: indice + 1,
      product: detalle.producto,
      quantity: detalle.cantidad,
      unitPrice: detalle.precio_unitario,
      price: detalle.subtotal ?? detalle.cantidad * detalle.precio_unitario,
    })),
  }
}

/**
 * Enlace que abre la pantalla de valoración de esa venta. Es lo que el QR codifica, y no el
 * código a secas: el enlace abre el formulario con el tiquete ya cargado y sin pedir cuenta.
 */
const enlaceCalificar = (venta) =>
  venta?.qrCode ? `${config.appUrl}/calificar/${venta.qrCode}` : ''

export const urlQR = (venta, tamano) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${tamano}x${tamano}&data=${encodeURIComponent(
    enlaceCalificar(venta) || venta?.ticketId || ''
  )}`

/** Minutos que le quedan a una venta para poder modificarse. */
export const minutosRestantes = (venta, ahora = Date.now()) => {
  if (!venta?.createdAt) return MINUTOS_MODIFICACION
  const transcurridos = Math.floor((ahora - new Date(venta.createdAt).getTime()) / 60000)
  return Math.max(0, MINUTOS_MODIFICACION - transcurridos)
}

/** Precio unitario tolerante con líneas que solo traen el total. */
export const precioUnitario = (item) =>
  item.unitPrice ?? (item.quantity ? item.price / item.quantity : item.price)

/** Compara el total contra un filtro tipo ">20000", "<5000" o "20000". */
export const cumpleRango = (total, rango) => {
  const limpio = rango.replace(/[^\d><]/g, '')
  if (!limpio) return true

  const valor = parseFloat(limpio.replace(/[><]/, ''))
  if (Number.isNaN(valor)) return true

  if (limpio.startsWith('>')) return total > valor
  if (limpio.startsWith('<')) return total < valor
  return total >= valor
}

/** Todas las ventas, de la más reciente a la más antigua. */
export async function cargarVentas() {
  const ventas = (await http.get(RUTA)).map(aVentaUi)
  const momento = (venta) => Date.parse(venta.createdAt ?? venta.date) || 0
  return ventas.sort((a, b) => momento(b) - momento(a))
}

// "producto×cantidad" de cada línea: si la firma cambió, cambiaron los productos de la venta
const firma = (items) =>
  items.map((item) => `${item.product}×${item.quantity}`).sort().join('|')

/**
 * Guarda una venta corregida.
 *
 * - Si solo cambiaron el cliente o la dirección: PATCH de esos campos.
 * - Si cambiaron los PRODUCTOS: el backend no permite editar las líneas de una venta (el total
 *   y el inventario ya se calcularon con ellas). El camino que ofrece es:
 *     1. eliminar la venta   → el backend devuelve los insumos al stock y reabre el pedido;
 *     2. corregir el pedido  → PUT /orders/:id/items con las líneas nuevas;
 *     3. registrar la venta  → POST /sales, que vuelve a descontar y calcular el total.
 *   La venta corregida recibe número, tiquete y QR nuevos.
 */
export async function guardarVentaEditada(venta) {
  const original = aVentaUi(await http.get(`${RUTA}/${venta.id}`))
  const campos = { cliente: venta.client, direccionEntrega: venta.deliveryAddress }

  if (firma(original.items) === firma(venta.items)) {
    return aVentaUi(await http.patch(`${RUTA}/${venta.id}`, campos))
  }

  if (!original.pedidoId) {
    throw new Error('Esta venta no viene de un pedido: sus productos no se pueden cambiar.')
  }

  // Del nombre de cada línea al producto del backend (con "(combo)" cuando lo es)
  const { categorias } = await menuApi.listarCategorias({ soloDisponibles: true })
  const porNombre = new Map(
    productosVendibles(categorias)
      .flatMap((categoria) => categoria.productos)
      .map((producto) => [producto.nombre, producto])
  )
  const items = venta.items.map((item) => {
    const producto = porNombre.get(item.product)
    if (!producto) throw new Error(`"${item.product}" ya no está en la carta.`)
    return { productId: producto.productoId, quantity: Number(item.quantity), combo: producto.combo }
  })

  await http.delete(`${RUTA}/${venta.id}`)
  await http.put(`${RUTA_PEDIDOS}/${original.pedidoId}/items`, { items })
  return aVentaUi(await http.post(RUTA, { orderId: original.pedidoId, ...campos }))
}

/**
 * Elimina la venta de un pedido (al reabrirlo o eliminarlo). El backend devuelve sus insumos
 * al stock y deja el pedido en "Listo". Devuelve cuántas se eliminaron.
 */
export const eliminarVentasDePedido = async (pedido) => {
  const ventas = (await http.get(RUTA)).map(aVentaUi)
  const asociadas = ventas.filter((venta) => String(venta.pedidoId) === String(pedido.id))

  for (const venta of asociadas) {
    await http.delete(`${RUTA}/${venta.id}`)
  }
  return asociadas.length
}
