import fondo from '../../assets/login-bg.png'
import logo from '../../assets/logo.png'

/** Marco compartido por Login y Register: fondo, logo y tarjeta centrada. */
export default function FormularioAuth({
  titulo,
  onSubmit,
  children,
  accion,
  accionDeshabilitada = false,
  pie,
}) {
  return (
    <div
      className="auth-screen position-relative d-flex align-items-center justify-content-center p-3"
      style={{ backgroundImage: `url(${fondo})` }}
    >
      <div className="card border-0 shadow-lg position-relative w-100" style={{ maxWidth: '26rem' }}>
        <div className="card-body p-4 p-sm-5">
          <div className="text-center mb-4">
            <div className="logo-circle d-inline-flex align-items-center justify-content-center mb-3">
              <img src={logo} alt="Corralejo Fast Food" width="44" height="44" />
            </div>
            <h1 className="h4 fw-bold mb-1">{titulo}</h1>
            <p className="text-secondary mb-0">
              Corralejo <span className="text-brand fw-semibold">Fast Food</span>
            </p>
          </div>

          {/* noValidate: la validación la hace validaciones.js, que da mensajes
              propios en lugar de los globos del navegador, distintos en cada uno. */}
          <form onSubmit={onSubmit} className="d-grid gap-3" noValidate>
            {children}
            <button
              type="submit"
              className="btn btn-primary w-100 fw-semibold"
              disabled={accionDeshabilitada}
            >
              {accion}
            </button>
          </form>

          <p className="text-center small text-secondary mt-4 mb-0">{pie}</p>
        </div>
      </div>
    </div>
  )
}
