// LÓGICA DE NEGOCIO DEL MÓDULO DE VENTAS.
//
// Las pantallas (Ventas.jsx, Pedidos.jsx) no saben cómo se numera una venta,
// cómo se arma su QR ni qué pasa con el pedido cuando la venta cambia: llaman
// a las funciones de este archivo. Hay dos tipos:
// - PURAS (construirVenta, minutosRestantes, cumpleRango…): reciben datos y
//   devuelven datos; no tocan la red.
// - DE PERSISTENCIA (cargarVentas, guardarVentaEditada, eliminarVentasDePedido):
//   leen y escriben en json-server a través de services/api.js.

import { api } from '../../services/api'
import { config } from '../../services/config'
import { fechaISO } from '../../utils/format'
import { idUnico } from '../../utils/id'

const MINUTOS_MODIFICACION = 75

/** Extrae el número de un código tipo "#V-12" o "#T-0007". */
const numeroDeCodigo = (codigo) =>
  parseInt(String(codigo ?? '').replace(/\D/g, ''), 10) || 0

/** Código QR único por venta, p. ej. QR-V12-8F3A91C2D4. */
const generarCodigoQR = (numeroVenta, usados = new Set()) => {
  let codigo
  do {
    codigo = `QR-V${numeroVenta}-${idUnico().replace(/-/g, '').slice(0, 10).toUpperCase()}`
  } while (usados.has(codigo))
  return codigo
}

/**
 * Enlace que abre la pantalla de valoración de esa venta.
 *
 * Es lo que el QR codifica, y no el código a secas: un QR con el texto
 * "QR-V12-8F3A91C2D4" dentro no hace nada al escanearlo —la cámara enseña esas
 * letras y ahí se acaba—, mientras que este abre el formulario con el ticket
 * ya cargado y sin pedir cuenta (R74).
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

/** Precio unitario tolerante con ventas antiguas, que solo guardaban el total de la línea. */
export const precioUnitario = (item) =>
  item.unitPrice ?? (item.quantity ? item.price / item.quantity : item.price)

/**
 * Construye la venta a partir del pedido, respetando sus productos, fecha y
 * hora. `responsable` es quien la factura (nombre o correo de la sesión): antes
 * todas las ventas quedaban a nombre de un empleado fijo, fuera quien fuera.
 */
export const construirVenta = (pedido, ventasExistentes, numeroPedido, responsable) => {
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
    employeeId: responsable || 'Sin asignar',
    orderId: `#P-${numeroPedido}`,
    pedidoId: pedido.id,
    status: 'Entregado',
    deliveryAddress: pedido.deliveryAddress || 'Local / Mostrador',
    createdAt: ahora.toISOString(),
    items,
  }
}

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

/**
 * Lista de ventas para la pantalla, ya saneada y ordenada.
 *
 * Las ventas dependen de los pedidos: si el pedido ya no existe, la venta es
 * huérfana y se borra. Las ventas antiguas sin qrCode reciben uno y se guarda.
 */
export async function cargarVentas() {
  const ventas = await api.list('sales')

  let vigentes = ventas
  try {
    const pedidos = await api.list('pedidos')
    const idsPedidos = new Set(pedidos.map((p) => String(p.id)))
    // Una lista de pedidos VACÍA casi nunca significa que todas las ventas
    // sean huérfanas: suele ser una base reiniciada o una respuesta a medias.
    // Sin esta guarda, abrir la pantalla borraba todas las ventas de golpe.
    const huerfanas =
      pedidos.length === 0
        ? []
        : ventas.filter((s) => s.pedidoId != null && !idsPedidos.has(String(s.pedidoId)))
    await Promise.all(huerfanas.map((s) => api.remove('sales', s.id).catch(() => null)))
    const idsHuerfanas = new Set(huerfanas.map((s) => s.id))
    vigentes = ventas.filter((s) => !idsHuerfanas.has(s.id))
  } catch {
    // Si /pedidos no responde se muestran todas las ventas sin tocar nada.
  }

  const usados = new Set(vigentes.map((s) => s.qrCode).filter(Boolean))
  const conQR = await Promise.all(
    vigentes.map(async (venta) => {
      if (venta.qrCode) return venta
      const qrCode = generarCodigoQR(numeroDeCodigo(venta.saleId), usados)
      usados.add(qrCode)
      return api.patch('sales', venta.id, { qrCode }).catch(() => ({ ...venta, qrCode }))
    })
  )

  // De la más reciente a la más antigua por fecha real, no por número: el
  // número no garantiza el orden cuando hay ventas de otro periodo.
  const momento = (venta) => Date.parse(venta.createdAt ?? venta.date) || 0
  return conQR.sort(
    (a, b) => momento(b) - momento(a) || numeroDeCodigo(b.saleId) - numeroDeCodigo(a.saleId)
  )
}

/**
 * Guarda la venta editada y, si viene de un pedido, deja el pedido con las
 * mismas líneas: la gráfica de Pedidos y los indicadores no deben contar cosas
 * distintas.
 */
export async function guardarVentaEditada(venta) {
  const actualizada = await api.update('sales', venta.id, venta)
  if (venta.pedidoId) {
    try {
      const pedido = await api.get('pedidos', venta.pedidoId)
      await api.update('pedidos', pedido.id, {
        ...pedido,
        items: venta.items.map((item) => ({
          name: item.product,
          price: item.unitPrice,
          qty: item.quantity,
        })),
      })
    } catch {
      // El pedido pudo borrarse; la venta ya quedó guardada.
    }
  }
  return actualizada
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
