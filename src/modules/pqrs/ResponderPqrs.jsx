import { useState } from 'react'

import Modal from '../../components/ui/Modal'
import { fechaCorta } from '../../utils/format'
import { ESTADOS, iconoDe } from './esquema'

const ID_FORMULARIO = 'formulario-respuesta'

/**
 * Respuesta del administrador a una PQRS.
 *
 * "Modificar" una PQRS desde administración es RESPONDERLA: lo que escribió el
 * cliente no se toca (es el registro de lo que pidió); se añade la respuesta
 * del local y se actualiza el estado. El cliente la lee en "Mis solicitudes".
 *
 * El asunto y la descripción se muestran como texto de solo lectura y
 * `onGuardar` solo recibe `respuesta` y `estado`: desde aquí no hay forma de
 * enviar un cambio sobre lo que escribió el cliente.
 */
export default function ResponderPqrs({ pqrs, enviando, onGuardar, onCerrar }) {
  const [respuesta, setRespuesta] = useState(pqrs.respuesta ?? '')
  // Responder suele cerrar el caso: se propone "Resuelto" si aún no lo estaba.
  const [estado, setEstado] = useState(pqrs.respuesta ? pqrs.estado : 'Resuelto')
  const [error, setError] = useState(null)

  const enviar = (evento) => {
    evento.preventDefault()
    if (respuesta.trim().length < 10) {
      setError('Escribe una respuesta de al menos 10 caracteres.')
      return
    }
    onGuardar({ respuesta: respuesta.trim(), estado })
  }

  return (
    <Modal
      titulo={pqrs.respuesta ? 'Editar respuesta' : 'Responder solicitud'}
      icono="fa-reply"
      tamano="modal-lg"
      cerrarAlPulsarFuera={false}
      onClose={onCerrar}
      footer={
        <>
          <button className="btn btn-outline-secondary" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </button>
          <button className="btn btn-primary" form={ID_FORMULARIO} type="submit" disabled={enviando}>
            <i className="fa-solid fa-paper-plane me-2" />
            {enviando ? 'Enviando…' : 'Enviar respuesta'}
          </button>
        </>
      }
    >
      {/* Lo que envió el cliente: texto, no campos de formulario. El
          administrador lo lee para responder, pero no puede cambiarlo. */}
      <section className="modal-resumen mb-4" aria-label="Solicitud del cliente">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <small className="text-secondary">
            <i className={`fa-solid ${iconoDe(pqrs.tipo)} me-1`} />
            {pqrs.tipo} de {pqrs.nombre || 'un cliente'} · {fechaCorta(pqrs.fecha)}
          </small>
          <span className="badge bg-secondary">
            <i className="fa-solid fa-lock me-1" />
            Enviado por el cliente · solo lectura
          </span>
        </div>

        <h3 className="h6 fw-bold text-uppercase text-secondary mb-1">Asunto</h3>
        <p className="fw-semibold mb-3">{pqrs.asunto}</p>

        <h3 className="h6 fw-bold text-uppercase text-secondary mb-1">Descripción</h3>
        <p className="small mb-0" style={{ whiteSpace: 'pre-line' }}>
          {pqrs.texto}
        </p>
      </section>

      <form id={ID_FORMULARIO} onSubmit={enviar} noValidate className="d-grid gap-3">
        <div>
          <label className="form-label" htmlFor="pqrs-respuesta">
            Respuesta del restaurante
          </label>
          <textarea
            id="pqrs-respuesta"
            className={`form-control ${error ? 'is-invalid' : ''}`}
            rows="5"
            maxLength={1000}
            placeholder="Explica qué se hizo o qué se va a hacer con la solicitud."
            value={respuesta}
            onChange={(evento) => {
              setRespuesta(evento.target.value)
              setError(null)
            }}
            aria-invalid={Boolean(error)}
            disabled={enviando}
          />
          {error && (
            <div className="invalid-feedback d-block" role="alert">
              {error}
            </div>
          )}
        </div>

        <div>
          <label className="form-label" htmlFor="pqrs-estado-respuesta">
            Estado de la solicitud
          </label>
          <select
            id="pqrs-estado-respuesta"
            className="form-select"
            value={estado}
            onChange={(evento) => setEstado(evento.target.value)}
            disabled={enviando}
          >
            {ESTADOS.map((opcion) => (
              <option key={opcion}>{opcion}</option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  )
}
