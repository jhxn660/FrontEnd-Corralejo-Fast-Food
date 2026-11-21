import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { puedeVer, rutaPorDefecto } from '../../config/navegacion'
import { Cargando } from '../ui/Estado'

/** Capa 1 del control de acceso (R14): ¿hay sesión? ¿el rol alcanza? */
export default function RutaProtegida({ vista, children }) {
  const { usuario, rol, cargando } = useAuth()
  const { pathname } = useLocation()

  // Este orden importa (R15): mientras la sesión se resuelve, 'usuario' aún es
  // null. Comprobar primero el usuario expulsaría a alguien legítimo que acaba
  // de recargar la página.
  if (cargando) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <Cargando texto="Cargando sesión…" />
      </div>
    )
  }

  // Sin sesión el rol es 'usuario' (visitante). Si la vista está en su menú se
  // muestra; si no (PQRS, paneles de personal, o el token venció con un 401), se
  // pide iniciar sesión recordando la ruta para volver a ella después.
  if (!usuario) {
    return puedeVer(rol, vista) ? children : <Navigate to="/login" state={{ from: pathname }} replace />
  }

  // Con sesión pero sin permiso para esta vista: a la ruta de inicio de su rol.
  if (!puedeVer(rol, vista)) return <Navigate to={rutaPorDefecto(rol)} replace />

  return children
}
