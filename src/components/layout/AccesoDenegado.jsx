<<<<<<< HEAD
/** Pantalla mostrada cuando la sesión no tiene un rol con panel propio. */
export default function AccesoDenegado({ mensaje, onCerrarSesion }) {
=======
/** Pantalla mostrada cuando el rol no alcanza para la vista solicitada. */
export default function AccesoDenegado({ mensaje, onIrAPanel, onCerrarSesion }) {
>>>>>>> origin/main
  return (
    <div className="bg-carbon text-white min-vh-100 d-flex flex-column justify-content-center align-items-center text-center gap-3 p-4">
      <i className="fa-solid fa-lock fs-1 text-brand" />
      <h1 className="h3 mb-0">Acceso denegado</h1>
      <p className="text-secondary mb-2" style={{ maxWidth: '26rem' }}>
        {mensaje}
      </p>
<<<<<<< HEAD
      <button className="btn btn-outline-primary" onClick={onCerrarSesion}>
        Cerrar sesión
      </button>
=======
      <div className="d-flex flex-wrap gap-2 justify-content-center">
        {onIrAPanel && (
          <button className="btn btn-primary" onClick={onIrAPanel}>
            Ir a mi panel
          </button>
        )}
        <button className="btn btn-outline-primary" onClick={onCerrarSesion}>
          Cerrar sesión
        </button>
      </div>
>>>>>>> origin/main
    </div>
  )
}
