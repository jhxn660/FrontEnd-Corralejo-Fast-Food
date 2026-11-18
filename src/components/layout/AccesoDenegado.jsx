/** Pantalla mostrada cuando la sesión no tiene un rol con panel propio. */
export default function AccesoDenegado({ mensaje, onCerrarSesion }) {
  return (
    <div className="bg-carbon text-white min-vh-100 d-flex flex-column justify-content-center align-items-center text-center gap-3 p-4">
      <i className="fa-solid fa-lock fs-1 text-brand" />
      <h1 className="h3 mb-0">Acceso denegado</h1>
      <p className="text-secondary mb-2" style={{ maxWidth: '26rem' }}>
        {mensaje}
      </p>
      <button className="btn btn-outline-primary" onClick={onCerrarSesion}>
        Cerrar sesión
      </button>
    </div>
  )
}
