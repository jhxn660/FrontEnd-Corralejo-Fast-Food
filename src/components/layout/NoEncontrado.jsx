import { Link } from 'react-router-dom'

import { rutaPorDefecto } from '../../config/navegacion'
import { useAuth } from '../../context/AuthContext'

/** Ruta comodín: una URL desconocida nunca deja la pantalla en blanco. */
export default function NoEncontrado() {
  const { usuario, rol } = useAuth()

  return (
    <div className="bg-carbon text-white min-vh-100 d-flex flex-column justify-content-center align-items-center text-center gap-3 p-4">
      <i className="fa-solid fa-compass fs-1 text-brand" />
      <h1 className="h3 mb-0">Página no encontrada</h1>
      <p className="text-secondary mb-2" style={{ maxWidth: '26rem' }}>
        La dirección que escribiste no corresponde a ninguna pantalla de Corralejo Fast Food.
      </p>
      <div className="d-flex flex-wrap justify-content-center gap-2">
        <Link className="btn btn-primary" to={rutaPorDefecto(rol)}>
          {usuario ? 'Ir a mi panel' : 'Ir al inicio'}
        </Link>
        {!usuario && (
          <Link className="btn btn-outline-light" to="/login">
            Iniciar sesión
          </Link>
        )}
      </div>
    </div>
  )
}
