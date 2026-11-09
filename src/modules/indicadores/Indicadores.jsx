import { useCallback } from 'react'

import { api } from '../../services/api'
import { useRecurso } from '../../hooks/useRecurso'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, Error } from '../../components/ui/Estado'
import { PALETA_TORTA } from '../../data/graficas'

const RECURSOS = ['kpis', 'goal', 'comparison', 'productRows', 'ranking', 'reviews']
const MEDALLAS = { 1: '🥇', 2: '🥈', 3: '🥉' }

/** conic-gradient a partir de los porcentajes del ranking. */
const gradienteTorta = (items) => {
  let acumulado = 0
  const tramos = items.map((item, i) => {
    const inicio = acumulado
    acumulado += item.pct
    return `${PALETA_TORTA[i % PALETA_TORTA.length]} ${inicio}% ${acumulado}%`
  })
  return `conic-gradient(${tramos.join(', ')})`
}

function Panel({ titulo, etiqueta, children, className = '' }) {
  return (
    <div className={`card border-0 shadow-sm h-100 ${className}`}>
      <div className="card-header bg-white d-flex justify-content-between align-items-center">
        <h2 className="h6 fw-bold mb-0">{titulo}</h2>
        {etiqueta && <span className="badge bg-brand">{etiqueta}</span>}
      </div>
      <div className="card-body">{children}</div>
    </div>
  )
}

function BarraParticipacion({ pct }) {
  return (
    <div className="d-flex align-items-center gap-2">
      <div className="progress flex-grow-1" style={{ height: 6, minWidth: 48 }}>
        <div className="progress-bar bg-brand" style={{ width: `${pct}%` }} />
      </div>
      <span className="small">{pct}%</span>
    </div>
  )
}

export default function Indicadores() {
  const cargar = useCallback(async () => {
    const respuestas = await Promise.all(RECURSOS.map((r) => api.list(r)))
    return Object.fromEntries(RECURSOS.map((r, i) => [r, respuestas[i]]))
  }, [])

  const { datos, cargando, error, recargar } = useRecurso(cargar)

  if (cargando) return <Cargando texto="Cargando indicadores…" />
  if (error) return <Error texto={error} onReintentar={recargar} />
  if (!datos) return null

  const { kpis, goal, comparison, productRows, ranking, reviews } = datos

  return (
    <>
      <EncabezadoPagina titulo="Estadísticas de Negocio" />

      <div className="row g-3 mb-4">
        {kpis.map((kpi) => (
          <div className="col-12 col-md-4" key={kpi.id}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex align-items-center gap-3">
                <div className="icon-tile d-flex align-items-center justify-content-center flex-shrink-0">
                  {kpi.icon}
                </div>
                <div>
                  <p className="text-secondary small mb-1">{kpi.label}</p>
                  <p className="h4 fw-bold mb-1">{kpi.value}</p>
                  <p className="text-success small mb-0">{kpi.trend}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-xl-5">
          <Panel titulo="Metas de Negocio" etiqueta="En progreso">
            <div className="bg-body-tertiary rounded p-3 mb-3">
              <p className="text-secondary small mb-1">{goal.label}</p>
              <p className="h3 fw-bold text-brand mb-0">{goal.value}</p>
            </div>

            <div className="d-flex justify-content-between small mb-1">
              <span>Cumplimiento de meta anual</span>
              <strong>{goal.progressPercent}%</strong>
            </div>
            <div className="progress mb-2" style={{ height: 10 }}>
              <div className="progress-bar bg-brand" style={{ width: `${goal.progressPercent}%` }} />
            </div>
            <p className="text-secondary small mb-0">
              Faltan <strong>{goal.remaining}</strong> para alcanzar la meta anual.
            </p>
          </Panel>
        </div>

        <div className="col-12 col-xl-7">
          <Panel titulo="Comparación de Ventas" etiqueta="Vista anual">
            <div className="row g-3 mb-3">
              {[
                { tag: 'Año anterior', datos: comparison.previous },
                { tag: 'Año actual', datos: comparison.current },
              ].map(({ tag, datos: año }) => (
                <div className="col-sm-6" key={tag}>
                  <div className="border rounded p-3 h-100">
                    <p className="text-secondary small mb-2">
                      {tag} · {año.year}
                    </p>
                    <p className="small mb-1">
                      Ventas acumuladas
                      <br />
                      <strong className="fs-6">{año.sales}</strong>
                    </p>
                    <p className="small mb-0">
                      Productos vendidos
                      <br />
                      <strong className="fs-6">{año.products}</strong>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="alert alert-success d-flex justify-content-between align-items-center mb-3 py-2">
              <span className="small">Variación interanual</span>
              <strong>{comparison.yearlyDiff}</strong>
            </div>
            <p className="text-secondary small mb-2">{comparison.yearlyNote}</p>
            <p className="small mb-0">
              {comparison.monthly.label}: <strong>{comparison.monthly.value}</strong>{' '}
              <span className="text-success">{comparison.monthly.diff}</span>
            </p>
          </Panel>
        </div>
      </div>

      <div className="mb-4">
        <Panel titulo="Indicadores por Producto" etiqueta="Mensual / Anual">
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr className="text-center">
                  <th rowSpan={2} className="text-start align-middle">
                    Producto
                  </th>
                  <th colSpan={3} className="bg-body-tertiary">
                    Mensual
                  </th>
                  <th colSpan={3}>Anual</th>
                </tr>
                <tr className="text-center small text-secondary">
                  <th className="bg-body-tertiary">Cant.</th>
                  <th className="bg-body-tertiary">Ingreso</th>
                  <th className="bg-body-tertiary">Particip.</th>
                  <th>Cant.</th>
                  <th>Ingreso</th>
                  <th>Particip.</th>
                </tr>
              </thead>
              <tbody>
                {productRows.map((fila) => (
                  <tr key={fila.id}>
                    <td className="fw-semibold">{fila.name}</td>
                    <td className="text-center bg-body-tertiary">{fila.monthly.qty}</td>
                    <td className="text-center bg-body-tertiary">{fila.monthly.revenue}</td>
                    <td className="bg-body-tertiary">
                      <BarraParticipacion pct={fila.monthly.pct} />
                    </td>
                    <td className="text-center">{fila.annual.qty}</td>
                    <td className="text-center">{fila.annual.revenue}</td>
                    <td>
                      <BarraParticipacion pct={fila.annual.pct} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-7">
          <Panel titulo="Ranking de Productos Más Vendidos">
            <div className="d-flex flex-wrap align-items-center gap-4 mb-3">
              <div
                className="pie-chart flex-shrink-0"
                role="img"
                aria-label={`Participación: ${ranking.map((r) => `${r.name} ${r.pct}%`).join(', ')}`}
                style={{ background: gradienteTorta(ranking) }}
              />
              <ul className="list-unstyled small mb-0 flex-grow-1">
                {ranking.map((item, i) => (
                  <li className="d-flex align-items-center gap-2 mb-1" key={item.id}>
                    <span
                      className="d-inline-block rounded-circle flex-shrink-0"
                      style={{
                        width: 10,
                        height: 10,
                        backgroundColor: PALETA_TORTA[i % PALETA_TORTA.length],
                      }}
                    />
                    <span className="flex-grow-1">
                      {MEDALLAS[item.pos] ?? ''} {item.name}
                    </span>
                    <strong>{item.pct}%</strong>
                  </li>
                ))}
              </ul>
            </div>

            <div className="table-responsive">
              <table className="table table-sm table-hover align-middle mb-0">
                <thead>
                  <tr className="small text-secondary">
                    <th>Pos.</th>
                    <th>Producto</th>
                    <th>Ventas</th>
                    <th>Ingreso</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="badge bg-secondary-subtle text-secondary-emphasis">
                          {item.pos}
                        </span>
                      </td>
                      <td>{item.name}</td>
                      <td>{item.qty}</td>
                      <td className={item.tone === 'gold' ? 'fw-bold' : ''}>{item.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="col-12 col-xl-5">
          <Panel titulo="Productos Mejor Valorados">
            <ul className="list-group list-group-flush">
              {reviews.map((review) => (
                <li
                  className="list-group-item d-flex justify-content-between align-items-center px-0"
                  key={review.id}
                >
                  <div>
                    <p className="mb-0 fw-semibold">{review.name}</p>
                    <p className="text-secondary small mb-0">{review.count} reseñas</p>
                  </div>
                  <div className="text-end">
                    <div className="text-warning">
                      {'★'.repeat(Math.round(review.score))}
                      {'☆'.repeat(5 - Math.round(review.score))}
                    </div>
                    <small className="text-secondary">{review.score.toFixed(1)}/5</small>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  )
}
