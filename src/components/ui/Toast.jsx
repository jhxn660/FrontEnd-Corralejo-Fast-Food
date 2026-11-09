import { createPortal } from 'react-dom'

/** Aviso flotante que el componente padre cierra por temporizador. */
export default function Toast({ tipo = 'success', titulo, mensaje, onClose }) {
  return createPortal(
    <div className={`toast-fixed alert alert-${tipo} shadow d-flex gap-3 align-items-start`} role="status">
      <i className={`fa-solid ${tipo === 'danger' ? 'fa-trash' : 'fa-check'} mt-1`} />
      <div className="flex-grow-1">
        <strong className="d-block">{titulo}</strong>
        <span className="small">{mensaje}</span>
      </div>
      <button className="btn-close" aria-label="Cerrar" onClick={onClose} />
    </div>,
    document.body
  )
}
