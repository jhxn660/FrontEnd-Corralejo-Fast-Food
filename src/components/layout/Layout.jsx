import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import logo from '../../assets/logo.png'
import { MENU } from '../../config/navegacion'
import { TITULO_PANEL } from '../../config/roles'
import { useAuth } from '../../context/AuthContext'
import { useAvisos } from '../../context/AvisosContext'
import LimiteDeError from './LimiteDeError'

/** Cascarón común a los tres paneles: header, menú lateral y área de contenido. */
export default function Layout({ children }) {
  const { rol, cerrarSesion } = useAuth()
  const avisos = useAvisos()
  const { pathname } = useLocation()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const opciones = MENU[rol] ?? []

  // El aviso vive en AvisosProvider, por encima del router: sobrevive a la
  // redirección al login, así que se ve en la pantalla de entrada.
  const salir = async () => {
    const { error } = await cerrarSesion()
    if (error) avisos.error('No se pudo cerrar la sesión', 'Inténtalo de nuevo.')
    else avisos.informacion('Sesión cerrada', 'Hasta pronto. Vuelve a entrar cuando quieras.')
  }

  // Capa 2 del control de acceso (R14): solo se dibuja el menú del rol activo.
  const navegacion = (
    <ul className="nav nav-panel flex-column gap-1">
      {opciones.map(({ vista, ruta, titulo, icono }) => (
        <li className="nav-item" key={vista}>
          <NavLink
            to={ruta}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMenuAbierto(false)}
          >
            <i className={`fa-solid ${icono} me-2`} />
            {titulo}
          </NavLink>
        </li>
      ))}
    </ul>
  )

  return (
    <>
      <header className="app-header d-flex align-items-center px-3 px-lg-4 gap-3">
        <img src={logo} alt="" width="44" height="44" className="object-fit-contain" />
        <h1 className="h5 text-white mb-0 me-auto">
          Corralejo <span className="text-brand">Fast Food</span>
          <small className="d-block d-sm-inline text-secondary ms-sm-2 fs-6 text-capitalize">
            {rol}
          </small>
        </h1>

        <button
          className="btn btn-outline-light btn-sm d-lg-none"
          aria-label="Abrir menú"
          onClick={() => setMenuAbierto((abierto) => !abierto)}
        >
          <i className="fa-solid fa-bars" />
        </button>

        <button className="btn btn-outline-light btn-sm" onClick={salir}>
          <i className="fa-solid fa-right-from-bracket" />
          <span className="d-none d-sm-inline ms-2">Salir</span>
        </button>
      </header>

      <div className="container-fluid px-3 px-lg-4 py-4">
        <div className="d-flex gap-4 align-items-start">
          <aside className={`app-sidebar ${menuAbierto ? '' : 'd-none d-lg-block'}`}>
            <div className="app-sidebar-inner card border-0 shadow-sm p-3">
              <h2 className="h6 text-secondary text-uppercase mb-3">{TITULO_PANEL[rol]}</h2>
              {navegacion}
            </div>
          </aside>

          {/* El límite rodea solo el contenido: si una pantalla falla, el
              header y el menú siguen en pie y hay por dónde salir. */}
          <main className="flex-grow-1 min-width-0">
            <LimiteDeError clave={pathname}>{children}</LimiteDeError>
          </main>
        </div>
      </div>
    </>
  )
}
