import { http } from '../../services/http'

// Rutas y adaptador del módulo de indicadores (R48).
//
// Los indicadores ya no se leen de colecciones fijas (`kpis`, `comparison`,
// `productRows`, `ranking`): se calculan en calculos.js a partir de `/sales`.
// De la API solo se pide la materia prima —las ventas—, la meta anual, que es
// una decisión del negocio y no un cálculo, y las valoraciones.
const RUTAS = {
  ventas: '/sales',
  meta: '/goal',
  valoraciones: '/reviews',
}

const META_POR_DEFECTO = 180000000

const aValoracionUi = (cruda) => ({
  id: cruda.id,
  nombre: cruda.name ?? '—',
  reseñas: Number(cruda.count) || 0,
  puntuacion: Number(cruda.score) || 0,
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
