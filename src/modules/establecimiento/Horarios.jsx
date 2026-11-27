import { useCallback, useMemo, useState } from 'react'

import { useRecurso } from '../../hooks/useRecurso'
import { Cargando, MensajeError } from '../../components/ui/Estado'
import { imagenDe, tieneImagen } from '../products/esquema'

import { destacadosApi } from './api'
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
import {
  DIAS_HORARIO,
  estadoDelLocal,
  horaLegible,
  indiceDelDia,
  pluralDia,
  normalizarHorario,
  resumenDelDia,
} from './horario'
import { useFicha } from './useFicha'

const hoy = new Date()

// Mismo arreglo vacío en cada render mientras la ficha no ha llegado
const SIN_FECHAS_ESPECIALES = []

// Mismo arreglo vacío en cada render mientras la ficha no ha llegado
const SIN_REGISTROS = []

// Años del desplegable: el próximo y los dieciséis anteriores.
const AÑOS = Array.from({ length: 18 }, (_, i) => hoy.getFullYear() + 1 - i)

/** "2026-03-04" → Date local, sin pasar por UTC (ver calendario.js). */
const fechaDe = (iso) => {
  const { año, mes, dia } = partesDe(iso)
  return new Date(año, mes, dia)
}

/** "2:00 p. m. – 9:30 p. m. · nota" de un registro de /horarios. */
const textoDelRegistro = (registro) => {
  const franja = registro.estaAbierto
    ? `${horaLegible(registro.horaApertura)} – ${horaLegible(registro.horaCierre)}`
    : 'Cerrado (sin atención)'
  return registro.estadoNota ? `${franja} · ${registro.estadoNota}` : franja
}

/**
 * CALENDARIO DE ATENCIÓN: el calendario del mes (cierres marcados y un día seleccionable) junto al
 * horario de la semana. «Marzo» y «2026» abren los selectores de mes y de año.
 *
 * - Portadas de cliente y visitante (sin `gestion`): solo consulta. A la derecha va el horario
 *   de apertura con la insignia Abierto / Cerrado (hora del navegador contra la ficha).
 * - Gestión del Establecimiento (Owner y Administrador) pasa `gestion = { onEditarDia,
 *   onEliminarDia }`: el calendario y el horario de atención son UN solo bloque. Al elegir una
 *   fecha, sus botones actúan SOLO sobre esa fecha (/cierres; solo ADMIN_ROLES en el backend):
 *     - «Editar este día»: abrir o cerrar esa fecha y cambiar su horario y su nota.
 *     - «Cerrar este día»: el mismo formulario, ya marcado como cerrado.
 *     - «Eliminar este día»: borra lo guardado y la fecha vuelve al horario semanal.
 *   Cambiar el viernes 27 no toca los demás viernes.
 */
export default function Horarios({ gestion = null }) {
  const {
    datos: ficha,
    cargando: cargandoFicha,
    error: errorFicha,
    recargar: recargarFicha,
  } = useFicha()

  // Fechas concretas cerradas (/cierres). Los avisos del horario salen de la nota de cada día.
  const dias = ficha?.diasEspeciales ?? SIN_FECHAS_ESPECIALES
  const avisosHorario = (ficha?.horarioSemanal ?? []).filter((dia) => dia.nota)

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

  const indiceHoy = indiceDelDia(hoy)

  // Registros del backend (/horarios): uno por día de la semana
  const registros = ficha?.horarios ?? SIN_REGISTROS
  const diaDeLaSemana = DIAS_HORARIO[indiceDelDia(fechaDe(seleccion))]
  const registro = registros.find((horario) => horario.dia === diaDeLaSemana) ?? null
  const losDias = pluralDia(diaDeLaSemana)

  // Lo guardado para la fecha elegida (/cierres), si lo hay
  const especialDelDia = dias.find((especial) => especial.fecha === seleccion) ?? null
  // Lo que abre el formulario «Editar este día»: lo de esa fecha si existe y, si no, el horario
  // semanal de ese día. `dia` ya trae las horas válidas en «HH:MM» o null.
  const diaParaEditar = {
    id: especialDelDia?.id,
    fecha: seleccion,
    estaAbierto: !dia.cerrado,
    horaApertura: dia.abre ?? '14:00',
    horaCierre: dia.cierra ?? '21:30',
    motivo: especialDelDia?.motivo ?? '',
  }

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
        marca ? [TIPOS_DIA[marca.tipo]?.etiqueta ?? marca.tipo, marca.motivo].filter(Boolean).join(': ') : '',
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

  /* ───────────── Piezas que comparten los dos modos ───────────── */

  const calendario = (
    <>
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
                  className={`btn btn-sm w-100 ${indice === mes.mes ? 'btn-primary' : 'btn-outline-secondary'}`}
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
                  className={`btn btn-sm w-100 px-1 ${año === mes.año ? 'btn-primary' : 'btn-outline-secondary'}`}
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

      {/* Gestión, justo debajo del calendario: todo actúa SOLO sobre la fecha elegida
         (/cierres); los demás días no cambian. */}
      {gestion && (
        <div className="d-flex flex-wrap gap-2 mb-3">
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => gestion.onEditarDia(diaParaEditar)}>
            <i className="fa-solid fa-pen me-2" />
            Editar este día
          </button>
          {!dia.cerrado && (
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => gestion.onEditarDia({ ...diaParaEditar, estaAbierto: false })}
            >
              <i className="fa-solid fa-ban me-2" />
              Cerrar este día
            </button>
          )}
          {especialDelDia && (
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => gestion.onEliminarDia(especialDelDia)}>
              <i className="fa-solid fa-trash-can me-2" />
              Eliminar este día
            </button>
          )}
        </div>
      )}

      <ul className="list-inline small text-secondary mb-3">
        <li className="list-inline-item me-3">
          <span className="badge bg-danger">&nbsp;</span> Cerrado ese día
        </li>
        <li className="list-inline-item me-3">
          <span className="badge border border-danger text-danger">1</span> Cerrado cada semana
        </li>
        <li className="list-inline-item me-3">
          <span className="badge badge-horario-especial">&nbsp;</span> {TIPOS_DIA.horario.etiqueta}
        </li>
        <li className="list-inline-item me-3">
          <span className="badge bg-brand">&nbsp;</span> {TIPOS_DIA.evento.etiqueta}
        </li>
        <li className="list-inline-item">
          <span className="badge bg-dark">&nbsp;</span> Día seleccionado
        </li>
      </ul>
    </>
  )

  const fichaDelDia = (
    <article className="modal-resumen">
      <h4 className="h6 fw-bold mb-2">{fechaLegible(seleccion)}</h4>

      <div className="d-flex align-items-start gap-3">
        {masVendido && (
          <img
            className={`rounded flex-shrink-0 ${tieneImagen(masVendido) ? 'plato-foto-img' : 'miniatura-respaldo'}`}
            style={{ width: '5.5rem', height: '5.5rem' }}
            src={imagenDe(masVendido)}
            alt={tieneImagen(masVendido) ? `Foto de ${masVendido.nombre}` : ''}
            aria-hidden={tieneImagen(masVendido) ? undefined : 'true'}
            loading="lazy"
          />
        )}

        <div className="min-width-0">
          <p className="small mb-1">
            <span className={`badge ${dia.cerrado ? 'bg-danger' : 'bg-success'} me-2`}>{dia.texto}</span>
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

      {/* Gestión: lo guardado para esta fecha y, como referencia, el horario semanal */}
      {gestion && (
        <div className="border-top mt-3 pt-3">
          {especialDelDia?.tipo === 'cerrado' && (
            <span className="small d-block text-danger fw-semibold mb-1">
              <i className="fa-solid fa-ban me-1" />
              Cerrado solo este día{especialDelDia.motivo ? `: ${especialDelDia.motivo}` : ''}
            </span>
          )}
          {especialDelDia?.tipo === 'horario' && (
            <span className="small d-block texto-horario-especial fw-semibold mb-1">
              <i className="fa-solid fa-clock me-1" />
              Horario especial solo este día: {horaLegible(especialDelDia.abre)} – {horaLegible(especialDelDia.cierra)}
            </span>
          )}
          <span className="small d-block fw-semibold">Horario semanal de los {losDias}</span>
          <span className="small text-secondary d-block">
            {registro ? textoDelRegistro(registro) : 'Sin horario registrado: ese día se muestra cerrado.'}
          </span>
        </div>
      )}
    </article>
  )

  /* ───────────── Gestión: calendario + horario de atención en un solo bloque ───────────── */

  if (gestion) {
    return (
      <div className="card border-0 shadow-sm h-100">
        <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
          <h2 className="h6 fw-bold mb-0">
            <i className="fa-solid fa-calendar-days text-brand me-2" />
            Calendario y horario de atención
          </h2>
        </div>

        <div className="card-body">
          <MensajeError texto={errorFicha} onReintentar={recargarFicha} />
          {calendario}
          {fichaDelDia}
        </div>
      </div>
    )
  }

  /* ───────────── Consulta (cliente y visitante) ───────────── */

  return (
    <>
      <MensajeError texto={errorFicha} onReintentar={recargarFicha} />

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
              {calendario}
              {fichaDelDia}

              <h4 className="h6 fw-bold mt-3">Avisos del horario</h4>
              {avisosHorario.length === 0 ? (
                <p className="text-secondary small fst-italic mb-0">No hay avisos en el horario.</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {avisosHorario.map((aviso) => (
                    <li key={aviso.dia} className="list-group-item d-flex align-items-center gap-2 px-0">
                      <span className={`badge bg-${aviso.abre ? 'success' : 'danger'} flex-shrink-0`}>
                        {aviso.abre ? 'Abierto' : 'Cerrado'}
                      </span>
                      <span className="small flex-grow-1 min-width-0">
                        <span className="d-block fw-semibold">{aviso.dia}</span>
                        <span className="text-secondary">{aviso.nota}</span>
                      </span>
                    </li>
                  ))}
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
                <i className={`fa-solid ${estado.abierto ? 'fa-door-open' : 'fa-door-closed'} me-1`} />
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
                      <span className={entrada.cerrado ? 'text-danger' : 'text-secondary'}>{entrada.texto}</span>
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
