import { useCallback, useState } from 'react'

import { ROLES, tieneNivel } from '../../config/roles.config'
import { useAuth } from '../../context/AuthContext'
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
import { fechaLegible } from './calendario'
import FormularioDia from './FormularioDia'
import FormularioFicha from './FormularioFicha'
import Horarios from './Horarios'
import { useFicha } from './useFicha'

// Ficha vacía para el primer alta (base de datos nueva, sin ubicación registrada)
const FICHA_VACIA = { nombre: '', descripcion: '', ciudad: '', direccion: '', telefono: '', referencia: '', mapa: '' }

/**
 * Gestión del Establecimiento (Owner y Administrador): ficha del local y, a su derecha, el
 * calendario y horario de atención en un solo bloque, más el muro de comentarios. Desde el
 * calendario, solo Admin y Owner editan, cierran o eliminan UNA fecha concreta (/cierres), sin
 * tocar los demás días.
 * Los formularios son archivos hermanos del módulo; aquí queda la pantalla, que carga, pinta y
 * recoge eventos.
 */
export default function Establecimiento({ editable = false }) {
  const {
    datos: ficha,
    cargando: cargandoFicha,
    error: errorFicha,
    recargar: recargarFicha,
  } = useFicha()

  const avisos = useAvisos()
  const { rol } = useAuth()
  const [modalFicha, setModalFicha] = useState(null)
  const [modalDia, setModalDia] = useState(null)

  const guardadoFicha = usePeticion(
    useCallback(
      async (valores) => {
        await establecimientoApi.guardarFicha(valores.id, valores)
        await recargarFicha()
      },
      [recargarFicha]
    )
  )

  // UNA FECHA: solo ese día; el horario semanal no cambia. Recargar la ficha actualiza el calendario.
  const guardadoDia = usePeticion(
    useCallback(
      async (valores) => {
        await establecimientoApi.guardarDia(valores)
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

  const guardarDia = async (valores) => {
    const { ok, error: fallo } = await guardadoDia.ejecutar(valores)
    if (!ok) {
      avisos.fallo('No se pudo guardar el día', fallo)
      return
    }
    setModalDia(null)
    const fecha = fechaLegible(valores.fecha)
    if (valores.estaAbierto) avisos.exito('Día actualizado', `El ${fecha} ya tiene su propio horario. Los demás días siguen igual.`)
    else avisos.error('Día cerrado', `El ${fecha} el local no abre. Los demás días siguen igual.`)
  }

  const eliminacionDia = useConfirmacion((especial) => establecimientoApi.eliminarDia(especial.id), {
    alTerminar: recargarFicha,
  })

  const eliminarDia = async () => {
    const fecha = eliminacionDia.objetivo?.fecha
    if (await eliminacionDia.confirmar()) {
      avisos.exito('Día eliminado', `El ${fechaLegible(fecha)} vuelve a seguir el horario semanal.`)
    }
  }

  // Editar, cerrar y eliminar fechas: solo Admin y Owner, como en el backend (ADMIN_ROLES)
  const gestionaHorario = editable && tieneNivel(rol, ROLES.ADMIN)
  const accionesDia = {
    onEditarDia: (dia) => setModalDia(dia),
    onEliminarDia: eliminacionDia.pedir,
  }

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

          {/* Calendario y horario de atención: un solo bloque. Admin y Owner editan, cierran y
             eliminan cada fecha desde aquí (CRUD de /cierres). */}
          <div className="col-12 col-xl-aureo-menor">
            <Horarios gestion={gestionaHorario ? accionesDia : null} />
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

      {modalDia && (
        <FormularioDia
          dia={modalDia}
          enviando={guardadoDia.enviando}
          onGuardar={guardarDia}
          onCerrar={() => setModalDia(null)}
        />
      )}

      {eliminacionDia.objetivo && (
        <ConfirmarEliminacion
          entidad="el día"
          nombre={fechaLegible(eliminacionDia.objetivo.fecha)}
          consecuencias={[
            'Ese día vuelve a seguir el horario semanal.',
            'Los demás días no cambian.',
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
