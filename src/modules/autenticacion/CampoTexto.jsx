/**
 * Campo de formulario con su etiqueta, su error y su ayuda (`children`).
 *
 * El error se pinta con las clases de validación de Bootstrap y se enlaza con
 * aria-describedby + aria-invalid: un lector de pantalla anuncia el motivo del
 * rechazo en lugar de dejar al usuario frente a un borde rojo (RNF-02).
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
