import { useState } from 'react'

import { moneda, numero } from '../../utils/format'
import Modal from '../../components/ui/Modal'

/**
 * Confirmación de las acciones destructivas sobre un pedido: cancelarlo,
 * eliminarlo junto con su venta o reabrirlo (lo que invalida la venta).
 *
 * DOS COSAS QUE ESTABAN MAL
 * 1. El modal se cerraba siempre. `confirmar()` llamaba a `onCancelar()` en el
 *    `finally`, así que un borrado que fallaba cerraba el modal igual y dejaba
 *    al empleado creyendo que el pedido se había eliminado (R60). Ahora la
 *    acción dice si funcionó y el modal solo se cierra cuando funcionó.
 * 2. No se veía lo que se iba a borrar: solo una frase y tres etiquetas
 *    sueltas. Ahora se listan las líneas del pedido con su total, que es lo que
 *    permite darse cuenta de que es el pedido equivocado antes de pulsar.
 */
export default function ConfirmarAccion({ config, pedido, numeroPedido, onCancelar }) {
  const [entendido, setEntendido] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [fallo, setFallo] = useState(null)

  const items = pedido.items ?? []
  const unidades = items.reduce((suma, item) => suma + (Number(item.qty) || 0), 0)
  const total = items.reduce(
    (suma, item) => suma + (Number(item.price) || 0) * (Number(item.qty) || 0),
    0
  )

  const esReapertura = config.tipo === 'reabrir'

  const confirmar = async () => {
    setProcesando(true)
    setFallo(null)
    try {
      const ok = await config.onConfirmar()
      if (ok === false) {
        setFallo('La acción no se pudo completar. El pedido sigue como estaba.')
        return
      }
      onCancelar()
    } catch (err) {
      setFallo(err?.message ?? 'La acción no se pudo completar.')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <Modal
      titulo={config.titulo}
      icono={esReapertura ? 'fa-rotate-left' : 'fa-trash-can'}
      tono={esReapertura ? '' : 'peligro'}
      cerrarAlPulsarFuera={false}
      onClose={procesando ? () => {} : onCancelar}
      footer={
        <>
          <button className="btn btn-outline-secondary" onClick={onCancelar} disabled={procesando}>
            Volver
          </button>
          <button
            className={`btn btn-${esReapertura ? 'primary' : 'danger'}`}
            onClick={confirmar}
            disabled={procesando || (config.requiereCheck && !entendido)}
          >
            {procesando ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Procesando…
              </>
            ) : (
              config.textoConfirmar
            )}
          </button>
        </>
      }
    >
      <p>{config.mensaje}</p>

      <div className="modal-resumen mb-3">
        <div className="d-flex flex-wrap gap-2 mb-2">
          <span className="badge bg-brand">Pedido #{numeroPedido}</span>
          {pedido.hora && <span className="badge bg-secondary">{pedido.hora}</span>}
          <span className="badge bg-secondary">{numero(unidades)} producto(s)</span>
          <span className="badge bg-dark">{moneda(total)}</span>
        </div>

        {items.length === 0 ? (
          <p className="small text-secondary mb-0">Este pedido no tiene productos.</p>
        ) : (
          <ul className="list-unstyled small mb-0">
            {items.map((item) => (
              <li className="d-flex justify-content-between" key={item.name}>
                <span>
                  {item.qty} × {item.name}
                </span>
                <span className="fw-semibold">
                  {moneda((Number(item.price) || 0) * (Number(item.qty) || 0))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {config.avisoVenta && (
        <div className="alert alert-warning py-2 small">
          <i className="fa-solid fa-triangle-exclamation me-2" />
          También se eliminará la <strong>venta asociada</strong> en Gestión de Ventas, con su
          ticket y su código QR.
        </div>
      )}

      {config.requiereCheck && (
        <div className="form-check">
          <input
            id="confirmar-entendido"
            type="checkbox"
            className="form-check-input"
            checked={entendido}
            disabled={procesando}
            onChange={(evento) => setEntendido(evento.target.checked)}
          />
          <label className="form-check-label" htmlFor="confirmar-entendido">
            Entiendo que esta acción no se puede deshacer
          </label>
        </div>
      )}

      {/* Un fallo deja el modal abierto con el motivo: cerrarlo haría creer que
          la acción se completó. */}
      {fallo && (
        <div className="alert alert-danger mt-3 mb-0" role="alert">
          {fallo}
        </div>
      )}
    </Modal>
  )
}
