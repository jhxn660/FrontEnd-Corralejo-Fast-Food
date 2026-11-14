import { Navigate, Route, Routes } from 'react-router-dom'

import { RUTAS_PUBLICAS, TODAS_LAS_VISTAS, rutaPorDefecto, vistasDe } from './config/navegacion'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import AccesoDenegado from './components/layout/AccesoDenegado'
import NoEncontrado from './components/layout/NoEncontrado'
import RutaProtegida from './components/layout/RutaProtegida'
import { Cargando } from './components/ui/Estado'
import Login from './modules/autenticacion/Login'
import Register from './modules/autenticacion/Register'

/**
 * Árbol de rutas. No decide qué ve cada rol: eso está en
 * config/navegacion.jsx, y aquí solo se recorre.
 */
export default function App() {
  const { usuario, rol, cargando, cerrarSesion } = useAuth()

  if (cargando) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <Cargando texto="Cargando Corralejo Fast Food…" />
      </div>
    )
  }

  // Defensa: un rol sin menú no tiene a dónde aterrizar.
  if (usuario && vistasDe(rol).length === 0) {
    return (
      <AccesoDenegado
        mensaje="No pudimos verificar tu rol de usuario."
        onCerrarSesion={cerrarSesion}
      />
    )
  }

  const inicio = usuario ? rutaPorDefecto(rol) : '/login'

  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to={inicio} replace /> : <Login />} />
      <Route path="/registro" element={usuario ? <Navigate to={inicio} replace /> : <Register />} />
      <Route path="/" element={<Navigate to={inicio} replace />} />

      {/* Sin RutaProtegida y sin Layout: son las rutas que se abren sin
          sesión, y cada una trae su propio cascarón (RUTAS_PUBLICAS en
          config/navegacion.jsx). */}
      {RUTAS_PUBLICAS.map(({ vista, ruta, elemento }) => (
        <Route key={vista} path={ruta} element={elemento} />
      ))}

      {TODAS_LAS_VISTAS.map(({ vista, ruta, elemento }) => (
        <Route
          key={vista}
          path={ruta}
          element={
            <RutaProtegida vista={vista}>
              <Layout>{elemento}</Layout>
            </RutaProtegida>
          }
        />
      ))}

      <Route path="*" element={<NoEncontrado />} />
    </Routes>
  )
}
