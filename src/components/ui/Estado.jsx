/**
 * Mensajes de carga, error y lista vacía, con el mismo aspecto en toda la app.
 *
 * El mensaje de error se llama `MensajeError` y no `Error`: exportar `Error`
 * tapaba el constructor global en cada archivo que lo importaba, y donde se
 * escribía `new Error('…')` se construía el componente de React en su lugar. El
 * resultado era un objeto sin `message`, así que el modal de borrado mostraba
 * un texto genérico en vez del motivo real del fallo.
 */

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="text-center text-secondary py-5">
      <div className="spinner-border text-brand mb-2" role="status" />
      <p className="mb-0">{texto}</p>
    </div>
  )
}

export function MensajeError({ texto, onReintentar }) {
  if (!texto) return null
  return (
    <div
      className="alert alert-danger d-flex align-items-center justify-content-between gap-3"
      role="alert"
    >
      <span>
        <i className="fa-solid fa-triangle-exclamation me-2" />
        {texto}
      </span>
      {onReintentar && (
        <button className="btn btn-sm btn-danger flex-shrink-0" onClick={onReintentar}>
          <i className="fa-solid fa-rotate me-2" />
          Reintentar
        </button>
      )}
    </div>
  )
}

export function Vacio({ texto, icono = 'fa-inbox', children }) {
  return (
    <div className="text-center text-secondary py-5 w-100">
      <i className={`fa-solid ${icono} fs-1 opacity-25 d-block mb-3`} />
      <p className="mb-0">{texto}</p>
      {children && <div className="mt-3 d-flex justify-content-center gap-2">{children}</div>}
    </div>
  )
}
