import { useCallback, useState } from 'react'

import { useAvisos } from '../../context/AvisosContext'
import { useConfirmacion } from '../../hooks/useConfirmacion'
import { usePeticion } from '../../hooks/usePeticion'
import { esMapaDeGoogle } from '../../utils/seguridad'
import { PUNTOS_CLAVE } from '../../data/contenido'
import ConfirmarEliminacion from '../../components/ui/ConfirmarEliminacion'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'
import OpinionesClientes from '../comments/OpinionesClientes'

import { establecimientoApi } from './api'
import FormularioFicha from './FormularioFicha'
import FormularioHorario, { horarioVacio } from './FormularioHorario'
import { DIAS_HORARIO, horaLegible } from './horario'
import { useFicha } from './useFicha'

// Ficha vacía para el primer alta (base de datos nueva, sin ubicación registrada)
const FICHA_VACIA = { nombre: '', descripcion: '', ciudad: '', direccion: '', telefono: '', referencia: '', mapa: '' }

// Mismo arreglo vacío en cada render mientras la ficha no ha llegado
const SIN_HORARIOS = []

/**
 * Gestión del Establecimiento (Owner y Administrador): ficha del local, horario de cada día
 * y muro de comentarios. Los formularios son archivos hermanos del módulo; aquí queda la
 * pantalla, que carga, pinta y recoge eventos.
 */
export default function Establecimiento({ editable = false }) {
  const {
    datos: ficha,
    cargando: cargandoFicha,
    error: errorFicha,
    recargar: recargarFicha,
  } = useFicha()

  // Horario semanal: un registro por día en el backend (/api/horarios). Llega dentro de la
  // ficha (módulo establecimiento): una sola lectura y una sola recarga para ubicación y horario.
  const horarios = ficha?.horarios ?? SIN_HORARIOS

  const avisos = useAvisos()
  const [modalFicha, setModalFicha] = useState(null)
  const [modalHorario, setModalHorario] = useState(null)

  const guardadoFicha = usePeticion(
    useCallback(
      async (valores) => {
        await establecimientoApi.guardarFicha(valores.id, valores)
        await recargarFicha()
      },
      [recargarFicha]
    )
  )

  // Recargar la ficha también actualiza el horario resumido de "Ubicación y contacto".
  const guardadoHorario = usePeticion(
    useCallback(
      async (valores) => {
        await establecimientoApi.guardarHorario(valores)
        await recargarFicha()
      },
      [recargarFicha]
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
    const titulo = editando ? 'Horario actualizado' : 'Horario añadido'
    avisos.exito(titulo, `El horario del ${valores.dia} ya se ve en el calendario.`)
  }

  const eliminacionHorario = useConfirmacion((horario) => establecimientoApi.eliminarHorario(horario.id), {
    alTerminar: recargarFicha,
  })

  const eliminarHorario = async () => {
    const dia = eliminacionHorario.objetivo?.dia
    if (await eliminacionHorario.confirmar()) {
      avisos.error('Horario eliminado', `El ${dia} ya no tiene horario de atención.`)
    }
  }

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
        <button className="btn btn-outline-secondary" onClick={recargarFicha}>
          <i className="fa-solid fa-rotate me-2" />
          Actualizar
        </button>
      </EncabezadoPagina>

      <MensajeError texto={errorFicha} onReintentar={recargarFicha} />

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
              {/* Solo se incrusta un mapa de Google (ver utils/seguridad.js). */}
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
                    // Un solo número en el backend: el teléfono es también el WhatsApp del local
                    { icono: 'fa-brands fa-whatsapp', texto: `${ficha.telefono} · teléfono y WhatsApp` },
                    { icono: 'fa-solid fa-map-pin', texto: ficha.referencia },
                    { icono: 'fa-solid fa-clock', texto: ficha.horario },
                  ]
                    .filter(({ texto }) => texto)
                    .map(({ icono, texto }) => (
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
                {semana.length === 0 ? (
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

      {/* Comentarios y valoraciones por QR en un solo bloque. Misión, visión y narrativa están en
         el botón «Información» del menú lateral. */}
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
