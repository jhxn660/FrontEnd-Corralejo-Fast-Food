import { useCallback, useMemo, useState } from 'react'

import { useRecurso } from '../../hooks/useRecurso'
import { Cargando, MensajeError } from '../../components/ui/Estado'
import { imagenDe, tieneImagen } from '../menu/esquema'
import {
  DIAS_SEMANA,
  MESES,
  TIPOS_DIA,
  desplazamientoDe,
  diasDelMes,
  fechaLegible,
  isoDe,
  mesDesplazado,
  partesDe,
} from './calendario'
import { estadoDelLocal, indiceDelDia, normalizarHorario, resumenDelDia } from './horario'
import { destacadosApi, establecimientoApi } from './api'

const hoy = new Date()

// Años que ofrece el desplegable: el próximo y los dieciséis anteriores. Es el
// rango con el que tiene sentido consultar días especiales; el calendario sigue
// avanzando mes a mes con las flechas aunque se salga de esta lista.
const AÑOS = Array.from({ length: 18 }, (_, i) => hoy.getFullYear() + 1 - i)

/** "2026-03-04" → Date local, sin pasar por UTC (ver calendario.js). */
const fechaDe = (iso) => {
  const { año, mes, dia } = partesDe(iso)
  return new Date(año, mes, dia)
}

/**
 * Sección «Horarios» de la portada del cliente.
 *
 * Dos lecturas de lo mismo, como en el wireframe: a la izquierda el calendario
 * del mes —con los cierres marcados y un día seleccionable que abre su ficha—,
 * a la derecha el horario de apertura de la semana con la insignia de Abierto /
 * Cerrado, que se calcula con la hora del navegador contra el horario de la
 * ficha (ver `horario.js`).
 *
 * El título del calendario no es texto: «Marzo» abre el selector de mes y
 * «2026» el de año, que son las dos sub-vistas del wireframe. Así se salta a
 * cualquier fecha sin pulsar la flecha doce veces.
 *
 * Es solo consulta: los días especiales se crean y se borran en la pantalla del
 * administrador.
 */
export default function Horarios() {
  const cargarFicha = useCallback(() => establecimientoApi.ficha(), [])
  const cargarDias = useCallback(() => establecimientoApi.listarDiasEspeciales(), [])

  const {
    datos: ficha,
    cargando: cargandoFicha,
    error: errorFicha,
    recargar: recargarFicha,
  } = useRecurso(cargarFicha, null)

  const {
    datos: dias,
    cargando: cargandoDias,
    error: errorDias,
    recargar: recargarDias,
  } = useRecurso(cargarDias, [])

  const [mes, setMes] = useState({ año: hoy.getFullYear(), mes: hoy.getMonth() })
  const [selector, setSelector] = useState(null) // 'mes' | 'año' | null
  const [seleccion, setSeleccion] = useState(() =>
    isoDe(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  )

  const semana = useMemo(() => normalizarHorario(ficha?.horarioSemanal), [ficha])

  const estado = useMemo(
    () =>
      estadoDelLocal({
        horarioSemanal: ficha?.horarioSemanal,
        diasEspeciales: dias,
        ahora: new Date(),
      }),
    [ficha, dias]
  )

  const dia = useMemo(
    () =>
      resumenDelDia({
        horarioSemanal: ficha?.horarioSemanal,
        diasEspeciales: dias,
        fecha: fechaDe(seleccion),
      }),
    [ficha, dias, seleccion]
  )

  // Lo más vendido del día elegido. Se pide solo para ese día (?date=…), así que
  // navegar por el calendario no baja el historial de ventas entero.
  const cargarMasVendido = useCallback(() => destacadosApi.masVendidoDelDia(seleccion), [seleccion])
  const { datos: masVendido } = useRecurso(cargarMasVendido, null)

  // Días especiales del mes visible, indexados por número de día.
  const delMes = useMemo(() => {
    const indexados = {}
    dias.forEach((especial) => {
      const { año, mes: mesDia, dia: numero } = partesDe(especial.fecha)
      if (año === mes.año && mesDia === mes.mes) indexados[numero] = especial
    })
    return indexados
  }, [dias, mes])

  const especiales = Object.keys(delMes).sort((a, b) => a - b)
  const indiceHoy = indiceDelDia(hoy)

  const irA = (cambios) => {
    setMes((actual) => ({ ...actual, ...cambios }))
    setSelector(null)
  }

  const celdas = () => {
    const { año, mes: mesVisible } = mes
    const total = diasDelMes(año, mesVisible)
    const esMesActual = hoy.getFullYear() === año && hoy.getMonth() === mesVisible
    const desplazamiento = desplazamientoDe(año, mesVisible)

    const vacias = Array.from({ length: desplazamiento }, (_, i) => (
      <div key={`vacio-${i}`} className="calendar-day is-muted" />
    ))

    const numeradas = Array.from({ length: total }, (_, i) => {
      const numero = i + 1
      const iso = isoDe(año, mesVisible, numero)
      const marca = delMes[numero]
      // El día de la semana sale del desplazamiento del mes, no de un Date por
      // celda: son 31 objetos menos por cada mes que se pinta.
      const indiceSemana = (desplazamiento + i) % 7
      const cierreSemanal = semana[indiceSemana].cerrado

      const clases = [
        'calendar-day',
        marca?.tipo ?? '',
        cierreSemanal ? 'cierre-semanal' : '',
        esMesActual && hoy.getDate() === numero ? 'is-today' : '',
        seleccion === iso ? 'is-seleccionado' : '',
      ]
        .filter(Boolean)
        .join(' ')

      const partes = [
        `${numero} de ${MESES[mesVisible]}`,
        marca ? `${TIPOS_DIA[marca.tipo]?.etiqueta ?? marca.tipo}: ${marca.motivo}` : '',
        !marca && cierreSemanal ? 'Cerrado' : '',
      ].filter(Boolean)

      return (
        <button
          key={numero}
          type="button"
          className={clases}
          aria-label={partes.join('. ')}
          aria-pressed={seleccion === iso}
          title={marca?.motivo ?? ''}
          onClick={() => setSeleccion(iso)}
        >
          {numero}
        </button>
      )
    })

    return [...vacias, ...numeradas]
  }

  if (cargandoFicha && !ficha) return <Cargando texto="Cargando horarios…" />

  return (
    <>
      <MensajeError texto={errorFicha} onReintentar={recargarFicha} />
      <MensajeError texto={errorDias} onReintentar={recargarDias} />

      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white">
              <h2 className="h6 fw-bold mb-0">
                <i className="fa-solid fa-calendar-days text-brand me-2" />
                Calendario de atención
              </h2>
            </div>

            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    setMes(mesDesplazado(mes, -1))
                    setSelector(null)
                  }}
                  aria-label="Mes anterior"
                >
                  <i className="fa-solid fa-chevron-left" />
                </button>

                <h3 className="h6 fw-bold mb-0 d-flex align-items-center gap-1">
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-decoration-none fw-bold p-1"
                    onClick={() => setSelector(selector === 'mes' ? null : 'mes')}
                    aria-expanded={selector === 'mes'}
                  >
                    {MESES[mes.mes]}
                    <i className="fa-solid fa-chevron-down ms-1 small" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-decoration-none fw-bold p-1"
                    onClick={() => setSelector(selector === 'año' ? null : 'año')}
                    aria-expanded={selector === 'año'}
                  >
                    {mes.año}
                    <i className="fa-solid fa-chevron-down ms-1 small" />
                  </button>
                </h3>

                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    setMes(mesDesplazado(mes, 1))
                    setSelector(null)
                  }}
                  aria-label="Mes siguiente"
                >
                  <i className="fa-solid fa-chevron-right" />
                </button>
              </div>

              {selector === 'mes' && (
                <div className="border rounded p-2 mb-3">
                  <div className="row row-cols-3 g-2">
                    {MESES.map((nombre, indice) => (
                      <div className="col" key={nombre}>
                        <button
                          type="button"
                          className={`btn btn-sm w-100 ${
                            indice === mes.mes ? 'btn-primary' : 'btn-outline-secondary'
                          }`}
                          onClick={() => irA({ mes: indice })}
                        >
                          {nombre}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selector === 'año' && (
                <div className="border rounded p-2 mb-3">
                  <div className="row row-cols-3 row-cols-sm-6 g-2">
                    {AÑOS.map((año) => (
                      <div className="col" key={año}>
                        <button
                          type="button"
                          className={`btn btn-sm w-100 px-1 ${
                            año === mes.año ? 'btn-primary' : 'btn-outline-secondary'
                          }`}
                          onClick={() => irA({ año })}
                        >
                          {año}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="calendar-grid text-center small text-secondary fw-semibold mb-1">
                {DIAS_SEMANA.map((nombre) => (
                  <div key={nombre}>{nombre}</div>
                ))}
              </div>
              <div className="calendar-grid mb-3">{celdas()}</div>

              <ul className="list-inline small text-secondary mb-3">
                <li className="list-inline-item me-3">
                  <span className="badge bg-danger">&nbsp;</span> Restaurante cerrado
                </li>
                <li className="list-inline-item me-3">
                  <span className="badge bg-brand">&nbsp;</span> {TIPOS_DIA.evento.etiqueta}
                </li>
                <li className="list-inline-item">
                  <span className="badge bg-dark">&nbsp;</span> Día seleccionado
                </li>
              </ul>

              {/* Ficha del día elegido: qué pasa ese día y qué se vendió. */}
              <article className="modal-resumen">
                <h4 className="h6 fw-bold mb-2">{fechaLegible(seleccion)}</h4>

                <div className="d-flex align-items-start gap-3">
                  {masVendido && (
                    <img
                      className={`rounded flex-shrink-0 ${
                        tieneImagen(masVendido) ? 'plato-foto-img' : 'miniatura-respaldo'
                      }`}
                      style={{ width: '5.5rem', height: '5.5rem' }}
                      src={imagenDe(masVendido)}
                      alt={tieneImagen(masVendido) ? `Foto de ${masVendido.nombre}` : ''}
                      aria-hidden={tieneImagen(masVendido) ? undefined : 'true'}
                      loading="lazy"
                    />
                  )}

                  <div className="min-width-0">
                    <p className="small mb-1">
                      <span
                        className={`badge ${dia.cerrado ? 'bg-danger' : 'bg-success'} me-2`}
                      >
                        {dia.texto}
                      </span>
                      {dia.especial?.tipo === 'evento' && (
                        <span className="badge bg-brand">
                          <i className={`fa-solid ${TIPOS_DIA.evento.icono} me-1`} />
                          {TIPOS_DIA.evento.etiqueta}
                        </span>
                      )}
                    </p>

                    {dia.motivo && <p className="small text-secondary mb-1">{dia.motivo}</p>}

                    <p className="small text-secondary mb-0">
                      {masVendido
                        ? `Lo más pedido ese día fue ${masVendido.nombre}: ${masVendido.cantidad} unidad(es) en ${masVendido.ventas} venta(s).`
                        : 'Ese día no hay ventas registradas.'}
                    </p>
                  </div>
                </div>
              </article>

              <h4 className="h6 fw-bold mt-3">Días especiales este mes</h4>
              {cargandoDias && <Cargando texto="Cargando días especiales…" />}

              {!cargandoDias && especiales.length === 0 ? (
                <p className="text-secondary small fst-italic mb-0">
                  No hay días especiales este mes.
                </p>
              ) : (
                <ul className="list-group list-group-flush">
                  {especiales.map((numero) => {
                    const especial = delMes[numero]
                    const tipo = TIPOS_DIA[especial.tipo] ?? {}

                    return (
                      <li
                        key={especial.id}
                        className="list-group-item d-flex align-items-center gap-2 px-0"
                      >
                        <span className={`badge bg-${tipo.color ?? 'secondary'} flex-shrink-0`}>
                          <i className={`fa-solid ${tipo.icono ?? 'fa-circle'} me-1`} />
                          {tipo.etiqueta ?? especial.tipo}
                        </span>
                        <button
                          type="button"
                          className="btn btn-link btn-sm text-start text-decoration-none small flex-grow-1 min-width-0 p-0"
                          onClick={() => setSeleccion(especial.fecha)}
                        >
                          <span className="d-block fw-semibold">
                            {fechaLegible(especial.fecha)}
                          </span>
                          <span className="text-secondary">{especial.motivo}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-xl-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
              <h2 className="h6 fw-bold mb-0">
                <i className="fa-solid fa-clock text-brand me-2" />
                Horario de apertura
              </h2>
              <span className={`badge ${estado.abierto ? 'bg-success' : 'bg-danger'}`}>
                <i
                  className={`fa-solid ${estado.abierto ? 'fa-door-open' : 'fa-door-closed'} me-1`}
                />
                {estado.etiqueta}
              </span>
            </div>

            <div className="card-body">
              <p className="text-secondary small">{estado.detalle}</p>

              <ul className="list-group list-group-flush">
                {semana.map((entrada) => {
                  const esHoy = entrada.indice === indiceHoy
                  return (
                    <li
                      key={entrada.dia}
                      className={`list-group-item d-flex justify-content-between align-items-center gap-2 px-0 ${
                        esHoy ? 'fw-bold' : ''
                      }`}
                    >
                      <span className={entrada.cerrado ? 'text-danger' : ''}>
                        {entrada.dia}
                        {esHoy && <span className="badge bg-brand ms-2">Hoy</span>}
                      </span>
                      <span className={entrada.cerrado ? 'text-danger' : 'text-secondary'}>
                        {entrada.texto}
                      </span>
                    </li>
                  )
                })}
              </ul>

              {ficha?.direccion && (
                <p className="small text-secondary mt-3 mb-0">
                  <i className="fa-solid fa-location-dot text-brand me-2" />
                  {ficha.direccion} — {ficha.ciudad}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
