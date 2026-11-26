// ⚠️ ARCHIVO SIN USO TODAVÍA (fase 2).
// Ninguna pantalla importa este archivo: solo lo usan otros archivos de la
// misma "fase 2" (usePedidos, useVentas, pedidos/api, ventas/api,
// pedidos/calculos, store/carrito, store/bloqueos). Está preparado para cuando
// exista el back real con /pedidos/:id/estado, versiones y total autoritativo.
// Si vas a cambiar cómo funcionan Pedidos o Ventas HOY, el código está en
// Pedidos.jsx, Ventas.jsx y ventas/servicio.js, no aquí.
// Ver docs/PARTES-COMPLEJAS.md, sección "Código preparado para la fase 2".

import { config } from '../../services/config'
import { http } from '../../services/http'

const RUTAS = {
  ventas: '/sales', // futuro: /ventas
  desdePedido: '/ventas/desde-pedido',
  ticketPublico: '/ticket', // enlace sin JWT para el cliente y el visitante
}

/**
 * ADAPTADOR. La colección actual mezcla inglés (`saleId`, `status`), campos
 * derivados que el back debe calcular (`dateFormatted`, `timeRemaining`) y el
 * QR generado en el navegador. La UI trabaja contra la forma del contrato; lo
 * que hoy falta se deja en null en vez de inventarlo en el cliente, para que
 * la pantalla muestre un hueco visible y no un dato falso.
 */
export const aVentaUi = (cruda) => ({
  id: cruda.id,
  codigo: cruda.saleId ?? null,
  ticket: cruda.ticketId ?? null,
  pedidoId: cruda.pedidoId ?? null,
  pedidoCodigo: cruda.orderId ?? null,
  fecha: cruda.date ?? cruda.createdAt?.slice(0, 10) ?? null,
  hora: cruda.time ?? null,
  cliente: cruda.client ?? 'Consumidor Final',
  direccion: cruda.deliveryAddress ?? null,
  empleadoId: cruda.employeeId ?? null,
  estado: cruda.status ?? null,
  total: Number(cruda.total) || 0,
  items: (cruda.items ?? []).map((item) => ({
    id: item.id,
    producto: item.product,
    cantidad: item.quantity,
    precioUnitario: Number(item.unitPrice) || 0,
    subtotal: Number(item.price) || 0,
  })),
  // RNF-20: el payload del QR lo genera el back bajo ISO/IEC 18004. Mientras
  // no llegue, `qrCode` es el código heredado y `qrImagenUrl` queda en null.
  qrCode: cruda.qrCode ?? null,
  qrImagenUrl: cruda.qrImagenUrl ?? null,
  // RF-44: los minutos restantes los decide el servidor, que es el único con
  // un reloj no manipulable. `null` = la pantalla no puede ofrecer editar.
  minutosRestantes: cruda.minutosRestantes ?? null,
  // RNF-12: se devuelve en el PUT para que el back detecte escrituras
  // concurrentes. Si el back no lo manda, el bloqueo optimista no existe.
  version: cruda.version ?? null,
})

const aVentaApi = (ui) => ({
  client: ui.cliente,
  deliveryAddress: ui.direccion,
  status: ui.estado,
  items: ui.items.map(({ id, producto, cantidad, precioUnitario }) => ({
    id,
    product: producto,
    quantity: cantidad,
    unitPrice: precioUnitario,
  })),
  ...(ui.version ? { version: ui.version } : {}),
})

export const ventasApi = {
  listar: async ({ desde, estado, senal } = {}) => {
    const { datos, total } = await http.lista(RUTAS.ventas, { query: { desde, estado }, senal })
    return { ventas: datos.map(aVentaUi), total }
  },

  obtener: async (id, opciones) => aVentaUi(await http.get(`${RUTAS.ventas}/${id}`, opciones)),

  /**
   * Convierte un pedido en venta. Debe ser idempotente en el servidor: hoy la
   * pantalla busca primero si ya existe una venta para ese pedido, que es una
   * comprobación en dos pasos sin transacción — justo la condición de carrera
   * que RNF-12 describe. Con este endpoint, dos empleados pulsando a la vez
   * reciben la misma venta en lugar de crear dos.
   */
  generarDesdePedido: (pedidoId) => http.post(RUTAS.desdePedido, { pedidoId }),

  actualizar: (id, venta) => http.put(`${RUTAS.ventas}/${id}`, aVentaApi(venta)),

  cambiarEstado: (id, estado) => http.patch(`${RUTAS.ventas}/${id}`, { status: estado }),

  /** Enlaces, no peticiones: el binario y la página pública no pasan por fetch. */
  urlTicketPublico: (codigo) => `${config.apiUrl}${RUTAS.ticketPublico}/${codigo}`,
  urlTicketEscPos: (id) => `${config.apiUrl}${RUTAS.ventas}/${id}/ticket.escpos`,
}
