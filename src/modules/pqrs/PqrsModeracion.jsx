import { useCallback, useMemo, useState } from 'react'

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
        await recargar()
      },
      [recargar]
    )
  )

  const eliminacion = useConfirmacion((registro) => pqrsApi.eliminar(registro.id), { alTerminar: recargar })

  const responder = async (cambios) => {
    const { ok, error: fallo } = await respuesta.ejecutar(respondiendo, cambios)
    if (!ok) {
      avisos.fallo('No se pudo enviar la respuesta', fallo)
      return
    }
    avisos.exito('Respuesta enviada', `El cliente ya puede leerla en "${respondiendo.asunto}".`)
    setRespondiendo(null)
  }

  const eliminar = async () => {
    if (await eliminacion.confirmar()) avisos.error('Solicitud eliminada', 'Se borró del buzón.')
  }

  const sinResponder = todas.filter((registro) => !registro.respuesta).length

  return (
    <>
      <EncabezadoPagina
        titulo="Moderación de PQRS"
        descripcion="Responde o elimina las peticiones, quejas, reclamos y sugerencias de los clientes."
      >
        <button className="btn btn-outline-secondary" onClick={recargar} disabled={cargando}>
          <i className="fa-solid fa-rotate me-2" />
          Actualizar
        </button>
      </EncabezadoPagina>

      <MensajeError texto={error} onReintentar={recargar} />

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body d-flex flex-wrap align-items-center gap-3">
          <span className="badge bg-dark">
            <i className="fa-solid fa-inbox me-1" />
            {sinResponder} sin responder
          </span>
          <input
            className="form-control ms-auto"
            style={{ maxWidth: '22rem' }}
            placeholder="Buscar por nombre o contenido…"
            aria-label="Buscar PQRS"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
        </div>
      </div>

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
          entidad="la solicitud"
          nombre={eliminacion.objetivo.asunto}
          consecuencias={['El cliente dejará de verla en "Mis solicitudes", con su respuesta.']}
          requiereCasilla
          enviando={eliminacion.enviando}
          error={eliminacion.error}
          onConfirmar={eliminar}
          onCancelar={eliminacion.cancelar}
        />
      )}
    </>
  )
}
