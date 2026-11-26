import { useCallback, useMemo, useState } from 'react'

<<<<<<< HEAD
import { useAvisos } from '../../context/AvisosContext'
import { useConfirmacion } from '../../hooks/useConfirmacion'
import { usePeticion } from '../../hooks/usePeticion'
import { useRecurso } from '../../hooks/useRecurso'
import { fechaCorta } from '../../utils/format'
import ConfirmarEliminacion from '../../components/ui/ConfirmarEliminacion'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'

import { pqrsApi } from './api'
import DetallePqrs from './DetallePqrs'
import { COLOR_ESTADO, colorDe, iconoDe } from './esquema'
import ResponderPqrs from './ResponderPqrs'

const porFecha = (a, b) => new Date(b.fecha) - new Date(a.fecha)

/**
 * Moderación de PQRS (administración). Las PQRS son privadas: el administrador las RESPONDE
 * (la respuesta le llega al cliente en «Mis solicitudes») o las elimina; nunca se publican.
 */
export default function PqrsModeracion() {
  const cargar = useCallback(async () => (await pqrsApi.listar()).sort(porFecha), [])
  const { datos: todas, cargando, error, recargar } = useRecurso(cargar, [])
  const avisos = useAvisos()

  const [busqueda, setBusqueda] = useState('')
  // El id y no el registro: si otro rol lo cambia, el detalle abierto se
  // actualiza con la siguiente sincronización.
  const [detalleId, setDetalleId] = useState(null)
  const [respondiendo, setRespondiendo] = useState(null)
  const detalle = todas.find((registro) => registro.id === detalleId) ?? null

  const texto = busqueda.toLowerCase().trim()
  const pqrs = useMemo(
    () =>
      todas.filter(
        (registro) =>
          !texto ||
          `${registro.nombre ?? ''} ${registro.asunto ?? ''} ${registro.texto ?? ''}`.toLowerCase().includes(texto)
      ),
    [todas, texto]
  )

  const respuesta = usePeticion(
    useCallback(
      // Lista blanca: el administrador solo escribe la respuesta y el estado.
      // Aunque `cambios` trajera asunto, texto o tipo, no llegan a la API: lo
      // que envió el cliente no se modifica desde este panel.
      async (registro, { respuesta: textoRespuesta, estado }) => {
        await pqrsApi.responder(registro.id, { respuesta: textoRespuesta, estado })
=======
import { api } from '../../services/api'
import { useRecurso } from '../../hooks/useRecurso'
import { usePeticion } from '../../hooks/usePeticion'
import { useConfirmacion } from '../../hooks/useConfirmacion'
import { useAvisos } from '../../context/AvisosContext'
import { fechaCorta } from '../../utils/format'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'
import ConfirmarEliminacion from '../../components/ui/ConfirmarEliminacion'
import Estrellas from '../../components/ui/Estrellas'
import { COLOR_ESTADO, colorDe, iconoDe, nombrePublico } from './esquema'
import DetallePqrs from './DetallePqrs'
import ResponderPqrs from './ResponderPqrs'

/**
 * Panel del administrador con dos buzones:
 *
 * - PQRS: privadas. Solo las ven su autor y el local. El administrador las
 *   RESPONDE (la respuesta le llega al cliente) o las elimina. Ya no se
 *   publican: una queja con datos de un pedido no es contenido para un muro.
 * - Comentarios: lo que los clientes escriben para el muro público del
 *   Establecimiento. Cada uno tiene un interruptor: el administrador decide si
 *   se ve o no. Nacen ocultos hasta que se aprueban.
 *
 * SOLO SE MODERA LO QUE SE LEE
 * La colección `comentarios` guarda también las puntuaciones que llegan por el
 * QR de un tiquete, y las que vienen sin texto no entran en este buzón: no hay
 * nada que aprobar en un número, y dejarlas aquí llenaría la lista de filas en
 * blanco que nunca se podrían publicar. La nota cuenta en los indicadores
 * desde que se registra; lo que espera el visto bueno es el texto.
 *
 * Las que sí traen texto se distinguen con la insignia del QR: ese comentario
 * tiene una compra detrás.
 */
export default function PqrsModeracion() {
  const cargar = useCallback(async () => {
    const [pqrs, comentarios] = await Promise.all([api.list('pqrs'), api.list('comentarios')])
    const porFecha = (a, b) => new Date(b.fecha) - new Date(a.fecha)
    return {
      pqrs: pqrs.sort(porFecha),
      comentarios: comentarios
        .filter((comentario) => String(comentario.texto ?? '').trim() !== '')
        .sort(porFecha),
    }
  }, [])
  const { datos, cargando, error, recargar } = useRecurso(cargar, { pqrs: [], comentarios: [] })
  const avisos = useAvisos()

  const [pestana, setPestana] = useState('pqrs')
  const [busqueda, setBusqueda] = useState('')
  const [detalle, setDetalle] = useState(null)
  const [respondiendo, setRespondiendo] = useState(null)

  const texto = busqueda.toLowerCase().trim()
  const coincide = useCallback(
    (registro) =>
      !texto ||
      `${registro.nombre ?? ''} ${registro.asunto ?? ''} ${registro.texto ?? ''}`
        .toLowerCase()
        .includes(texto),
    [texto]
  )
  const pqrs = useMemo(() => datos.pqrs.filter(coincide), [datos, coincide])
  const comentarios = useMemo(() => datos.comentarios.filter(coincide), [datos, coincide])

  const respuesta = usePeticion(
    useCallback(
      async (registro, cambios) => {
        await api.patch('pqrs', registro.id, {
          ...cambios,
          fechaRespuesta: new Date().toISOString(),
        })
>>>>>>> origin/main
        await recargar()
      },
      [recargar]
    )
  )

<<<<<<< HEAD
  const eliminacion = useConfirmacion((registro) => pqrsApi.eliminar(registro.id), { alTerminar: recargar })
=======
  const visibilidad = usePeticion(
    useCallback(
      async (comentario, visible) => {
        await api.patch('comentarios', comentario.id, { visible })
        await recargar()
      },
      [recargar]
    )
  )

  // Un solo flujo de borrado para los dos buzones: el registro lleva su colección.
  const eliminacion = useConfirmacion(({ coleccion, registro }) => api.remove(coleccion, registro.id), {
    alTerminar: recargar,
  })
>>>>>>> origin/main

  const responder = async (cambios) => {
    const { ok, error: fallo } = await respuesta.ejecutar(respondiendo, cambios)
    if (!ok) {
      avisos.fallo('No se pudo enviar la respuesta', fallo)
      return
    }
    avisos.exito('Respuesta enviada', `El cliente ya puede leerla en "${respondiendo.asunto}".`)
    setRespondiendo(null)
  }

<<<<<<< HEAD
  const eliminar = async () => {
    if (await eliminacion.confirmar()) avisos.error('Solicitud eliminada', 'Se borró del buzón.')
  }

  const sinResponder = todas.filter((registro) => !registro.respuesta).length
=======
  const alternarVisible = async (comentario) => {
    const mostrar = comentario.visible !== true
    const { ok, error: fallo } = await visibilidad.ejecutar(comentario, mostrar)
    if (!ok) {
      avisos.fallo('No se pudo cambiar la visibilidad', fallo)
      return
    }
    if (mostrar) avisos.exito('Comentario visible', 'Ya aparece en el muro del Establecimiento.')
    else avisos.error('Comentario oculto', 'Dejó de verse en el muro.')
  }

  const eliminar = async () => {
    const esPqrs = eliminacion.objetivo?.coleccion === 'pqrs'
    if (await eliminacion.confirmar()) {
      avisos.error(esPqrs ? 'Solicitud eliminada' : 'Comentario eliminado', 'Se borró del buzón.')
    }
  }

  const sinResponder = datos.pqrs.filter((registro) => !registro.respuesta).length
  const visibles = datos.comentarios.filter((comentario) => comentario.visible === true).length
>>>>>>> origin/main

  return (
    <>
      <EncabezadoPagina
        titulo="Moderación de PQRS"
<<<<<<< HEAD
        descripcion="Responde o elimina las peticiones, quejas, reclamos y sugerencias de los clientes."
=======
        descripcion="Responde o elimina las solicitudes y decide qué comentarios se ven en el muro público."
>>>>>>> origin/main
      >
        <button className="btn btn-outline-secondary" onClick={recargar} disabled={cargando}>
          <i className="fa-solid fa-rotate me-2" />
          Actualizar
        </button>
      </EncabezadoPagina>

      <MensajeError texto={error} onReintentar={recargar} />

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body d-flex flex-wrap align-items-center gap-3">
<<<<<<< HEAD
          <span className="badge bg-dark">
            <i className="fa-solid fa-inbox me-1" />
            {sinResponder} sin responder
          </span>
=======
          <div className="btn-group" role="group" aria-label="Buzón">
            <button
              className={`btn ${pestana === 'pqrs' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setPestana('pqrs')}
            >
              <i className="fa-solid fa-inbox me-2" />
              PQRS <span className="badge bg-dark ms-1">{sinResponder} sin responder</span>
            </button>
            <button
              className={`btn ${pestana === 'comentarios' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setPestana('comentarios')}
            >
              <i className="fa-solid fa-comments me-2" />
              Comentarios{' '}
              <span className="badge bg-dark ms-1">
                {visibles}/{datos.comentarios.length} visibles
              </span>
            </button>
          </div>
>>>>>>> origin/main
          <input
            className="form-control ms-auto"
            style={{ maxWidth: '22rem' }}
            placeholder="Buscar por nombre o contenido…"
<<<<<<< HEAD
            aria-label="Buscar PQRS"
=======
            aria-label="Buscar"
>>>>>>> origin/main
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
        </div>
      </div>

<<<<<<< HEAD
      {cargando && todas.length === 0 && <Cargando texto="Cargando el buzón…" />}

      <div className="card border-0 shadow-sm">
        {pqrs.length === 0 && !cargando && <Vacio texto="No hay solicitudes." icono="fa-inbox" />}
        <ul className="list-group list-group-flush">
          {pqrs.map((registro) => (
            <li className="list-group-item d-flex flex-wrap align-items-center gap-3" key={registro.id}>
              <div
                className="icon-tile icon-tile-sm d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ background: colorDe(registro.tipo) }}
              >
                <i className={`fa-solid ${iconoDe(registro.tipo)}`} />
              </div>

              <div className="flex-grow-1 min-width-0">
                <p className="mb-0 fw-semibold text-truncate">{registro.asunto}</p>
                <small className="text-secondary d-block text-truncate">
                  {registro.tipo} · {registro.nombre || 'sin identificar'} · {fechaCorta(registro.fecha)}
                </small>
                <small className="d-block recorte-2">{registro.texto}</small>
              </div>

              <span className={`badge bg-${COLOR_ESTADO[registro.estado] ?? 'secondary'} flex-shrink-0`}>
                {registro.estado}
              </span>
              <span className={`badge flex-shrink-0 ${registro.respuesta ? 'bg-success' : 'bg-warning text-dark'}`}>
                {registro.respuesta ? 'Respondida' : 'Sin responder'}
              </span>

              <div className="btn-group btn-group-sm flex-shrink-0">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setDetalleId(registro.id)}
                  aria-label={`Ver ${registro.asunto}`}
                >
                  <i className="fa-solid fa-eye" />
                </button>
                <button className="btn btn-outline-primary" onClick={() => setRespondiendo(registro)}>
                  <i className="fa-solid fa-reply me-1" />
                  {registro.respuesta ? 'Editar respuesta' : 'Responder'}
                </button>
                <button
                  className="btn btn-outline-danger"
                  onClick={() => eliminacion.pedir(registro)}
                  aria-label={`Eliminar ${registro.asunto}`}
                >
                  <i className="fa-solid fa-trash-can" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {detalle && (
        <DetallePqrs
          pqrs={detalle}
          onResponder={(registro) => {
            setDetalleId(null)
            setRespondiendo(registro)
          }}
          onCerrar={() => setDetalleId(null)}
        />
      )}

=======
      {cargando && datos.pqrs.length + datos.comentarios.length === 0 && (
        <Cargando texto="Cargando el buzón…" />
      )}

      {pestana === 'pqrs' && (
        <div className="card border-0 shadow-sm">
          {pqrs.length === 0 && !cargando && <Vacio texto="No hay solicitudes." icono="fa-inbox" />}
          <ul className="list-group list-group-flush">
            {pqrs.map((registro) => (
              <li className="list-group-item d-flex flex-wrap align-items-center gap-3" key={registro.id}>
                <div
                  className="icon-tile icon-tile-sm d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ background: colorDe(registro.tipo) }}
                >
                  <i className={`fa-solid ${iconoDe(registro.tipo)}`} />
                </div>

                <div className="flex-grow-1 min-width-0">
                  <p className="mb-0 fw-semibold text-truncate">{registro.asunto}</p>
                  <small className="text-secondary d-block text-truncate">
                    {registro.tipo} · {registro.nombre || 'sin identificar'} ·{' '}
                    {fechaCorta(registro.fecha)}
                  </small>
                  <small className="d-block recorte-2">{registro.texto}</small>
                </div>

                <span className={`badge bg-${COLOR_ESTADO[registro.estado] ?? 'secondary'} flex-shrink-0`}>
                  {registro.estado}
                </span>
                <span
                  className={`badge flex-shrink-0 ${
                    registro.respuesta ? 'bg-success' : 'bg-warning text-dark'
                  }`}
                >
                  {registro.respuesta ? 'Respondida' : 'Sin responder'}
                </span>

                <div className="btn-group btn-group-sm flex-shrink-0">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setDetalle(registro)}
                    aria-label={`Ver ${registro.asunto}`}
                  >
                    <i className="fa-solid fa-eye" />
                  </button>
                  <button className="btn btn-outline-primary" onClick={() => setRespondiendo(registro)}>
                    <i className="fa-solid fa-reply me-1" />
                    {registro.respuesta ? 'Editar respuesta' : 'Responder'}
                  </button>
                  <button
                    className="btn btn-outline-danger"
                    onClick={() => eliminacion.pedir({ coleccion: 'pqrs', registro })}
                    aria-label={`Eliminar ${registro.asunto}`}
                  >
                    <i className="fa-solid fa-trash-can" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pestana === 'comentarios' && (
        <div className="card border-0 shadow-sm">
          {comentarios.length === 0 && !cargando && (
            <Vacio texto="Todavía no hay comentarios de clientes." icono="fa-comments" />
          )}
          <ul className="list-group list-group-flush">
            {comentarios.map((comentario) => {
              const visible = comentario.visible === true
              return (
                <li
                  className="list-group-item d-flex flex-wrap align-items-center gap-3"
                  key={comentario.id}
                >
                  <div className="flex-grow-1 min-width-0">
                    <p className="mb-0 fw-semibold">
                      {comentario.usuario
                        ? nombrePublico(comentario.nombre ?? comentario.usuario)
                        : 'Visitante sin cuenta'}{' '}
                      {comentario.qr && comentario.estrellas > 0 && (
                        <Estrellas valor={comentario.estrellas} />
                      )}
                    </p>
                    <small className="text-secondary">
                      {fechaCorta(comentario.fecha)}
                      {comentario.qr && (
                        <>
                          {' · '}
                          <i className="fa-solid fa-qrcode me-1" />
                          <code>{comentario.qr}</code> · ticket {comentario.ticket}
                        </>
                      )}
                    </small>
                    <p className="small mb-0">{comentario.texto}</p>
                  </div>

                  <div className="form-check form-switch mb-0 flex-shrink-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id={`visible-${comentario.id}`}
                      checked={visible}
                      onChange={() => alternarVisible(comentario)}
                      disabled={visibilidad.enviando}
                    />
                    <label className="form-check-label small" htmlFor={`visible-${comentario.id}`}>
                      {visible ? 'Visible en el muro' : 'Oculto'}
                    </label>
                  </div>

                  <button
                    className="btn btn-sm btn-outline-danger flex-shrink-0"
                    onClick={() => eliminacion.pedir({ coleccion: 'comentarios', registro: comentario })}
                    aria-label="Eliminar comentario"
                  >
                    <i className="fa-solid fa-trash-can" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {detalle && <DetallePqrs pqrs={detalle} onCerrar={() => setDetalle(null)} />}

>>>>>>> origin/main
      {respondiendo && (
        <ResponderPqrs
          pqrs={respondiendo}
          enviando={respuesta.enviando}
          onGuardar={responder}
          onCerrar={() => setRespondiendo(null)}
        />
      )}

      {eliminacion.objetivo && (
        <ConfirmarEliminacion
<<<<<<< HEAD
          entidad="la solicitud"
          nombre={eliminacion.objetivo.asunto}
          consecuencias={['El cliente dejará de verla en "Mis solicitudes", con su respuesta.']}
          requiereCasilla
=======
          entidad={eliminacion.objetivo.coleccion === 'pqrs' ? 'la solicitud' : 'el comentario de'}
          nombre={
            eliminacion.objetivo.coleccion === 'pqrs'
              ? eliminacion.objetivo.registro.asunto
              : nombrePublico(eliminacion.objetivo.registro.nombre)
          }
          consecuencias={
            eliminacion.objetivo.coleccion === 'pqrs'
              ? ['El cliente dejará de verla en "Mis solicitudes", con su respuesta.']
              : ['Desaparece del muro y no se puede recuperar. Para retirarlo sin borrarlo, ocúltalo.']
          }
          requiereCasilla={eliminacion.objetivo.coleccion === 'pqrs'}
>>>>>>> origin/main
          enviando={eliminacion.enviando}
          error={eliminacion.error}
          onConfirmar={eliminar}
          onCancelar={eliminacion.cancelar}
        />
      )}
    </>
  )
}
