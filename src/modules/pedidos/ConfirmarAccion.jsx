import { useState } from 'react'

import { moneda, numero } from '../../utils/format'
import Modal from '../../components/ui/Modal'

/**
 * Reemplaza a window.confirm para las acciones destructivas sobre un pedido.
 * Cuando la acción también borra la venta asociada se pide marcar una casilla.
 */
export default function ConfirmarAccion({ config, pedido, numeroPedido, onCancelar }) {
  const [entendido, setEntendido] = useState(false)
  const [procesando, setProcesando] = useState(false)

  const items = pedido.items ?? []
  const unidades = items.reduce((suma, item) => suma + (Number(item.qty) || 0), 0)
  const total = items.reduce(
    (suma, item) => suma + (Number(item.price) || 0) * (Number(item.qty) || 0),
    0
  )

  const confirmar = async () => {
    setProcesando(true)
    try {
      await config.onConfirmar()
    } finally {
      setProcesando(false)
      onCancelar()
    }
  }

  return (
    <Modal
      titulo={config.titulo}
      icono={config.tipo === 'reabrir' ? 'fa-rotate-left' : 'fa-trash'}
      onClose={procesando ? () => {} : onCancelar}
      footer={
        <>
          <button className="btn btn-outline-secondary" onClick={onCancelar} disabled={procesando}>
            Volver
          </button>
          <button
            className="btn btn-danger"
            onClick={confirmar}
            disabled={procesando || (config.requiereCheck && !entendido)}
          >
            {procesando ? 'Procesando…' : config.textoConfirmar}
          </button>
        </>
      }
    >
      <p>{config.mensaje}</p>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <span className="badge bg-brand">Pedido #{numeroPedido}</span>
        {pedido.hora && <span className="badge bg-secondary">{pedido.hora}</span>}
        <span className="badge bg-secondary">{numero(unidades)} producto(s)</span>
        <span className="badge bg-dark">{moneda(total)}</span>
      </div>

      {config.avisoVenta && (
        <div className="alert alert-warning py-2 small">
          También se eliminará la <strong>venta asociada</strong> en Gestión de Ventas.
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
            onChange={(e) => setEntendido(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="confirmar-entendido">
            Entiendo que esta acción no se puede deshacer
          </label>
        </div>
      )}
    </Modal>
  )
}
