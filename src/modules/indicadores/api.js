import { http } from '../../services/http'

// Rutas y adaptador del módulo de indicadores (R48). Las pantallas consumen la
// forma del contrato, nunca la forma cruda de la API.
const RUTAS = {
  kpis: '/kpis',
  meta: '/goal',
  comparacion: '/comparison',
  porProducto: '/productRows',
  ranking: '/ranking',
  valoraciones: '/reviews',
}

/**
 * POR QUÉ ESTE MÓDULO EXISTE
 *
 * La pantalla pedía los seis recursos con `api.list()`. Pero `goal` y
 * `comparison` no son colecciones: son un objeto suelto. `http.lista()`
 * normaliza toda respuesta a la forma de lista y, ante un objeto que no trae
 * `datos`, devuelve un array vacío. Así que `comparison` llegaba como `[]`,
 * `comparison.previous` era `undefined` y leer `.year` lanzaba en pleno render:
 * React desmontaba el árbol completo y la pantalla —junto con el menú— se
 * quedaba en blanco hasta recargar.
 *
 * Lo que arregla: cada recurso se pide con el verbo que le corresponde, y el
 * adaptador garantiza la forma. Si el back devolviera un día menos campos, la
 * pantalla pinta un hueco en vez de caerse (R49).
 */

const AÑO_VACIO = { year: '—', sales: '—', products: '—' }

export const aMetaUi = (cruda) => ({
  etiqueta: cruda?.label ?? 'Meta anual de ventas',
  valor: cruda?.value ?? '—',
  porcentaje: Number(cruda?.progressPercent) || 0,
  restante: cruda?.remaining ?? null,
})

export const aComparacionUi = (cruda) => ({
  anterior: { ...AÑO_VACIO, ...(cruda?.previous ?? {}) },
  actual: { ...AÑO_VACIO, ...(cruda?.current ?? {}) },
  variacion: cruda?.yearlyDiff ?? null,
  nota: cruda?.yearlyNote ?? '',
  mensual: {
    etiqueta: cruda?.monthly?.label ?? 'Mes en curso',
    valor: cruda?.monthly?.value ?? '—',
    variacion: cruda?.monthly?.diff ?? null,
  },
})

const aFilaProductoUi = (cruda) => ({
  id: cruda.id,
  nombre: cruda.name ?? '—',
  mensual: {
    cantidad: cruda.monthly?.qty ?? '—',
    ingreso: cruda.monthly?.revenue ?? '—',
    participacion: Number(cruda.monthly?.pct) || 0,
  },
  anual: {
    cantidad: cruda.annual?.qty ?? '—',
    ingreso: cruda.annual?.revenue ?? '—',
    participacion: Number(cruda.annual?.pct) || 0,
  },
})

const aRankingUi = (crudo) => ({
  id: crudo.id,
  posicion: Number(crudo.pos) || 0,
  nombre: crudo.name ?? '—',
  cantidad: crudo.qty ?? '—',
  ingreso: crudo.revenue ?? '—',
  participacion: Number(crudo.pct) || 0,
  destacado: crudo.tone === 'gold',
})

const aValoracionUi = (cruda) => ({
  id: cruda.id,
  nombre: cruda.name ?? '—',
  reseñas: Number(cruda.count) || 0,
  puntuacion: Number(cruda.score) || 0,
})

const aKpiUi = (crudo) => ({
  id: crudo.id,
  icono: crudo.icon ?? '📊',
  etiqueta: crudo.label ?? '—',
  valor: crudo.value ?? '—',
  tendencia: crudo.trend ?? null,
})

export const indicadoresApi = {
  /** Los seis recursos en paralelo: son independientes entre sí. */
  panel: async ({ senal } = {}) => {
    const [kpis, meta, comparacion, porProducto, ranking, valoraciones] = await Promise.all([
      http.lista(RUTAS.kpis, { senal }),
      http.get(RUTAS.meta, { senal }),
      http.get(RUTAS.comparacion, { senal }),
      http.lista(RUTAS.porProducto, { senal }),
      http.lista(RUTAS.ranking, { senal }),
      http.lista(RUTAS.valoraciones, { senal }),
    ])

    return {
      kpis: kpis.datos.map(aKpiUi),
      meta: aMetaUi(meta),
      comparacion: aComparacionUi(comparacion),
      porProducto: porProducto.datos.map(aFilaProductoUi),
      ranking: ranking.datos.map(aRankingUi),
      valoraciones: valoraciones.datos.map(aValoracionUi),
    }
  },
}
