import { useCallback, useMemo, useState } from 'react'

import { api } from '../../services/api'
import { useRecurso } from '../../hooks/useRecurso'
import { usePeticion } from '../../hooks/usePeticion'
import { useConfirmacion } from '../../hooks/useConfirmacion'
import { useAvisos } from '../../context/AvisosContext'
import { esMapaDeGoogle } from '../../utils/seguridad'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'
import ConfirmarEliminacion from '../../components/ui/ConfirmarEliminacion'
import { PILARES, PUNTOS_CLAVE, VALORACIONES } from '../../data/contenido'
import {
  DIAS_SEMANA,
  MESES,
  TIPOS_DIA,
  desplazamientoDe,
  diaVacio,
  diasDelMes,
  fechaLegible,
  isoDe,
  mesDesplazado,
  partesDe,
} from './calendario'
import NarrativaCreativa from './NarrativaCreativa'
import FormularioFicha from './FormularioFicha'
import FormularioDiaEspecial from './FormularioDiaEspecial'

const FICHA = 'establecimiento'
const DIAS = 'diasEspeciales'

const hoy = new Date()

/**
 * Ficha del establecimiento: ubicación, horario, días especiales y narrativa.
 * Misma presentación para todos los roles; `editable` es lo único que cambia:
 * el administrador actualiza la ficha y añade, edita o elimina días
 * especiales, el cliente solo consulta (R44).
 *
 * Los formularios y la narrativa son archivos hermanos del módulo: aquí queda
 * la pantalla, que carga, pinta y recoge eventos.
 */
export default function Establecimiento({ editable = false }) {
  const cargarFicha = useCallback(async () => (await api.list(FICHA))[0] ?? null, [])
  const cargarDias = useCallback(() => api.list(DIAS), [])

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

  const avisos = useAvisos()
  const [mes, setMes] = useState({ año: hoy.getFullYear(), mes: hoy.getMonth() })
  const [modalFicha, setModalFicha] = useState(null)
  const [modalDia, setModalDia] = useState(null)

  const guardadoFicha = usePeticion(
    useCallback(
      async (valores) => {
        await api.update(FICHA, valores.id, valores)
        await recargarFicha()
      },
      [recargarFicha]
    )
  )

  const guardadoDia = usePeticion(
    useCallback(
      async (valores) => {
        const { id, ...datos } = valores
        if (id) await api.update(DIAS, id, valores)
        else await api.create(DIAS, datos)
        await recargarDias()
      },
      [recargarDias]
    )
  )

  // Días del mes visible, indexados por número de día para pintar el calendario.
  const delMes = useMemo(() => {
    const indexados = {}
    dias.forEach((dia) => {
      const { año, mes: mesDia, dia: numero } = partesDe(dia.fecha)
      if (año === mes.año && mesDia === mes.mes) indexados[numero] = dia
    })
    return indexados
  }, [dias, mes])

  const especiales = Object.keys(delMes).sort((a, b) => a - b)

  const abrirDia = (numero) => {
    if (!editable) return
    const existente = delMes[numero]
    setModalDia(
      existente ? { ...existente } : { ...diaVacio(), fecha: isoDe(mes.año, mes.mes, numero) }
    )
  }

  const guardarFicha = async (valores) => {
    const { ok, error: fallo } = await guardadoFicha.ejecutar(valores)
    if (!ok) {
      avisos.fallo('No se pudo guardar la ficha', fallo)
      return
    }
    setModalFicha(null)
    avisos.exito('Ficha actualizada', 'Los datos del local ya se ven en el panel del cliente.')
  }

  const guardarDia = async (valores) => {
    const editando = Boolean(valores.id)
    const { ok, error: fallo } = await guardadoDia.ejecutar(valores)
    if (!ok) {
      avisos.fallo('No se pudo guardar el día', fallo)
      return
    }
    setModalDia(null)
    avisos.exito(
      editando ? 'Día especial actualizado' : 'Día especial añadido',
      `${fechaLegible(valores.fecha)} quedó marcado como ${
        TIPOS_DIA[valores.tipo]?.etiqueta.toLowerCase() ?? valores.tipo
      }.`
    )
  }

  // RNF-01: un mismo componente confirma todos los borrados de la aplicación.
  const eliminacionDia = useConfirmacion((dia) => api.remove(DIAS, dia.id), {
    alTerminar: recargarDias,
  })

  const eliminarDia = async () => {
    const fecha = eliminacionDia.objetivo?.fecha
    if (await eliminacionDia.confirmar()) {
      avisos.error('Día especial eliminado', `${fechaLegible(fecha)} volvió a ser un día normal.`)
    }
  }

  const celdas = () => {
    const { año, mes: mesVisible } = mes
    const total = diasDelMes(año, mesVisible)
    const esMesActual = hoy.getFullYear() === año && hoy.getMonth() === mesVisible

    const vacias = Array.from({ length: desplazamientoDe(año, mesVisible) }, (_, i) => (
      <div key={`vacio-${i}`} className="calendar-day is-muted" />
    ))

    const numeradas = Array.from({ length: total }, (_, i) => {
      const numero = i + 1
      const marca = delMes[numero]
      const clases = [
        'calendar-day',
        marca?.tipo ?? '',
        esMesActual && hoy.getDate() === numero ? 'is-today' : '',
        editable ? '' : 'is-readonly',
      ]
        .filter(Boolean)
        .join(' ')

      const descripcion = marca
        ? `${numero}: ${TIPOS_DIA[marca.tipo]?.etiqueta ?? marca.tipo} — ${marca.motivo}`
        : String(numero)

      return editable ? (
        <button
          key={numero}
          type="button"
          className={clases}
          title={marca?.motivo ?? 'Añadir día especial'}
          aria-label={descripcion}
          onClick={() => abrirDia(numero)}
        >
          {numero}
        </button>
      ) : (
        <div key={numero} className={clases} title={marca?.motivo ?? ''} aria-label={descripcion}>
          {numero}
        </div>
      )
    })

    return [...vacias, ...numeradas]
  }

  if (cargandoFicha && !ficha) return <Cargando texto="Cargando información del local…" />

  return (
    <>
      <EncabezadoPagina
        titulo={editable ? 'Gestión del Establecimiento' : 'Nuestro Establecimiento'}
        descripcion={
          editable
            ? 'Actualiza la ficha del local y administra los días especiales.'
            : 'Ubicación, horario y todo lo que distingue a Corralejo Fast Food.'
        }
      >
        {editable && ficha && (
          <>
            <button className="btn btn-primary" onClick={() => setModalFicha({ ...ficha })}>
              <i className="fa-solid fa-pen me-2" />
              Editar ficha
            </button>
            <button
              className="btn btn-outline-primary"
              onClick={() => setModalDia(diaVacio())}
            >
              <i className="fa-solid fa-calendar-plus me-2" />
              Añadir día especial
            </button>
          </>
        )}
        <button
          className="btn btn-outline-secondary"
          onClick={() => {
            recargarFicha()
            recargarDias()
          }}
        >
          <i className="fa-solid fa-rotate me-2" />
          Actualizar
        </button>
      </EncabezadoPagina>

      <MensajeError texto={errorFicha} onReintentar={recargarFicha} />
      <MensajeError texto={errorDias} onReintentar={recargarDias} />

      {!ficha && !cargandoFicha && (
        <div className="card border-0 shadow-sm">
          <Vacio texto="Todavía no hay una ficha del establecimiento." icono="fa-store" />
        </div>
      )}

      {ficha && (
        <div className="row g-3 mb-3">
          <div className="col-12 col-xl-7">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white">
                <h2 className="h6 fw-bold mb-0">
                  <i className="fa-solid fa-location-dot text-brand me-2" />
                  Ubicación y contacto
                </h2>
              </div>
              {/* Solo se incrusta un mapa de Google: la URL viene de la API y
                  se pinta en el panel de todos los clientes. */}
              {esMapaDeGoogle(ficha.mapa) ? (
                <div className="ratio ratio-21x9">
                  <iframe
                    src={ficha.mapa}
                    title="Ubicación Corralejo"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              ) : (
                <div className="bg-body-tertiary text-center text-secondary small py-4 border-bottom">
                  <i className="fa-solid fa-map-location-dot fs-3 d-block mb-2 opacity-50" />
                  Mapa no disponible
                  {editable && ': la URL guardada no es un mapa insertado de Google Maps.'}
                </div>
              )}
              <div className="card-body">
                <h3 className="h6 fw-bold">{ficha.nombre}</h3>
                <p className="text-secondary small">{ficha.descripcion}</p>

                <ul className="list-unstyled small mb-3">
                  {[
                    { icono: 'fa-solid fa-location-dot', texto: `${ficha.direccion} — ${ficha.ciudad}` },
                    { icono: 'fa-solid fa-phone', texto: ficha.telefono },
                    { icono: 'fa-brands fa-whatsapp', texto: ficha.whatsapp },
                    { icono: 'fa-solid fa-clock', texto: ficha.horario },
                  ].map(({ icono, texto }) => (
                    <li className="mb-2 d-flex gap-2" key={icono}>
                      <i className={`${icono} text-brand mt-1`} />
                      <span>{texto}</span>
                    </li>
                  ))}
                </ul>

                <strong className="small text-uppercase">Puntos clave</strong>
                <ul className="list-unstyled small text-secondary mt-2 mb-0">
                  {PUNTOS_CLAVE.map(({ id, texto }) => (
                    <li className="mb-1" key={id}>
                      <i className="fa-solid fa-circle-check text-success me-2" />
                      {texto}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="col-12 col-xl-5">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white">
                <h2 className="h6 fw-bold mb-0">
                  <i className="fa-solid fa-calendar-days text-brand me-2" />
                  Calendario de atención
                </h2>
              </div>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setMes(mesDesplazado(mes, -1))}
                    aria-label="Mes anterior"
                  >
                    <i className="fa-solid fa-chevron-left" />
                  </button>
                  <strong>
                    {MESES[mes.mes]} {mes.año}
                  </strong>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setMes(mesDesplazado(mes, 1))}
                    aria-label="Mes siguiente"
                  >
                    <i className="fa-solid fa-chevron-right" />
                  </button>
                </div>

                <div className="calendar-grid text-center small text-secondary fw-semibold mb-1">
                  {DIAS_SEMANA.map((dia) => (
                    <div key={dia}>{dia}</div>
                  ))}
                </div>
                <div className="calendar-grid mb-3">{celdas()}</div>

                <div className="d-flex flex-wrap gap-3 small text-secondary mb-3">
                  {Object.values(TIPOS_DIA).map(({ etiqueta, color }) => (
                    <span key={etiqueta}>
                      <span className={`badge bg-${color}`}>&nbsp;</span> {etiqueta}
                    </span>
                  ))}
                </div>

                <h3 className="h6 fw-bold">Días especiales este mes</h3>
                {cargandoDias && <Cargando texto="Cargando días especiales…" />}

                {!cargandoDias && especiales.length === 0 ? (
                  <p className="text-secondary small fst-italic mb-0">
                    No hay días especiales configurados.
                    {editable && ' Pulsa un día del calendario para añadirlo.'}
                  </p>
                ) : (
                  <ul className="list-group list-group-flush">
                    {especiales.map((numero) => {
                      const dia = delMes[numero]
                      const tipo = TIPOS_DIA[dia.tipo] ?? {}

                      return (
                        <li
                          key={dia.id}
                          className="list-group-item d-flex align-items-center gap-2 px-0"
                        >
                          <span className={`badge bg-${tipo.color ?? 'secondary'} flex-shrink-0`}>
                            <i className={`fa-solid ${tipo.icono ?? 'fa-circle'} me-1`} />
                            {tipo.etiqueta ?? dia.tipo}
                          </span>
                          <span className="small flex-grow-1 min-width-0">
                            <span className="d-block fw-semibold">{fechaLegible(dia.fecha)}</span>
                            <span className="text-secondary">{dia.motivo}</span>
                          </span>
                          {editable && (
                            <span className="btn-group btn-group-sm flex-shrink-0">
                              <button
                                className="btn btn-outline-primary"
                                onClick={() => setModalDia({ ...dia })}
                                aria-label={`Editar el día ${fechaLegible(dia.fecha)}`}
                              >
                                <i className="fa-solid fa-pen" />
                              </button>
                              <button
                                className="btn btn-outline-danger"
                                onClick={() => eliminacionDia.pedir(dia)}
                                aria-label={`Eliminar el día ${fechaLegible(dia.fecha)}`}
                              >
                                <i className="fa-solid fa-trash-can" />
                              </button>
                            </span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row g-3 mb-3">
        {PILARES.map(({ id, titulo, icono, texto }) => (
          <div className="col-12 col-lg-6" key={id}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h2 className="h6 fw-bold text-uppercase mb-3">
                  <i className={`fa-solid ${icono} text-brand me-2`} />
                  {titulo}
                </h2>
                <p className="text-secondary mb-0">{texto}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <NarrativaCreativa />

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white">
          <h2 className="h6 fw-bold mb-0">
            <i className="fa-solid fa-star text-brand me-2" />
            Valoraciones
          </h2>
        </div>
        <div className="card-body d-flex flex-wrap gap-4 align-items-center">
          <div className="text-center">
            <p className="display-5 fw-bold text-brand mb-0">{VALORACIONES.promedio}</p>
            <div className="text-warning fs-5" aria-hidden="true">
              ★★★★★
            </div>
            <small className="text-secondary">{VALORACIONES.total}</small>
          </div>
          <ul className="list-group list-group-flush flex-grow-1">
            {VALORACIONES.recientes.map(({ id, nombre, estrellas, cuando }) => (
              <li
                className="list-group-item d-flex justify-content-between align-items-center px-0"
                key={id}
              >
                <span>
                  <span className="fw-semibold text-body">{nombre}</span>{' '}
                  <span className="text-warning" aria-label={`${estrellas.split('★').length - 1} de 5 estrellas`}>
                    {estrellas}
                  </span>
                </span>
                <span className="small fw-semibold text-body">
                  <i className="fa-regular fa-clock me-1 text-brand" />
                  hace {cuando}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {modalFicha && (
        <FormularioFicha
          ficha={modalFicha}
          enviando={guardadoFicha.enviando}
          onGuardar={guardarFicha}
          onCerrar={() => setModalFicha(null)}
        />
      )}

      {modalDia && (
        <FormularioDiaEspecial
          dia={modalDia}
          enviando={guardadoDia.enviando}
          onGuardar={guardarDia}
          onCerrar={() => setModalDia(null)}
        />
      )}

      {eliminacionDia.objetivo && (
        <ConfirmarEliminacion
          entidad="el día especial"
          nombre={fechaLegible(eliminacionDia.objetivo.fecha)}
          consecuencias={[
            `Estaba marcado como: ${
              TIPOS_DIA[eliminacionDia.objetivo.tipo]?.etiqueta ?? eliminacionDia.objetivo.tipo
            } — ${eliminacionDia.objetivo.motivo}`,
            'El cliente dejará de verlo en el calendario.',
          ]}
          enviando={eliminacionDia.enviando}
          error={eliminacionDia.error}
          onConfirmar={eliminarDia}
          onCancelar={eliminacionDia.cancelar}
        />
      )}
    </>
  )
}
