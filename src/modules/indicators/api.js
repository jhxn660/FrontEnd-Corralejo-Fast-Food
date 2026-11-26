import { datos } from '../../api/client'
import { commentsApi } from '../../api/comments.api'
import { indicatorsApi } from '../../api/indicators.api'
import { salesApi } from '../../api/sales.api'
import { fechaISO } from '../../utils/format'

// Los indicadores se calculan en calculos.js con la materia prima del backend:
// ventas (sales), valoraciones (comments) y la meta anual (indicators/goal).

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

/** Valoración por QR: `estrellas` es la calificación 1-5 (o la valoración 1-10 entre 2). */
const aValoracionUi = (comentario) => ({
  id: comentario._id,
  qr: comentario.codigo ?? null,
  estrellas: Number(comentario.calificacion) || (Number(comentario.valoracion) || 0) / 2,
  productos: (comentario.venta?.detalles ?? []).map((detalle) => ({
    producto: detalle.producto,
    cantidad: Number(detalle.cantidad) || 0,
  })),
})

export const indicadoresApi = {
  panel: async () => {
    const [ventas, meta, valoraciones] = await Promise.all([
      datos(salesApi.list()),
      // La sección de meta llega SIN envoltorio { msg, data }: { target, achieved, ... }
      indicatorsApi.getGoal().then((r) => r.data).catch(() => null),
      datos(commentsApi.list()).catch(() => []),
    ])
    return {
      ventas: ventas.map(aVentaUi),
      meta: Number(meta?.target) > 0 ? Number(meta.target) : 0,
      valoraciones: valoraciones.map(aValoracionUi),
    }
  },

  /** La meta anual se guarda para el año en curso. */
  guardarMeta: (meta) => indicatorsApi.setGoal(new Date().getFullYear(), Number(meta)),
}
