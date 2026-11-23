import { useEffect, useRef, useState } from 'react'

import Modal from './Modal'

/**
 * Confirmación obligatoria antes de cualquier DELETE (RNF-01).
 *
 * Sustituye a window.confirm, que el navegador puede suprimir, no se puede
 * estilar, no dice QUÉ se está borrando y en algunos navegadores se salta con
 * "no volver a preguntar".
 *
 * Cuatro garantías:
 *   1. Bloquea la interacción: Modal monta un backdrop sobre todo el DOM.
 *   2. Nombra el registro concreto y sus consecuencias.
 *   3. El botón destructivo nunca es el foco inicial ni el de Enter.
 *   4. Mientras se envía no se puede cerrar ni pulsar dos veces.
 *
 * `requiereCasilla` se reserva para los borrados en cascada (una venta que
 * arrastra su pedido): un clic de más es fácil, marcar una casilla a propósito
 * no lo es.
 */
export default function ConfirmarEliminacion({
  entidad,
  nombre,
  consecuencias = [],
  requiereCasilla = false,
  textoCasilla = 'Entiendo que esta acción no se puede deshacer.',
  enviando = false,
  error = null,
  onConfirmar,
  onCancelar,
}) {
  const [aceptado, setAceptado] = useState(false)
  const botonCancelar = useRef(null)

  // El foco arranca en Cancelar: así un Enter reflejo cancela en vez de borrar.
  useEffect(() => {
    botonCancelar.current?.focus()
  }, [])

  const bloqueado = enviando || (requiereCasilla && !aceptado)

  return (
    <Modal
      titulo={`Eliminar ${entidad}`}
      icono="fa-triangle-exclamation"
      onClose={enviando ? () => {} : onCancelar}
      footer={
        <>
          <button
            ref={botonCancelar}
            type="button"
            className="btn btn-outline-secondary"
            onClick={onCancelar}
            disabled={enviando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirmar}
            disabled={bloqueado}
          >
            {enviando ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Eliminando…
              </>
            ) : (
              <>
                <i className="fa-solid fa-trash-can me-2" />
                Eliminar
              </>
            )}
          </button>
        </>
      }
    >
      <p className="mb-2">
        Se eliminará {entidad} <strong>{nombre}</strong>.
      </p>

      {consecuencias.length > 0 && (
        <ul className="text-secondary small">
          {consecuencias.map((consecuencia) => (
            <li key={consecuencia}>{consecuencia}</li>
          ))}
        </ul>
      )}

      {requiereCasilla && (
        <div className="form-check mt-3">
          <input
            className="form-check-input"
            type="checkbox"
            id="confirmar-eliminacion"
            checked={aceptado}
            onChange={(evento) => setAceptado(evento.target.checked)}
            disabled={enviando}
          />
          <label className="form-check-label" htmlFor="confirmar-eliminacion">
            {textoCasilla}
          </label>
        </div>
      )}

      {error && (
        <div className="alert alert-danger mt-3 mb-0" role="alert">
          {error.message ?? 'No se pudo eliminar.'}
        </div>
      )}
    </Modal>
  )
}
