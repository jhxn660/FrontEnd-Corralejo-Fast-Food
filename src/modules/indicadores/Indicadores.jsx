import { useCallback } from 'react'

import { useRecurso } from '../../hooks/useRecurso'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'
import { PALETA_TORTA } from '../../data/graficas'
import { indicadoresApi } from './api'

const MEDALLAS = { 1: '🥇', 2: '🥈', 3: '🥉' }

/** conic-gradient a partir de los porcentajes del ranking. */
const gradienteTorta = (items) => {
  if (items.length === 0) return 'conic-gradient(var(--cff-cat-otros) 0% 100%)'

  let acumulado = 0
  const tramos = items.map((item, i) => {
    const inicio = acumulado
    acumulado += item.participacion
    return `${PALETA_TORTA[i % PALETA_TORTA.length]} ${inicio}% ${acumulado}%`
  })
  return `conic-gradient(${tramos.join(', ')})`
}

function Panel({ titulo, etiqueta, icono, children, className = '' }) {
  return (
    <div className={`card border-0 shadow-sm h-100 ${className}`}>
      <div className="card-header bg-white d-flex justify-content-between align-items-center gap-2">
        <h2 className="h6 fw-bold mb-0">
          {icono && <i className={`fa-solid ${icono} text-brand me-2`} />}
          {titulo}
        </h2>
        {etiqueta && <span className="badge bg-brand flex-shrink-0">{etiqueta}</span>}
      </div>
      <div className="card-body">{children}</div>
    </div>
  )
}

function BarraParticipacion({ porcentaje }) {
  return (
    <div className="d-flex align-items-center gap-2">
      <div
        className="progress flex-grow-1"
        style={{ height: 7, minWidth: 48 }}
        role="img"
        aria-label={`Participación ${porcentaje}%`}
      >
        <div className="progress-bar bg-brand" style={{ width: `${porcentaje}%` }} />
      </div>
      <span className="small fw-semibold" style={{ minWidth: '2.5rem' }}>
        {porcentaje}%
      </span>
    </div>
  )
}

export default function Indicadores() {
  const cargar = useCallback(() => indicadoresApi.panel(), [])
  const { datos, cargando, error, recargar } = useRecurso(cargar)

  if (cargando) return <Cargando texto="Cargando indicadores…" />
  if (error) {
    return (
      <>
        <EncabezadoPagina titulo="Estadísticas de Negocio" />
        <MensajeError texto={error} onReintentar={recargar} />
      </>
    )
  }
  if (!datos) return null

  const { kpis, meta, comparacion, porProducto, ranking, valoraciones } = datos
  const años = [
    { etiqueta: 'Año anterior', año: comparacion.anterior, destacado: false },
    { etiqueta: 'Año actual', año: comparacion.actual, destacado: true },
  ]

  return (
    <>
      <EncabezadoPagina
        titulo="Estadísticas de Negocio"
        descripcion="Ventas, metas y productos con mejor desempeño."
      >
        <button className="btn btn-outline-secondary" onClick={recargar}>
          <i className="fa-solid fa-rotate me-2" />
          Actualizar
        </button>
      </EncabezadoPagina>

      <div className="row g-3 mb-3">
        {kpis.map((kpi) => (
          <div className="col-12 col-md-4" key={kpi.id}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex align-items-center gap-3">
                <div className="icon-tile d-flex align-items-center justify-content-center flex-shrink-0">
                  {kpi.icono}
                </div>
                <div className="min-width-0">
                  <p className="text-secondary small text-uppercase fw-semibold mb-1">
                    {kpi.etiqueta}
                  </p>
                  <p className="h4 fw-bold mb-1">{kpi.valor}</p>
                  {kpi.tendencia && (
                    <p className="text-success small fw-semibold mb-0">{kpi.tendencia}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3 mb-3">
        <div className="col-12 col-xl-5">
          <Panel titulo="Metas de Negocio" etiqueta="En progreso" icono="fa-bullseye">
            <div className="modal-resumen mb-3">
              <p className="text-secondary small mb-1">{meta.etiqueta}</p>
              <p className="h3 fw-bold text-brand mb-0">{meta.valor}</p>
            </div>

            <div className="d-flex justify-content-between small mb-1">
              <span>Cumplimiento de meta anual</span>
              <strong>{meta.porcentaje}%</strong>
            </div>
            <div className="progress mb-2" style={{ height: 12 }}>
              <div
                className="progress-bar bg-brand fw-semibold"
                style={{ width: `${meta.porcentaje}%` }}
              />
            </div>
            {/* R49: si el back no manda `remaining`, se dice que falta el dato
                en vez de calcular una cifra inventada en el navegador. */}
            <p className="text-secondary small mb-0">
              {meta.restante ? (
                <>
                  Faltan <strong>{meta.restante}</strong> para alcanzar la meta anual.
                </>
              ) : (
                'El dato de lo que falta todavía no llega del servidor.'
              )}
            </p>
          </Panel>
        </div>

        <div className="col-12 col-xl-7">
          <Panel titulo="Comparación de Ventas" etiqueta="Vista anual" icono="fa-chart-column">
            <div className="row g-3 mb-3">
              {años.map(({ etiqueta, año, destacado }) => (
                <div className="col-sm-6" key={etiqueta}>
                  <div
                    className={`border rounded p-3 h-100 ${
                      destacado ? 'border-2 bg-body-tertiary' : ''
                    }`}
                    style={destacado ? { borderColor: 'var(--cff-naranja)' } : undefined}
                  >
                    <p className="text-secondary small text-uppercase fw-semibold mb-2">
                      {etiqueta} · {año.year}
                    </p>
                    <p className="small mb-2">
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

            {comparacion.variacion && (
              <div className="alert alert-success d-flex justify-content-between align-items-center mb-3 py-2">
                <span className="small">Variación interanual</span>
                <strong>{comparacion.variacion}</strong>
              </div>
            )}
            {comparacion.nota && <p className="text-secondary small mb-2">{comparacion.nota}</p>}
            <p className="small mb-0">
              {comparacion.mensual.etiqueta}: <strong>{comparacion.mensual.valor}</strong>{' '}
              {comparacion.mensual.variacion && (
                <span className="text-success fw-semibold">{comparacion.mensual.variacion}</span>
              )}
            </p>
          </Panel>
        </div>
      </div>

      <div className="mb-3">
        <Panel titulo="Indicadores por Producto" etiqueta="Mensual / Anual" icono="fa-table-list">
          {porProducto.length === 0 ? (
            <Vacio texto="Todavía no hay indicadores por producto." icono="fa-table-list" />
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr className="text-center">
                    <th rowSpan={2} className="text-start align-middle">
                      Producto
                    </th>
                    <th colSpan={3}>Mensual</th>
                    <th colSpan={3}>Anual</th>
                  </tr>
                  <tr className="text-center">
                    <th>Cant.</th>
                    <th>Ingreso</th>
                    <th>Particip.</th>
                    <th>Cant.</th>
                    <th>Ingreso</th>
                    <th>Particip.</th>
                  </tr>
                </thead>
                <tbody>
                  {porProducto.map((fila) => (
                    <tr key={fila.id}>
                      <td className="fw-semibold">{fila.nombre}</td>
                      <td className="text-center">{fila.mensual.cantidad}</td>
                      <td className="text-center">{fila.mensual.ingreso}</td>
                      <td style={{ minWidth: '7rem' }}>
                        <BarraParticipacion porcentaje={fila.mensual.participacion} />
                      </td>
                      <td className="text-center">{fila.anual.cantidad}</td>
                      <td className="text-center">{fila.anual.ingreso}</td>
                      <td style={{ minWidth: '7rem' }}>
                        <BarraParticipacion porcentaje={fila.anual.participacion} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-7">
          <Panel titulo="Ranking de Productos Más Vendidos" icono="fa-trophy">
            {ranking.length === 0 ? (
              <Vacio texto="Sin ventas suficientes para armar el ranking." icono="fa-chart-pie" />
            ) : (
              <>
                <div className="d-flex flex-wrap align-items-center gap-4 mb-3">
                  <div
                    className="pie-chart flex-shrink-0"
                    role="img"
                    aria-label={`Participación: ${ranking
                      .map((r) => `${r.nombre} ${r.participacion}%`)
                      .join(', ')}`}
                    style={{ background: gradienteTorta(ranking) }}
                  >
                    <div className="pie-centro">
                      <span className="d-block fw-bold fs-5">{ranking.length}</span>
                      <span className="d-block text-secondary" style={{ fontSize: '0.7rem' }}>
                        productos
                      </span>
                    </div>
                  </div>

                  <ul className="list-unstyled small mb-0 flex-grow-1">
                    {ranking.map((item, i) => (
                      <li className="d-flex align-items-center gap-2 mb-2" key={item.id}>
                        <span
                          className="d-inline-block rounded-circle flex-shrink-0"
                          style={{
                            width: 12,
                            height: 12,
                            backgroundColor: PALETA_TORTA[i % PALETA_TORTA.length],
                          }}
                        />
                        <span className="flex-grow-1 min-width-0 text-truncate">
                          {MEDALLAS[item.posicion] ?? ''} {item.nombre}
                        </span>
                        <strong>{item.participacion}%</strong>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="table-responsive">
                  <table className="table table-sm table-hover align-middle mb-0">
                    <thead>
                      <tr>
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
                            <span
                              className={`badge ${
                                item.posicion <= 3 ? 'bg-brand' : 'bg-secondary'
                              }`}
                            >
                              {item.posicion}
                            </span>
                          </td>
                          <td className="fw-semibold">{item.nombre}</td>
                          <td>{item.cantidad}</td>
                          <td className={item.destacado ? 'fw-bold text-brand' : ''}>
                            {item.ingreso}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Panel>
        </div>

        <div className="col-12 col-xl-5">
          <Panel titulo="Productos Mejor Valorados" icono="fa-star">
            {valoraciones.length === 0 ? (
              <Vacio texto="Aún no hay productos valorados." icono="fa-star" />
            ) : (
              <ul className="list-group list-group-flush">
                {valoraciones.map((valoracion) => (
                  <li
                    className="list-group-item d-flex justify-content-between align-items-center gap-3 px-0"
                    key={valoracion.id}
                  >
                    <div className="min-width-0">
                      <p className="mb-0 fw-semibold text-truncate">{valoracion.nombre}</p>
                      <p className="text-secondary small mb-0">{valoracion.reseñas} reseñas</p>
                    </div>
                    <div className="text-end flex-shrink-0">
                      <div className="text-warning" aria-hidden="true">
                        {'★'.repeat(Math.round(valoracion.puntuacion))}
                        {'☆'.repeat(5 - Math.round(valoracion.puntuacion))}
                      </div>
                      <small className="text-secondary">
                        {valoracion.puntuacion.toFixed(1)}/5
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  )
}
