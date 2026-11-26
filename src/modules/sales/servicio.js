// LÓGICA DEL MÓDULO DE VENTAS con el módulo sales del backend.
//   sales: { _id, saleId, ticketId, qr, fecha, cliente, totalPagado, empleadoResponsable,
//            orderId: { _id, orderNumber } | null, estadoPedido, direccionEntrega, detalles }
// El backend numera la venta y el tiquete, genera el QR y calcula el total.

import { datos } from '../../api/client'
import { salesApi } from '../../api/sales.api'
import { config } from '../../services/config'
import { fechaISO, hora12 } from '../../utils/format'

const MINUTOS_MODIFICACION = 75

/** Número del tiquete como se imprime: 1 → "#T-0001". */
export const numeroTiquete = (ticketId) => (ticketId ? `#T-${String(ticketId).padStart(4, '0')}` : '')

/** Venta del backend → forma que usan la tabla, el detalle y el tiquete. */
export const aVentaUi = (venta) => {
  const dia = fechaISO(new Date(venta.fecha ?? venta.createdAt))
  const [, mes, numeroDia] = dia.split('-')
  const pedido = venta.orderId && typeof venta.orderId === 'object' ? venta.orderId : null

  return {
    id: venta._id,
    saleId: `#V-${venta.saleId}`,
    date: dia,
    dateFormatted: `${numeroDia}/${mes}`,
    time: hora12(new Date(venta.createdAt ?? venta.fecha)),
    client: venta.cliente ?? 'Consumidor Final',
    total: Number(venta.totalPagado) || 0,
    ticketId: numeroTiquete(venta.ticketId),
    qrCode: venta.qr ?? '',
    employeeId: venta.empleadoResponsable ?? '',
    orderId: pedido ? `#P-${pedido.orderNumber}` : '',
    pedidoId: pedido?._id ?? (venta.orderId ? String(venta.orderId) : null),
    status: venta.estadoPedido === 'Cancelado' ? 'Cancelado' : 'Entregado',
    deliveryAddress: venta.direccionEntrega ?? 'Local',
    createdAt: venta.createdAt,
    items: (venta.detalles ?? []).map((d, i) => ({
      id: i + 1,
      product: d.producto,
      quantity: d.cantidad,
      unitPrice: d.precio_unitario,
      price: d.subtotal ?? d.cantidad * d.precio_unitario,
    })),
  }
}

/** Enlace que abre la pantalla de valoración de esa venta (es lo que codifica el QR). */
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
  const ventas = (await datos(salesApi.list())).map(aVentaUi)
  const momento = (venta) => Date.parse(venta.createdAt ?? venta.date) || 0
  return ventas.sort((a, b) => momento(b) - momento(a))
}

/**
 * Guarda una venta corregida: solo cliente y dirección de entrega, lo único que el backend deja
 * cambiar de una venta registrada (PATCH /sales/:id, administración). Los productos se corrigen
 * reabriendo el pedido (ver EditarVenta).
 */
export async function guardarVentaEditada(venta) {
  const cambios = { cliente: venta.client, direccionEntrega: venta.deliveryAddress }
  return aVentaUi(await datos(salesApi.update(venta.id, cambios)))
}

/** Elimina las ventas de un pedido (administración). Devuelve cuántas se eliminaron. */
export const eliminarVentasDePedido = async (pedido) => {
  const asociadas = (await datos(salesApi.list())).map(aVentaUi).filter((v) => String(v.pedidoId) === String(pedido.id))
  for (const venta of asociadas) await salesApi.remove(venta.id)
  return asociadas.length
}
