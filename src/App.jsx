import { Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import {
  RUTAS_PUBLICAS,
  TODAS_LAS_VISTAS,
  rutaPorDefecto,
  rutaTrasLogin,
  vistasDe,
} from './config/navegacion'
import { useAuth } from './context/AuthContext'
import AccesoDenegado from './components/layout/AccesoDenegado'
import Layout from './components/layout/Layout'
import NoEncontrado from './components/layout/NoEncontrado'
import RutaProtegida from './components/layout/RutaProtegida'
import { Cargando } from './components/ui/Estado'
import Login from './modules/auth/Login'
import Register from './modules/auth/Register'

const pantallaCargando = (
  <div className="min-vh-100 d-flex align-items-center justify-content-center">
    <Cargando texto="Cargando Corralejo Fast Food…" />
  </div>
)

/**
 * Árbol de rutas. No decide qué ve cada rol: eso está en
 * config/navegacion.jsx, y aquí solo se recorre.
 */
export default function App() {
  const { usuario, rol, cargando, cerrarSesion } = useAuth()
  const location = useLocation()

  if (cargando) return pantallaCargando

  // Defensa: un rol sin menú no tiene a dónde aterrizar.
  if (usuario && vistasDe(rol).length === 0) {
    return (
      <AccesoDenegado
        mensaje="No pudimos verificar tu rol de usuario."
        onCerrarSesion={cerrarSesion}
      />
    )
  }

  // Sin sesión se aterriza en el panel del visitante, no en el login.
  const inicio = rutaPorDefecto(rol)
  // Al entrar desde /login: vuelve a la ruta protegida que se pidió (RutaProtegida la
  // guarda en state.from) si el rol puede verla; si no, a la de inicio del rol.
  const trasLogin = rutaTrasLogin(rol, location.state?.from)

  // Las pantallas llegan bajo demanda (config/navegacion.jsx). Dentro de los
  // paneles las espera el <Suspense> de Layout; este cubre las rutas públicas.
  return (
    <Suspense fallback={pantallaCargando}>
      <Routes>
        <Route path="/login" element={usuario ? <Navigate to={trasLogin} replace /> : <Login />} />
        <Route path="/registro" element={usuario ? <Navigate to={inicio} replace /> : <Register />} />
        <Route path="/" element={<Navigate to={inicio} replace />} />

        {/* Rutas sin sesión: sin RutaProtegida ni Layout (cada una trae su propio cascarón). */}
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
    </Suspense>
  )
}
