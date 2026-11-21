import { useCallback, useState } from 'react'

import { useRecurso } from '../../hooks/useRecurso'
import { usePeticion } from '../../hooks/usePeticion'
import { useConfirmacion } from '../../hooks/useConfirmacion'
import { useAvisos } from '../../context/AvisosContext'
import { esMapaDeGoogle } from '../../utils/seguridad'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'
import ConfirmarEliminacion from '../../components/ui/ConfirmarEliminacion'
import { PUNTOS_CLAVE } from '../../data/contenido'
import { establecimientoApi } from './api'
import { useFicha } from './useFicha'
import OpinionesClientes from './OpinionesClientes'
import FormularioFicha from './FormularioFicha'
import FormularioHorario, { DIAS_HORARIO, horarioVacio } from './FormularioHorario'

// Ficha vacía para el primer alta (base de datos nueva, sin ubicación registrada)
const FICHA_VACIA = { nombre: '', descripcion: '', ciudad: '', direccion: '', telefono: '', mapa: '' }

// "14:00" → "2:00 p. m.", para leer el horario de un vistazo
const horaLegible = (hora) => {
  const [h, m] = String(hora ?? '').split(':').map(Number)
  if (!Number.isFinite(h)) return hora ?? ''
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'p. m.' : 'a. m.'}`
}

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
  const {
    datos: ficha,
    cargando: cargandoFicha,
    error: errorFicha,
    recargar: recargarFicha,
  } = useFicha()

  // Horario semanal: un registro por día en el backend (/api/horarios).
  const {
    datos: horarios,
    cargando: cargandoHorarios,
    error: errorHorarios,
    recargar: recargarHorarios,
  } = useRecurso(establecimientoApi.listarHorarios, [])

  const avisos = useAvisos()
  const [modalFicha, setModalFicha] = useState(null)
  const [modalHorario, setModalHorario] = useState(null)

  const guardadoFicha = usePeticion(
    useCallback(
      async (valores) => {
        await establecimientoApi.actualizarFicha(valores.id, valores)
        await recargarFicha()
      },
      [recargarFicha]
    )
  )

  const guardadoHorario = usePeticion(
    useCallback(
      async (valores) => {
        await establecimientoApi.guardarHorario(valores)
        await recargarHorarios()
      },
      [recargarHorarios]
    )
  )

  const guardarFicha = async (valores) => {
    const { ok, error: fallo } = await guardadoFicha.ejecutar(valores)
    if (!ok) {
      avisos.fallo('No se pudo guardar la ficha', fallo)
      return
    }
    setModalFicha(null)
    avisos.exito('Ficha actualizada', 'Los datos del local ya se ven en el panel del cliente.')
  }

  const guardarHorario = async (valores) => {
    const editando = Boolean(valores.id)
    const { ok, error: fallo } = await guardadoHorario.ejecutar(valores)
    if (!ok) {
      avisos.fallo('No se pudo guardar el horario', fallo)
      return
    }
    setModalHorario(null)
    avisos.exito(editando ? 'Horario actualizado' : 'Horario añadido', `El horario del ${valores.dia} ya se ve en el calendario.`)
  }

  // RNF-01: un mismo componente confirma todos los borrados de la aplicación.
  const eliminacionHorario = useConfirmacion((horario) => establecimientoApi.eliminarHorario(horario.id), {
    alTerminar: recargarHorarios,
  })

  const eliminarHorario = async () => {
    const dia = eliminacionHorario.objetivo?.dia
    if (await eliminacionHorario.confirmar()) {
      avisos.error('Horario eliminado', `El ${dia} ya no tiene horario de atención.`)
    }
  }

  // Los horarios en el orden de la semana, para la tabla
  const semana = [...horarios].sort((a, b) => DIAS_HORARIO.indexOf(a.dia) - DIAS_HORARIO.indexOf(b.dia))
  const diasOcupados = horarios.map((horario) => horario.dia)

  if (cargandoFicha && !ficha) return <Cargando texto="Cargando información del local…" />

  return (
    <>
      <EncabezadoPagina
        titulo={editable ? 'Gestión del Establecimiento' : 'Nuestro Establecimiento'}
        descripcion={
          editable
            ? 'Actualiza la ficha del local y el horario de atención.'
            : 'Ubicación, horario y todo lo que distingue a Corralejo Fast Food.'
        }
      >
        <button
          className="btn btn-outline-secondary"
          onClick={() => {
            recargarFicha()
            recargarHorarios()
          }}
        >
          <i className="fa-solid fa-rotate me-2" />
          Actualizar
        </button>
      </EncabezadoPagina>

      <MensajeError texto={errorFicha} onReintentar={recargarFicha} />
      <MensajeError texto={errorHorarios} onReintentar={recargarHorarios} />

      {/* Sin Lista Top ni podio de más vendidos: esta pantalla es de gestión
          (Admin y Owner). Empieza directamente por la ficha y el calendario. */}

      {!ficha && !cargandoFicha && (
        <div className="card border-0 shadow-sm">
          <Vacio texto="Todavía no hay una ficha del establecimiento." icono="fa-store" />
          {editable && (
            <div className="text-center pb-4">
              <button className="btn btn-primary" onClick={() => setModalFicha({ ...FICHA_VACIA })}>
                <i className="fa-solid fa-plus me-2" />
                Crear ficha
              </button>
            </div>
          )}
        </div>
      )}

      {ficha && (
        <div className="row g-3 mb-3">
          <div className="col-12 col-xl-aureo-mayor">
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

                {/* Editar la ficha va junto a lo que edita, debajo de Puntos clave. */}
                {editable && (
                  <button className="btn btn-primary mt-3" onClick={() => setModalFicha({ ...ficha })}>
                    <i className="fa-solid fa-pen me-2" />
                    Editar ficha
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="col-12 col-xl-aureo-menor">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
                <h2 className="h6 fw-bold mb-0">
                  <i className="fa-solid fa-calendar-days text-brand me-2" />
                  Horario de atención
                </h2>
                {editable && diasOcupados.length < DIAS_HORARIO.length && (
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => setModalHorario(horarioVacio(diasOcupados))}
                  >
                    <i className="fa-solid fa-plus me-2" />
                    Añadir horario
                  </button>
                )}
              </div>
              <div className="card-body">
                {cargandoHorarios && <Cargando texto="Cargando horario…" />}

                {!cargandoHorarios && semana.length === 0 ? (
                  <p className="text-secondary small fst-italic mb-0">
                    No hay horarios configurados.
                    {editable && ' Pulsa "Añadir horario" para crear el de cada día.'}
                  </p>
                ) : (
                  <ul className="list-group list-group-flush">
                    {semana.map((horario) => (
                      <li key={horario.id} className="list-group-item d-flex align-items-center gap-2 px-0">
                        <span className={`badge bg-${horario.estaAbierto ? 'success' : 'danger'} flex-shrink-0`}>
                          {horario.estaAbierto ? 'Abierto' : 'Cerrado'}
                        </span>
                        <span className="small flex-grow-1 min-width-0">
                          <span className="d-block fw-semibold">{horario.dia}</span>
                          <span className="text-secondary">
                            {horario.estaAbierto
                              ? `${horaLegible(horario.horaApertura)} – ${horaLegible(horario.horaCierre)}`
                              : 'Sin atención'}
                            {horario.estadoNota ? ` · ${horario.estadoNota}` : ''}
                          </span>
                        </span>
                        {editable && (
                          <span className="btn-group btn-group-sm flex-shrink-0">
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => setModalHorario({ ...horario })}
                              aria-label={`Editar el horario del ${horario.dia}`}
                            >
                              <i className="fa-solid fa-pen" />
                            </button>
                            <button
                              className="btn btn-outline-danger"
                              onClick={() => eliminacionHorario.pedir(horario)}
                              aria-label={`Eliminar el horario del ${horario.dia}`}
                            >
                              <i className="fa-solid fa-trash-can" />
                            </button>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comentarios aprobados + valoraciones por QR en un solo bloque. El
          Admin y Owner ven además los productos calificados (VER_DETALLE_OPINIONES).
          Misión, visión y narrativa: botón "Información" del menú lateral. */}
      <OpinionesClientes puedeComentar={!editable} />

      {modalFicha && (
        <FormularioFicha
          ficha={modalFicha}
          enviando={guardadoFicha.enviando}
          onGuardar={guardarFicha}
          onCerrar={() => setModalFicha(null)}
        />
      )}

      {modalHorario && (
        <FormularioHorario
          horario={modalHorario}
          diasOcupados={diasOcupados}
          enviando={guardadoHorario.enviando}
          onGuardar={guardarHorario}
          onCerrar={() => setModalHorario(null)}
        />
      )}

      {eliminacionHorario.objetivo && (
        <ConfirmarEliminacion
          entidad="el horario del"
          nombre={eliminacionHorario.objetivo.dia}
          consecuencias={['El cliente verá ese día sin horario de atención en el calendario.']}
          enviando={eliminacionHorario.enviando}
          error={eliminacionHorario.error}
          onConfirmar={eliminarHorario}
          onCancelar={eliminacionHorario.cancelar}
        />
      )}
    </>
  )
}
