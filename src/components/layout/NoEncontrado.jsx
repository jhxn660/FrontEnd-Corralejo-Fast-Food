import { Link } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { rutaPorDefecto } from '../../config/navegacion'

/** Ruta comodín (R12): una URL desconocida nunca deja la pantalla en blanco. */
export default function NoEncontrado() {
  const { usuario, rol } = useAuth()

  return (
    <div className="bg-carbon text-white min-vh-100 d-flex flex-column justify-content-center align-items-center text-center gap-3 p-4">
      <i className="fa-solid fa-compass fs-1 text-brand" />
      <h1 className="h3 mb-0">Página no encontrada</h1>
      <p className="text-secondary mb-2" style={{ maxWidth: '26rem' }}>
        La dirección que escribiste no corresponde a ninguna pantalla de Corralejo Fast Food.
      </p>
      {usuario ? (
        <Link className="btn btn-primary" to={rutaPorDefecto(rol)}>
          Ir a mi panel
        </Link>
      ) : (
        <Link className="btn btn-primary" to="/login">
          Ir a iniciar sesión
        </Link>
      )}
    </div>
  )
}
