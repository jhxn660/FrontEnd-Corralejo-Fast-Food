import { useState } from 'react'

import Modal from '../../components/ui/Modal'
import { moneda } from '../../utils/format'

/** Cambio de la meta anual de ventas. Es el único dato del panel que se escribe. */
export default function FormularioMeta({ meta, vendido, enviando, onGuardar, onCerrar }) {
  const [valor, setValor] = useState(String(meta))
  const [error, setError] = useState(null)

  const numero = Math.trunc(Number(valor) || 0)
  const avance = numero > 0 ? Math.min(100, Math.round((vendido / numero) * 1000) / 10) : 0

  const enviar = (evento) => {
    evento.preventDefault()
    if (numero < 1000000) {
      setError('La meta debe ser de al menos $1.000.000.')
      return
    }
    onGuardar(numero)
  }

  return (
    <Modal
      titulo="Meta anual de ventas"
      icono="fa-bullseye"
      descripcion="El avance se calcula con las ventas registradas en el año."
      cerrarAlPulsarFuera={false}
      onClose={onCerrar}
      footer={
        <>
          <button className="btn btn-outline-secondary" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </button>
          <button className="btn btn-primary" form="formulario-meta" type="submit" disabled={enviando}>
            <i className="fa-solid fa-floppy-disk me-2" />
            {enviando ? 'Guardando…' : 'Guardar meta'}
          </button>
        </>
      }
    >
      <form id="formulario-meta" onSubmit={enviar} noValidate>
        <label className="form-label" htmlFor="meta-anual">
          Meta (COP)
        </label>
        <input
          id="meta-anual"
          type="number"
          min="0"
          step="1000000"
          className={`form-control form-control-lg ${error ? 'is-invalid' : ''}`}
          value={valor}
          onChange={(evento) => {
            setValor(evento.target.value)
            setError(null)
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'meta-error' : 'meta-ayuda'}
          disabled={enviando}
        />
        {error ? (
          <div className="invalid-feedback d-block" id="meta-error" role="alert">
            {error}
          </div>
        ) : (
          <div className="form-text" id="meta-ayuda">
            {moneda(numero)} · con lo vendido este año ({moneda(vendido)}) el avance sería del{' '}
            <strong>{avance}%</strong>.
          </div>
        )}
      </form>
    </Modal>
  )
}
