import { useCallback, useMemo, useState } from 'react'

import { api } from '../../services/api'
import { useRecurso } from '../../hooks/useRecurso'
import Modal from '../../components/ui/Modal'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, Error, Vacio } from '../../components/ui/Estado'
import ConfirmarEliminacion from '../../components/ui/ConfirmarEliminacion'
import { useConfirmacion } from '../../hooks/useConfirmacion'
import { CAMPOS_INFO } from '../../data/local'
import { HISTORIAS, MISION, PILARES, PUNTOS_CLAVE, VALORACIONES } from '../../data/contenido'

const FICHA = 'establecimiento'
const DIAS = 'diasEspeciales'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const TIPOS = {
  cerrado: { etiqueta: 'Cerrado', icono: 'fa-ban', color: 'danger' },
  evento: { etiqueta: 'Evento', icono: 'fa-star', color: 'brand' },
}

// No se usa fechaCorta() de utils/format: new Date('2026-12-24') se interpreta en UTC y en
// Colombia mostraría el día anterior.
const fechaLegible = (fecha) => {
  const { year, month, dia } = partesDe(fecha)
  return Number.isNaN(dia) ? fecha : `${dia} de ${MESES[month] ?? ''} de ${year}`
}

const hoy = new Date()
const diaVacio = () => ({ fecha: '', tipo: 'cerrado', motivo: '' })

/** "2026-12-24" → { year: 2026, month: 11, dia: 24 } sin pasar por la zona horaria. */
const partesDe = (fecha) => {
  const [year, month, dia] = String(fecha ?? '').split('-').map(Number)
  return { year, month: month - 1, dia }
}

/**
 * Ficha del establecimiento: ubicación, horario, días especiales y narrativa.
 * Misma presentación para todos los roles; `editable` es lo único que cambia:
 * el administrador actualiza la ficha y añade, edita o elimina días
 * especiales, el cliente solo consulta.
 */
export default function Establecimiento({ editable = false }) {
  const cargarFicha = useCallback(async () => (await api.list(FICHA))[0] ?? null, [])
  const cargarDias = useCallback(() => api.list(DIAS), [])

  const {
    datos: ficha,
    cargando: cargandoFicha,
    error: errorFicha,
    setError: setErrorFicha,
    recargar: recargarFicha,
  } = useRecurso(cargarFicha, null)

  const {
    datos: dias,
    cargando: cargandoDias,
    error: errorDias,
    setError: setErrorDias,
    recargar: recargarDias,
  } = useRecurso(cargarDias, [])

  const [mes, setMes] = useState({ year: hoy.getFullYear(), month: hoy.getMonth() })
  const [modalFicha, setModalFicha] = useState(null) // copia editable de la ficha
  const [modalDia, setModalDia] = useState(null) // { fecha, tipo, motivo, id? }
  const [historia, setHistoria] = useState(null)

  // Días del mes visible, indexados por número de día para pintar el calendario.
  const delMes = useMemo(() => {
    const indexados = {}
    dias.forEach((dia) => {
      const { year, month, dia: numero } = partesDe(dia.fecha)
      if (year === mes.year && month === mes.month) indexados[numero] = dia
    })
    return indexados
  }, [dias, mes])

  const cambiarMes = (delta) => {
    let { year, month } = mes
    month += delta
    if (month < 0) [month, year] = [11, year - 1]
    if (month > 11) [month, year] = [0, year + 1]
    setMes({ year, month })
  }

  const abrirDia = (numero) => {
    if (!editable) return
    const existente = delMes[numero]
    if (existente) {
      setModalDia({ ...existente })
      return
    }
    const mm = String(mes.month + 1).padStart(2, '0')
    const dd = String(numero).padStart(2, '0')
    setModalDia({ ...diaVacio(), fecha: `${mes.year}-${mm}-${dd}` })
  }

  const guardarFicha = async (e) => {
    e.preventDefault()
    try {
      await api.update(FICHA, ficha.id, modalFicha)
      setModalFicha(null)
      recargarFicha()
    } catch (err) {
      setErrorFicha(err.message)
    }
  }

  const guardarDia = async (e) => {
    e.preventDefault()
    if (!modalDia.fecha) {
      setErrorDias('Indica la fecha del día especial.')
      return
    }

    const { id, ...datos } = modalDia
    try {
      if (id) await api.update(DIAS, id, modalDia)
      else await api.create(DIAS, datos)
      setModalDia(null)
      recargarDias()
    } catch (err) {
      setErrorDias(err.message)
    }
  }

  // RNF-01: un mismo componente confirma todos los borrados de la aplicación.
  const eliminacionDia = useConfirmacion((dia) => api.remove(DIAS, dia.id), {
    alTerminar: recargarDias,
  })

  const celdas = () => {
    const { year, month } = mes
    const desplazamiento = (new Date(year, month, 1).getDay() + 6) % 7 // la semana inicia lunes
    const total = new Date(year, month + 1, 0).getDate()
    const esMesActual = hoy.getFullYear() === year && hoy.getMonth() === month

    const vacias = Array.from({ length: desplazamiento }, (_, i) => (
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
      ].join(' ')

      return (
        <div
          key={numero}
          className={clases}
          title={marca?.motivo ?? ''}
          onClick={() => abrirDia(numero)}
        >
          {numero}
        </div>
      )
    })

    return [...vacias, ...numeradas]
  }

  const especiales = Object.keys(delMes).sort((a, b) => a - b)

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
            <button className="btn btn-primary" onClick={() => setModalDia(diaVacio())}>
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

      <Error texto={errorFicha} onReintentar={recargarFicha} />
      <Error texto={errorDias} onReintentar={recargarDias} />

      {!ficha && !cargandoFicha && (
        <Vacio texto="Todavía no hay una ficha del establecimiento." icono="fa-store" />
      )}

      {ficha && (
        <div className="row g-3 mb-3">
          <div className="col-12 col-xl-7">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white">
                <h2 className="h6 fw-bold mb-0">Ubicación y contacto</h2>
              </div>
              <div className="ratio ratio-21x9">
                <iframe src={ficha.mapa} title="Ubicación Corralejo" style={{ border: 0 }} />
              </div>
              <div className="card-body">
                <h3 className="h6 fw-bold">{ficha.nombre}</h3>
                <p className="text-secondary small">{ficha.descripcion}</p>

                <ul className="list-unstyled small mb-3">
                  <li className="mb-1">
                    <i className="fa-solid fa-location-dot text-brand me-2" />
                    {ficha.direccion} — {ficha.ciudad}
                  </li>
                  <li className="mb-1">
                    <i className="fa-solid fa-phone text-brand me-2" />
                    {ficha.telefono}
                  </li>
                  <li className="mb-1">
                    <i className="fa-brands fa-whatsapp text-brand me-2" />
                    {ficha.whatsapp}
                  </li>
                  <li>
                    <i className="fa-solid fa-clock text-brand me-2" />
                    {ficha.horario}
                  </li>
                </ul>

                <strong className="small">Puntos clave</strong>
                <ul className="list-unstyled small text-secondary mt-2 mb-0">
                  {PUNTOS_CLAVE.map(({ id, texto }) => (
                    <li key={id}>
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
                <h2 className="h6 fw-bold mb-0">Horario de atención</h2>
              </div>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => cambiarMes(-1)}
                    aria-label="Mes anterior"
                  >
                    <i className="fa-solid fa-chevron-left" />
                  </button>
                  <strong>
                    {MESES[mes.month]} {mes.year}
                  </strong>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => cambiarMes(1)}
                    aria-label="Mes siguiente"
                  >
                    <i className="fa-solid fa-chevron-right" />
                  </button>
                </div>

                <div className="calendar-grid text-center small text-secondary fw-semibold mb-1">
                  {['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'].map((dia) => (
                    <div key={dia}>{dia}</div>
                  ))}
                </div>
                <div className="calendar-grid mb-3">{celdas()}</div>

                <div className="d-flex gap-3 small text-secondary mb-3">
                  <span>
                    <span className="badge bg-danger">&nbsp;</span> Cerrado
                  </span>
                  <span>
                    <span className="badge bg-brand">&nbsp;</span> Evento
                  </span>
                </div>

                <h3 className="h6 fw-bold">Días especiales este mes</h3>
                {cargandoDias && <Cargando texto="Cargando días especiales…" />}

                {!cargandoDias && especiales.length === 0 ? (
                  <p className="text-secondary small fst-italic mb-0">
                    No hay días especiales configurados.
                    {editable && ' Haz clic en un día del calendario para añadirlo.'}
                  </p>
                ) : (
                  <ul className="list-group list-group-flush">
                    {especiales.map((numero) => {
                      const dia = delMes[numero]
                      return (
                        <li
                          key={dia.id}
                          className="list-group-item d-flex align-items-center gap-2 px-0"
                        >
                          <span className={`badge bg-${TIPOS[dia.tipo]?.color ?? 'secondary'}`}>
                            {TIPOS[dia.tipo]?.etiqueta ?? dia.tipo}
                          </span>
                          <span className="small flex-grow-1">{dia.motivo}</span>
                          <span className="small text-secondary">{fechaLegible(dia.fecha)}</span>
                          {editable && (
                            <>
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => setModalDia({ ...dia })}
                                aria-label="Editar día especial"
                              >
                                <i className="fa-solid fa-pen" />
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => eliminacionDia.pedir(dia)}
                                aria-label="Eliminar día especial"
                              >
                                <i className="fa-solid fa-xmark" />
                              </button>
                            </>
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

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <h2 className="h6 fw-bold text-uppercase mb-3">Narrativa creativa</h2>
          <p className="text-secondary">{MISION}</p>

          <div className="d-flex flex-wrap gap-2">
            {HISTORIAS.map((item) => (
              <button
                key={item.id}
                className="btn btn-outline-primary btn-sm"
                onClick={() => setHistoria(item)}
              >
                {item.titulo}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white">
          <h2 className="h6 fw-bold mb-0">Valoraciones</h2>
        </div>
        <div className="card-body d-flex flex-wrap gap-4 align-items-center">
          <div className="text-center">
            <p className="display-5 fw-bold text-brand mb-0">{VALORACIONES.promedio}</p>
            <div className="text-warning">★★★★★</div>
            <small className="text-secondary">{VALORACIONES.total}</small>
          </div>
          <ul className="list-group list-group-flush flex-grow-1">
            {VALORACIONES.recientes.map(({ id, nombre, estrellas, cuando }) => (
              <li className="list-group-item d-flex justify-content-between px-0 small" key={id}>
                <span>
                  {nombre} <span className="text-warning">{estrellas}</span>
                </span>
                <span className="text-secondary">{cuando}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {historia && (
        <Modal titulo={historia.titulo} icono="fa-book-open" onClose={() => setHistoria(null)}>
          <p className="mb-0">{historia.texto}</p>
        </Modal>
      )}

      {modalFicha && (
        <Modal
          titulo="Editar ficha del establecimiento"
          icono="fa-location-dot"
          onClose={() => setModalFicha(null)}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={() => setModalFicha(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" form="form-ficha" type="submit">
                Guardar cambios
              </button>
            </>
          }
        >
          <form id="form-ficha" className="d-grid gap-3" onSubmit={guardarFicha}>
            {CAMPOS_INFO.map(({ campo, etiqueta }) => (
              <div key={campo}>
                <label className="form-label">{etiqueta}</label>
                <input
                  className="form-control"
                  value={modalFicha[campo] ?? ''}
                  onChange={(e) => setModalFicha({ ...modalFicha, [campo]: e.target.value })}
                />
              </div>
            ))}
            <div>
              <label className="form-label">Descripción</label>
              <textarea
                className="form-control"
                rows="3"
                value={modalFicha.descripcion ?? ''}
                onChange={(e) => setModalFicha({ ...modalFicha, descripcion: e.target.value })}
              />
            </div>
          </form>
        </Modal>
      )}

      {modalDia && (
        <Modal
          titulo={modalDia.id ? 'Editar día especial' : 'Añadir día especial'}
          icono="fa-calendar-day"
          onClose={() => setModalDia(null)}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={() => setModalDia(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" form="form-dia" type="submit">
                Guardar
              </button>
            </>
          }
        >
          <form id="form-dia" className="d-grid gap-3" onSubmit={guardarDia}>
            <div>
              <label className="form-label">Fecha</label>
              <input
                type="date"
                className="form-control"
                value={modalDia.fecha}
                onChange={(e) => setModalDia({ ...modalDia, fecha: e.target.value })}
                required
              />
            </div>

            <div className="btn-group w-100">
              {Object.entries(TIPOS).map(([clave, { etiqueta, icono }]) => (
                <button
                  key={clave}
                  type="button"
                  className={`btn btn-outline-primary ${modalDia.tipo === clave ? 'active' : ''}`}
                  onClick={() => setModalDia({ ...modalDia, tipo: clave })}
                >
                  <i className={`fa-solid ${icono} me-2`} />
                  {etiqueta}
                </button>
              ))}
            </div>

            <div>
              <label className="form-label">Motivo</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Escribe el motivo…"
                value={modalDia.motivo}
                onChange={(e) => setModalDia({ ...modalDia, motivo: e.target.value })}
              />
            </div>
          </form>
        </Modal>
      )}

      {eliminacionDia.objetivo && (
        <ConfirmarEliminacion
          entidad="el día especial"
          nombre={fechaLegible(eliminacionDia.objetivo.fecha)}
          consecuencias={[
            `Estaba marcado como: ${
              TIPOS[eliminacionDia.objetivo.tipo]?.etiqueta ?? eliminacionDia.objetivo.tipo
            }.`,
            'El cliente dejará de verlo en el calendario.',
          ]}
          enviando={eliminacionDia.enviando}
          error={eliminacionDia.error}
          onConfirmar={eliminacionDia.confirmar}
          onCancelar={eliminacionDia.cancelar}
        />
      )}
    </>
  )
}
