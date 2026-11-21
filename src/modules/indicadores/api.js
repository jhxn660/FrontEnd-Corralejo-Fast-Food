import { http } from '../../services/http'
import { fechaISO } from '../../utils/format'

// Rutas y adaptador del módulo de indicadores (R48).
//
// Los indicadores se calculan en calculos.js a partir de la materia prima que da el backend:
// las ventas (/sales), las valoraciones (/comments) y la meta anual (/indicators/goal).
// Aquí solo se traduce cada registro del backend a la forma que esos cálculos esperan.
const RUTAS = {
  ventas: '/sales',
  valoraciones: '/comments',
  meta: '/indicators/goal',
}

/** Venta del backend → solo lo que los cálculos necesitan, con números de verdad. */
const aVentaUi = (venta) => ({
  id: venta._id,
  date: fechaISO(new Date(venta.fecha ?? venta.createdAt)),
  status: venta.estadoPedido === 'Cancelado' ? 'Cancelado' : 'Entregado',
  total: Number(venta.totalPagado) || 0,
  items: (venta.detalles ?? []).map((detalle) => ({
    product: detalle.producto,
    quantity: Number(detalle.cantidad) || 0,
    price: Number(detalle.subtotal) || 0,
  })),
})

/**
 * Comentario del backend → valoración para la tabla de productos valorados.
 * Toda valoración nace de un QR (`codigo`) y su venta dice qué productos se calificaron.
 * `estrellas`: la calificación 1-5 (o la valoración 1-10 dividida entre 2).
 */
const aValoracionUi = (comentario) => ({
  id: comentario._id,
  qr: comentario.codigo ?? null,
  estrellas: Number(comentario.calificacion) || (Number(comentario.valoracion) || 0) / 2,
  productos: (comentario.venta?.detalles ?? []).map((detalle) => ({
    producto: detalle.producto,
    cantidad: Number(detalle.cantidad) || 0,
  })),
})

/**
 * La meta del año en curso. El backend responde la sección sin envoltorio:
 * { label, target, achieved, ... }. Sin meta registrada `target` es null → 0, y el panel
 * dice que no hay meta: una cifra inventada en el navegador se leería como real.
 */
const aMeta = (seccion) => (Number(seccion?.target) > 0 ? Number(seccion.target) : 0)

export const indicadoresApi = {
  panel: async ({ senal } = {}) => {
    const [ventas, meta, valoraciones] = await Promise.all([
      http.get(RUTAS.ventas, { senal }),
      http.get(RUTAS.meta, { senal }).catch(() => null),
      http.get(RUTAS.valoraciones, { senal }).catch(() => []),
    ])

    return {
      ventas: ventas.map(aVentaUi),
      meta: aMeta(meta),
      valoraciones: valoraciones.map(aValoracionUi),
    }
  },

  /** La meta anual la fija el administrador; se guarda para el año en curso. */
  guardarMeta: (meta) =>
    http.put(`${RUTAS.meta}/${new Date().getFullYear()}`, { target: Number(meta) }),
}
