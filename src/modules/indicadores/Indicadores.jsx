import { useCallback, useEffect, useMemo, useState } from 'react'

import { useRecurso } from '../../hooks/useRecurso'
import { usePeticion } from '../../hooks/usePeticion'
import { useAvisos } from '../../context/AvisosContext'
import { moneda, numero } from '../../utils/format'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'
import { PALETA_CATEGORIAS } from '../../data/graficas'
import { indicadoresApi } from './api'
import {
  MESES_CORTOS,
  avanceMeta,
  añosDisponibles,
  claveMes,
  indicadoresPorProducto,
  mesAnterior,
  mesesDisponibles,
  nombreMes,
  ranking as calcularRanking,
  resumenMes,
  valoracionesPorProducto,
  variacion,
  ventasPorDia,
  ventasPorMesDelAño,
  ventasValidas,
} from './calculos'
import FormularioMeta from './FormularioMeta'

const MEDALLAS = { 1: '🥇', 2: '🥈', 3: '🥉' }

// Cada 30 s y al volver a la pestaña: una venta hecha en otro equipo aparece
// sin tener que pulsar "Actualizar".
const REFRESCO_MS = 30000

function Panel({ titulo, etiqueta, icono, acciones, children }) {
  return (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h2 className="h6 fw-bold mb-0">
          {icono && <i className={`fa-solid ${icono} text-brand me-2`} />}
          {titulo}
        </h2>
        {acciones}
        {etiqueta && <span className="badge bg-brand flex-shrink-0">{etiqueta}</span>}
      </div>
      <div className="card-body">{children}</div>
    </div>
  )
}

/** Variación con flecha y color; "—" cuando no hay base de comparación. */
function Variacion({ valor }) {
  if (valor === null) return <span className="text-secondary small">sin datos previos</span>
  const sube = valor >= 0
  return (
    <span className={`small fw-semibold text-${sube ? 'success' : 'danger'}`}>
      <i className={`fa-solid fa-arrow-${sube ? 'up' : 'down'} me-1`} />
      {Math.abs(valor)}%
    </span>
  )
}

function BarraParticipacion({ porcentaje }) {
  return (
    <div className="d-flex align-items-center gap-2">
      <div className="progress flex-grow-1" style={{ height: 7, minWidth: 48 }}>
        <div className="progress-bar bg-brand" style={{ width: `${porcentaje}%` }} />
      </div>
      <span className="small fw-semibold" style={{ minWidth: '3rem' }}>
        {porcentaje}%
      </span>
    </div>
  )
}

const METRICAS = [
  { clave: 'total', etiqueta: 'Ingresos', formato: moneda },
  { clave: 'cantidad', etiqueta: 'Ventas', formato: numero },
  { clave: 'ticketPromedio', etiqueta: 'Ticket promedio', formato: moneda },
  { clave: 'unidades', etiqueta: 'Unidades', formato: (v) => `${numero(v)} und` },
]

export default function Indicadores() {
  const cargar = useCallback(() => indicadoresApi.panel(), [])
  const { datos, cargando, error, recargar } = useRecurso(cargar)
  const avisos = useAvisos()

  const [mes, setMes] = useState(claveMes())
  const [comparar, setComparar] = useState({ a: claveMes(), b: mesAnterior(claveMes()) })
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [años, setAños] = useState(() => {
    const actual = new Date().getFullYear()
    return { a: String(actual), b: String(actual - 1) }
  })

  // Refresco silencioso: no vuelve a mostrar el spinner, solo cambia cifras.
  useEffect(() => {
    const refrescar = () => document.visibilityState === 'visible' && recargar()
    const intervalo = setInterval(refrescar, REFRESCO_MS)
    document.addEventListener('visibilitychange', refrescar)
    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', refrescar)
    }
  }, [recargar])

  const guardadoMeta = usePeticion(
    useCallback(
      async (meta) => {
        await indicadoresApi.guardarMeta(meta)
        await recargar()
      },
      [recargar]
    )
  )

  const ventas = useMemo(() => ventasValidas(datos?.ventas ?? []), [datos])
  const meses = useMemo(() => mesesDisponibles(ventas), [ventas])
  const año = mes.slice(0, 4)

  const delMes = useMemo(() => resumenMes(ventas, mes), [ventas, mes])
  const delAnterior = useMemo(() => resumenMes(ventas, mesAnterior(mes)), [ventas, mes])
  const comparacion = useMemo(
    () => ({ a: resumenMes(ventas, comparar.a), b: resumenMes(ventas, comparar.b) }),
    [ventas, comparar]
  )
  const porDia = useMemo(() => ventasPorDia(ventas, mes), [ventas, mes])
  const productos = useMemo(() => indicadoresPorProducto(ventas, mes), [ventas, mes])
  const ranking = useMemo(() => calcularRanking(ventas, año), [ventas, año])
  const meta = useMemo(() => avanceMeta(ventas, año, datos?.meta ?? 0), [ventas, año, datos])
  const listaAños = useMemo(() => añosDisponibles(ventas), [ventas])
  // La nota de cada producto sale de los comentarios con QR, no de una tabla
  // fija: una valoración nueva mueve este panel en la siguiente lectura.
  const valoraciones = useMemo(
    () => valoracionesPorProducto(datos?.valoraciones ?? []),
    [datos]
  )
  const historico = useMemo(
    () => ({
      a: ventasPorMesDelAño(ventas, años.a),
      b: ventasPorMesDelAño(ventas, años.b),
    }),
    [ventas, años]
  )

  if (cargando && !datos) return <Cargando texto="Cargando indicadores…" />
  if (error && !datos) {
    return (
      <>
        <EncabezadoPagina titulo="Indicadores de Negocio" />
        <MensajeError texto={error} onReintentar={recargar} />
      </>
    )
  }
  if (!datos) return null

  const guardarMeta = async (valor) => {
    const { ok, error: fallo } = await guardadoMeta.ejecutar(valor)
    if (!ok) {
      avisos.fallo('No se pudo guardar la meta', fallo)
      return
    }
    setEditandoMeta(false)
    avisos.exito('Meta actualizada', `La meta anual quedó en ${moneda(valor)}.`)
  }

  const maxDia = Math.max(1, ...porDia.map((d) => d.total))

  // Comparativa entre años: totales, tope de la gráfica y color de cada serie.
  const colores = { a: 'var(--cff-naranja)', b: 'var(--cff-carbon-claro)' }
  const totales = {
    a: historico.a.reduce((suma, valor) => suma + valor, 0),
    b: historico.b.reduce((suma, valor) => suma + valor, 0),
  }
  const maximo = Math.max(1, ...historico.a, ...historico.b)
  const metaAnual = datos.meta

  const gradiente =
    ranking.length === 0
      ? 'conic-gradient(var(--cff-cat-otros) 0% 100%)'
      : `conic-gradient(${ranking
          .reduce(
            (tramos, item, i) => {
              const desde = tramos.acumulado
              const hasta = desde + item.participacion
              tramos.lista.push(`${PALETA_CATEGORIAS[i]} ${desde}% ${hasta}%`)
              tramos.acumulado = hasta
              return tramos
            },
            { lista: [], acumulado: 0 }
          )
          .lista.concat(
            `var(--cff-borde) ${ranking.reduce((s, r) => s + r.participacion, 0)}% 100%`
          )
          .join(', ')})`

  const selectorMes = (valor, alCambiar, etiqueta) => (
    <select
      className="form-select form-select-sm"
      style={{ width: 'auto' }}
      value={valor}
      onChange={(evento) => alCambiar(evento.target.value)}
      aria-label={etiqueta}
    >
      {meses.map((clave) => (
        <option key={clave} value={clave}>
          {nombreMes(clave)}
        </option>
      ))}
    </select>
  )

  return (
    <>
      <EncabezadoPagina
        titulo="Indicadores de Negocio"
        descripcion="Calculados en vivo con las ventas registradas: cada venta nueva mueve estas cifras."
      >
        <button className="btn btn-outline-primary" onClick={() => setEditandoMeta(true)}>
          <i className="fa-solid fa-bullseye me-2" />
          Editar meta
        </button>
        <button className="btn btn-outline-secondary" onClick={recargar} disabled={cargando}>
          <i className={`fa-solid fa-rotate me-2 ${cargando ? 'fa-spin' : ''}`} />
          Actualizar
        </button>
      </EncabezadoPagina>

      <MensajeError texto={error} onReintentar={recargar} />

      {/* Selector de mes fijo bajo la cabecera: acompaña el scroll, así no hay
          que volver arriba para cambiar el mes mientras se revisa una gráfica. */}
      <div className="barra-fija d-flex flex-wrap align-items-center gap-2 mb-3">
        <label className="fw-semibold small mb-0" htmlFor="mes-indicadores">
          <i className="fa-regular fa-calendar text-brand me-2" />
          Mes analizado
        </label>
        <select
          id="mes-indicadores"
          className="form-select form-select-sm text-capitalize"
          style={{ width: 'auto' }}
          value={mes}
          onChange={(evento) => setMes(evento.target.value)}
        >
          {meses.map((clave) => (
            <option key={clave} value={clave}>
              {nombreMes(clave)}
            </option>
          ))}
        </select>
        <span className="ms-auto small">
          <strong>{moneda(delMes.total)}</strong> en {numero(delMes.cantidad)} venta(s)
        </span>
      </div>

      <div className="row g-3 mb-3">
        {METRICAS.map(({ clave, etiqueta, formato }) => (
          <div className="col-6 col-xl-3" key={clave}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <p className="text-secondary small text-uppercase fw-semibold mb-1">
                  {etiqueta} · {nombreMes(mes)}
                </p>
                <p className="h4 fw-bold mb-1">{formato(delMes[clave])}</p>
                <Variacion valor={variacion(delMes[clave], delAnterior[clave])} />
                <span className="small text-secondary ms-1">vs. mes anterior</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3 mb-3">
        <div className="col-12 col-xl-5">
          <Panel titulo={`Meta anual ${año}`} icono="fa-bullseye" etiqueta={`${meta.porcentaje}%`}>
            <div className="modal-resumen mb-3">
              <p className="text-secondary small mb-1">Vendido en {año}</p>
              <p className="h3 fw-bold text-brand mb-0">{moneda(meta.vendido)}</p>
              <p className="small mb-0">de una meta de {moneda(meta.meta)}</p>
            </div>
            <div className="progress mb-2" style={{ height: 14 }}>
              <div className="progress-bar bg-brand" style={{ width: `${meta.porcentaje}%` }} />
            </div>
            <p className="small mb-0">
              {meta.restante > 0 ? (
                <>
                  Faltan <strong>{moneda(meta.restante)}</strong> para la meta.
                </>
              ) : (
                <strong className="text-success">¡Meta cumplida!</strong>
              )}
            </p>
          </Panel>
        </div>

        <div className="col-12 col-xl-7">
          <Panel
            titulo="Comparar meses"
            icono="fa-code-compare"
            acciones={
              <div className="d-flex flex-wrap align-items-center gap-2 small">
                {selectorMes(comparar.a, (a) => setComparar({ ...comparar, a }), 'Primer mes')}
                <span className="text-secondary">vs.</span>
                {selectorMes(comparar.b, (b) => setComparar({ ...comparar, b }), 'Segundo mes')}
              </div>
            }
          >
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Indicador</th>
                    <th className="text-end">{nombreMes(comparar.a)}</th>
                    <th className="text-end">{nombreMes(comparar.b)}</th>
                    <th className="text-end">Variación</th>
                  </tr>
                </thead>
                <tbody>
                  {METRICAS.map(({ clave, etiqueta, formato }) => (
                    <tr key={clave}>
                      <td className="fw-semibold">{etiqueta}</td>
                      <td className="text-end">{formato(comparacion.a[clave])}</td>
                      <td className="text-end">{formato(comparacion.b[clave])}</td>
                      <td className="text-end">
                        <Variacion valor={variacion(comparacion.a[clave], comparacion.b[clave])} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Barras de ingresos de los dos meses, para verlo de un vistazo. */}
            <div className="mt-3 d-grid gap-2">
              {['a', 'b'].map((lado) => {
                const maximo = Math.max(1, comparacion.a.total, comparacion.b.total)
                return (
                  <div key={lado}>
                    <div className="d-flex justify-content-between small">
                      <span className="text-capitalize">{nombreMes(comparar[lado])}</span>
                      <strong>{moneda(comparacion[lado].total)}</strong>
                    </div>
                    <div className="progress" style={{ height: 10 }}>
                      <div
                        className="progress-bar"
                        style={{
                          width: `${(comparacion[lado].total / maximo) * 100}%`,
                          background: lado === 'a' ? 'var(--cff-naranja)' : 'var(--cff-carbon-claro)',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Panel>
        </div>
      </div>

      <div className="mb-3">
        <Panel
          titulo="Comparativa histórica entre años"
          icono="fa-chart-simple"
          acciones={
            <div className="d-flex flex-wrap align-items-center gap-2 small">
              {['a', 'b'].map((lado) => (
                <select
                  key={lado}
                  className="form-select form-select-sm"
                  style={{ width: 'auto' }}
                  value={años[lado]}
                  onChange={(evento) => setAños({ ...años, [lado]: evento.target.value })}
                  aria-label={lado === 'a' ? 'Primer año' : 'Segundo año'}
                >
                  {listaAños.map((opcion) => (
                    <option key={opcion}>{opcion}</option>
                  ))}
                </select>
              ))}
            </div>
          }
        >
                {/* Cada año frente a la misma meta anual. */}
                <div className="row g-3 mb-4">
                  {['a', 'b'].map((lado) => {
                    const avance =
                      metaAnual > 0
                        ? Math.min(100, Math.round((totales[lado] / metaAnual) * 1000) / 10)
                        : 0
                    return (
                      <div className="col-12 col-md-6" key={lado}>
                        <div className="border rounded p-3 h-100">
                          <div className="d-flex justify-content-between align-items-baseline">
                            <span className="fw-bold">
                              <span
                                className="d-inline-block rounded-circle me-2"
                                style={{ width: 11, height: 11, background: colores[lado] }}
                              />
                              {años[lado]}
                            </span>
                            <strong>{moneda(totales[lado])}</strong>
                          </div>
                          <div className="progress my-2" style={{ height: 10 }}>
                            <div
                              className="progress-bar"
                              style={{ width: `${avance}%`, background: colores[lado] }}
                            />
                          </div>
                          <small>
                            {avance}% de la meta de {moneda(metaAnual)}
                          </small>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <p className="small mb-2">
                  {años.a} frente a {años.b}:{' '}
                  <Variacion valor={variacion(totales.a, totales.b)} />
                </p>

                <div
                  className="d-flex align-items-end gap-2"
                  style={{ height: 190 }}
                  role="img"
                  aria-label={`Ingresos por mes de ${años.a} y ${años.b}`}
                >
                  {MESES_CORTOS.map((mesCorto, indice) => (
                    <div
                      key={mesCorto}
                      className="flex-fill d-flex flex-column align-items-center h-100"
                    >
                      <div
                        className="d-flex align-items-end gap-1 w-100"
                        style={{ flex: '1 1 0', minHeight: 0 }}
                      >
                        {['a', 'b'].map((lado) => (
                          <div
                            key={lado}
                            className="flex-fill rounded-top"
                            title={`${mesCorto} ${años[lado]}: ${moneda(historico[lado][indice])}`}
                            style={{
                              height: `${(historico[lado][indice] / maximo) * 100}%`,
                              minHeight: historico[lado][indice] > 0 ? 3 : 0,
                              background: colores[lado],
                            }}
                          />
                        ))}
                      </div>
                      <small className="text-secondary">{mesCorto}</small>
                    </div>
                  ))}
                </div>
        </Panel>
      </div>

      <div className="mb-3">
        <Panel titulo={`Ventas por día · ${nombreMes(mes)}`} icono="fa-chart-column">
          {delMes.cantidad === 0 ? (
            <Vacio texto="Todavía no hay ventas en este mes." icono="fa-chart-column" />
          ) : (
            <div
              className="d-flex align-items-end gap-1"
              style={{ height: 160 }}
              role="img"
              aria-label={`Ingresos por día de ${nombreMes(mes)}`}
            >
              {porDia.map(({ dia, total, cantidad }) => (
                <div
                  key={dia}
                  className="flex-fill d-flex flex-column justify-content-end align-items-center h-100"
                  title={`Día ${dia}: ${moneda(total)} en ${cantidad} venta(s)`}
                >
                  <div
                    className="w-100 rounded-top"
                    style={{
                      height: `${(total / maxDia) * 100}%`,
                      minHeight: total > 0 ? 3 : 0,
                      background: 'var(--cff-naranja)',
                    }}
                  />
                  <small className="text-secondary" style={{ fontSize: '0.6rem' }}>
                    {dia}
                  </small>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="mb-3">
        <Panel titulo="Indicadores por producto" etiqueta={`${nombreMes(mes)} / ${año}`} icono="fa-table-list">
          {productos.length === 0 ? (
            <Vacio texto="Sin ventas de productos en este año." icono="fa-table-list" />
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr className="text-center">
                    <th rowSpan={2} className="text-start align-middle">
                      Producto
                    </th>
                    <th colSpan={3}>Mes</th>
                    <th colSpan={3}>Año</th>
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
                  {productos.map((fila) => (
                    <tr key={fila.nombre}>
                      <td className="fw-semibold">{fila.nombre}</td>
                      <td className="text-center">{numero(fila.mensual.cantidad)}</td>
                      <td className="text-center">{moneda(fila.mensual.ingreso)}</td>
                      <td style={{ minWidth: '7rem' }}>
                        <BarraParticipacion porcentaje={fila.mensual.participacion} />
                      </td>
                      <td className="text-center">{numero(fila.anual.cantidad)}</td>
                      <td className="text-center">{moneda(fila.anual.ingreso)}</td>
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
          <Panel titulo={`Más vendidos de ${año}`} icono="fa-trophy">
            {ranking.length === 0 ? (
              <Vacio texto="Sin ventas suficientes para armar el ranking." icono="fa-chart-pie" />
            ) : (
              <div className="d-flex flex-wrap align-items-center gap-4">
                <div
                  className="pie-chart flex-shrink-0"
                  role="img"
                  aria-label={`Participación en unidades: ${ranking
                    .map((r) => `${r.nombre} ${r.participacion}%`)
                    .join(', ')}`}
                  style={{ background: gradiente }}
                >
                  <div className="pie-centro">
                    <span className="d-block fw-bold fs-5">top {ranking.length}</span>
                    <span className="d-block text-secondary" style={{ fontSize: '0.7rem' }}>
                      del año
                    </span>
                  </div>
                </div>

                <ul className="list-unstyled small mb-0 flex-grow-1 min-width-0">
                  {ranking.map((item, i) => (
                    <li className="d-flex align-items-center gap-2 mb-2" key={item.nombre}>
                      <span
                        className="d-inline-block rounded-circle flex-shrink-0"
                        style={{ width: 12, height: 12, backgroundColor: PALETA_CATEGORIAS[i] }}
                      />
                      <span className="flex-grow-1 min-width-0 text-truncate fw-semibold">
                        {MEDALLAS[item.posicion] ?? `${item.posicion}.`} {item.nombre}
                      </span>
                      <span className="text-secondary">{numero(item.cantidad)} und</span>
                      <strong>{item.participacion}%</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        </div>

        <div className="col-12 col-xl-5">
          <Panel titulo="Productos mejor valorados" icono="fa-star">
            {valoraciones.length === 0 ? (
              <Vacio
                texto="Aún no hay productos valorados. Las notas llegan de los QR de los tiquetes."
                icono="fa-star"
              />
            ) : (
              <ul className="list-group list-group-flush">
                {valoraciones.map((valoracion) => (
                  <li
                    className="list-group-item bg-transparent d-flex justify-content-between align-items-center gap-3 px-0"
                    key={valoracion.nombre}
                  >
                    <div className="min-width-0">
                      <p className="mb-0 fw-semibold text-truncate">{valoracion.nombre}</p>
                      <p className="small mb-0">
                        {valoracion.reseñas} {valoracion.reseñas === 1 ? 'reseña' : 'reseñas'}
                      </p>
                    </div>
                    <div className="text-end flex-shrink-0">
                      <div className="text-warning" aria-hidden="true">
                        {'★'.repeat(Math.round(valoracion.puntuacion))}
                        {'☆'.repeat(5 - Math.round(valoracion.puntuacion))}
                      </div>
                      <small className="fw-semibold">{valoracion.puntuacion.toFixed(1)}/5</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {editandoMeta && (
        <FormularioMeta
          meta={datos.meta}
          vendido={meta.vendido}
          enviando={guardadoMeta.enviando}
          onGuardar={guardarMeta}
          onCerrar={() => setEditandoMeta(false)}
        />
      )}
    </>
  )
}
