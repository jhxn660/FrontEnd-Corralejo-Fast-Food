import { Navigate } from 'react-router-dom'

import { useAuth } from '../../context/AuthContext'
import { puedeVer, rutaPorDefecto } from '../../config/navegacion'
import { Cargando } from '../ui/Estado'

/** Capa 1 del control de acceso (R14): ¿hay sesión? ¿el rol alcanza? */
export default function RutaProtegida({ vista, children }) {
  const { usuario, rol, cargando } = useAuth()

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

  if (!usuario) return <Navigate to="/login" replace />

  if (!puedeVer(rol, vista)) return <Navigate to={rutaPorDefecto(rol)} replace />

  return children
}
