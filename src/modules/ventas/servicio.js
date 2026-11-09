import { api } from '../../services/api'
import { fechaISO } from '../../utils/format'

// Pedidos deja aquí el id de la venta recién generada y Ventas la resalta al
// abrirse. Vive en el servicio para que ninguna pantalla importe de otra.
export const CLAVE_VENTA_RECIENTE = 'ventaReciente'

export const MINUTOS_MODIFICACION = 75
export const EMPLEADO_POR_DEFECTO = '#E-007'

/** Extrae el número de un código tipo "#V-12" o "#T-0007". */
export const numeroDeCodigo = (codigo) =>
  parseInt(String(codigo ?? '').replace(/\D/g, ''), 10) || 0

/** Código QR único por venta, p. ej. QR-V12-8F3A91C2D4. */
export const generarCodigoQR = (numeroVenta, usados = new Set()) => {
  let codigo
  do {
    const semilla =
      globalThis.crypto?.randomUUID?.() ??
      `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    codigo = `QR-V${numeroVenta}-${semilla.replace(/-/g, '').slice(0, 10).toUpperCase()}`
  } while (usados.has(codigo))
  return codigo
}

export const urlQR = (venta, tamano) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${tamano}x${tamano}&data=${encodeURIComponent(
    venta?.qrCode || venta?.ticketId || ''
  )}`

/** Minutos que le quedan a una venta para poder modificarse. */
export const minutosRestantes = (venta) => {
  if (!venta?.createdAt) return MINUTOS_MODIFICACION
  const transcurridos = Math.floor((Date.now() - new Date(venta.createdAt).getTime()) / 60000)
  return Math.max(0, MINUTOS_MODIFICACION - transcurridos)
}

/** Precio unitario tolerante con ventas antiguas, que solo guardaban el total de la línea. */
export const precioUnitario = (item) =>
  item.unitPrice ?? (item.quantity ? item.price / item.quantity : item.price)

/** Construye la venta a partir del pedido, respetando sus productos, fecha y hora. */
export const construirVenta = (pedido, ventasExistentes, numeroPedido) => {
  const ahora = new Date()
  const numeroVenta = Math.max(0, ...ventasExistentes.map((s) => numeroDeCodigo(s.saleId))) + 1
  const numeroTicket = Math.max(0, ...ventasExistentes.map((s) => numeroDeCodigo(s.ticketId))) + 1

  const fecha = pedido.fecha || fechaISO(ahora)
  const [, mes, dia] = fecha.split('-')

  const items = pedido.items.map((item, i) => ({
    id: i + 1,
    product: item.name,
    quantity: Number(item.qty) || 0,
    unitPrice: Number(item.price) || 0,
    price: (Number(item.price) || 0) * (Number(item.qty) || 0),
  }))

  return {
    saleId: `#V-${numeroVenta}`,
    date: fecha,
    dateFormatted: `${dia}/${mes}`,
    time: pedido.hora || '',
    client: pedido.client || 'Consumidor Final',
    total: items.reduce((suma, item) => suma + item.price, 0),
    ticketId: `#T-${String(numeroTicket).padStart(4, '0')}`,
    qrCode: generarCodigoQR(
      numeroVenta,
      new Set(ventasExistentes.map((s) => s.qrCode).filter(Boolean))
    ),
    employeeId: pedido.employeeId || EMPLEADO_POR_DEFECTO,
    orderId: `#P-${numeroPedido}`,
    pedidoId: pedido.id,
    status: 'Entregado',
    deliveryAddress: pedido.deliveryAddress || 'Local / Mostrador',
    createdAt: ahora.toISOString(),
    items,
  }
}

/**
 * Una venta solo existe mientras su pedido esté resuelto: al cancelar, eliminar
 * o reabrir el pedido hay que borrarla. Devuelve cuántas se eliminaron.
 */
export const eliminarVentasDePedido = async (pedido, numeroPedido) => {
  const ventas = await api.list('sales')
  const codigo = `#P-${numeroPedido}`
  const asociadas = ventas.filter((s) => s.pedidoId === pedido.id || s.orderId === codigo)

  for (const venta of asociadas) {
    await api.remove('sales', venta.id).catch(() => null) // 404 = ya no existe
  }
  return asociadas.length
}
