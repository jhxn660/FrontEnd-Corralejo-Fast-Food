/**
 * Campo de formulario con etiqueta, error y ayuda (`children`). El error se enlaza con
 * aria-describedby y aria-invalid para que un lector de pantalla lo anuncie (RNF-02).
 */
export default function CampoTexto({ id, etiqueta, error, children, ...props }) {
  const idError = `${id}-error`
  const idAyuda = `${id}-ayuda`
  const descriptores = [error ? idError : null, children ? idAyuda : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div>
      <label className="form-label fw-semibold" htmlFor={id}>
        {etiqueta}
      </label>
      <input
        id={id}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={descriptores || undefined}
        {...props}
      />
      {error && (
        <div className="invalid-feedback d-block" id={idError} role="alert">
          {error}
        </div>
      )}
      {children && (
        <div className="form-text" id={idAyuda}>
          {children}
        </div>
      )}
    </div>
  )
}
