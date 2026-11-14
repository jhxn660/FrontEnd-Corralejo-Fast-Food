import { http } from '../../services/http'

// Rutas y adaptador del módulo de indicadores (R48).
//
// Los indicadores ya no se leen de colecciones fijas (`kpis`, `comparison`,
// `productRows`, `ranking`): se calculan en calculos.js a partir de `/sales`.
// De la API solo se pide la materia prima —las ventas y los comentarios—, más
// la meta anual, que es una decisión del negocio y no un cálculo.
//
// `/comentarios` y no `/reviews`: la tabla de productos valorados salía de una
// colección fija de cinco filas escritas a mano. Ahora sale de los comentarios
// que llevan un QR, que son las valoraciones reales de los clientes
// (`valoracionesPorProducto` en calculos.js).
const RUTAS = {
  ventas: '/sales',
  meta: '/goal',
  valoraciones: '/comentarios',
}

const META_POR_DEFECTO = 180000000

/**
 * De un comentario solo viaja lo que la media necesita: la nota y los
 * productos del ticket. El texto se queda fuera a propósito —los indicadores
 * no lo enseñan, y un comentario sin moderar no tiene por qué llegar hasta
 * aquí— y `qr` se conserva porque es lo que distingue una valoración de un
 * comentario del muro.
 */
const aValoracionUi = (cruda) => ({
  id: cruda.id,
  qr: cruda.qr ?? null,
  estrellas: Number(cruda.estrellas) || 0,
  productos: (cruda.productos ?? []).map((item) => ({
    producto: item.producto,
    cantidad: Number(item.cantidad) || 0,
  })),
})

/** Solo lo que los cálculos necesitan, con números de verdad. */
const aVentaUi = (cruda) => ({
  id: cruda.id,
  date: cruda.date,
  status: cruda.status,
  total: Number(cruda.total) || 0,
  items: (cruda.items ?? []).map((item) => ({
    product: item.product,
    quantity: Number(item.quantity) || 0,
    price: Number(item.price) || 0,
  })),
})

/**
 * La meta puede venir en el formato nuevo (`meta: 180000000`) o en el viejo,
 * un texto con formato ("$180.000.000"). Se aceptan los dos.
 */
const aMeta = (cruda) => {
  if (Number(cruda?.meta) > 0) return Number(cruda.meta)
  const deTexto = Number(String(cruda?.value ?? '').replace(/\D/g, ''))
  return deTexto > 0 ? deTexto : META_POR_DEFECTO
}

export const indicadoresApi = {
  panel: async ({ senal } = {}) => {
    const [ventas, meta, valoraciones] = await Promise.all([
      http.lista(RUTAS.ventas, { senal }),
      http.get(RUTAS.meta, { senal }).catch(() => null),
      http.lista(RUTAS.valoraciones, { senal }).catch(() => ({ datos: [] })),
    ])

    return {
      ventas: ventas.datos.map(aVentaUi),
      meta: aMeta(meta),
      valoraciones: valoraciones.datos.map(aValoracionUi),
    }
  },

  /** La meta anual la fija el administrador. */
  guardarMeta: (meta) => http.put(RUTAS.meta, { label: 'Meta anual de ventas', meta }),
}
