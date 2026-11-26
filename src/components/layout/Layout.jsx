<<<<<<< HEAD
import { Fragment, Suspense, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { MENU } from '../../config/navegacion'
import { ROLES, ROLES_VITRINA, TITULO_PANEL, tieneNivel } from '../../config/roles.config'
import { useAuth } from '../../context/AuthContext'
import { useAvisos } from '../../context/AvisosContext'
import logo from '../../assets/logo.png'
import { Cargando } from '../ui/Estado'
import InformacionCasa from '../../modules/establecimiento/InformacionCasa'
import ListaTop from '../../modules/establecimiento/ListaTop'

import LimiteDeError from './LimiteDeError'

// Ancla del bloque de opiniones (OpinionesClientes) en la portada de cada panel.
const ANCLA_OPINIONES = 'muro-comentarios'
const MODULOS_PORTADA = ['establecimiento']

/**
 * Cascarón común a todos los paneles: cabecera, menú lateral y contenido.
 *
 * `cff-aero` (la estética translúcida de theme.css) solo se añade para cliente y visitante:
 * en las tablas y formularios densos del personal el efecto cristal resta legibilidad.
 */
export default function Layout({ children }) {
  const { usuario, rol, cerrarSesion } = useAuth()
  const avisos = useAvisos()
  const { pathname } = useLocation()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [verInformacion, setVerInformacion] = useState(false)
  const opciones = MENU[rol] ?? []

  // Destino del bocadillo de la Lista Top: la portada del rol.
  // Un rol sin portada (empleado) no recibe el enlace a comentarios.
  const portada = opciones.find((item) => MODULOS_PORTADA.includes(item.modulo))?.ruta
  const rutaComentarios = portada ? `${portada}#${ANCLA_OPINIONES}` : null

  // Lista Top (marcado en config/navegacion.jsx):
  // - `listaTop`: Layout la pone encima de la pantalla.
  // - `listaTopEnPagina`: la pantalla la coloca ella misma.
  // Las pantallas de gestión no la llevan.
  const vistaActual = opciones.find((item) => item.ruta === pathname)
  const listaTopArriba = vistaActual?.listaTop === true

  // "Ver nuestro menú" solo en la Lista Top de Inicio (la portada del rol).
  const rutaMenu = opciones.find((item) => item.modulo === 'products')?.ruta ?? null
  const enPortada = MODULOS_PORTADA.includes(vistaActual?.modulo)

  const abrirInformacion = () => {
    setVerInformacion(true)
    setMenuAbierto(false)
  }

=======
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

import logo from '../../assets/logo.png'
import { MENU } from '../../config/navegacion'
import { TITULO_PANEL } from '../../config/roles'
import { useAuth } from '../../context/AuthContext'
import { useAvisos } from '../../context/AvisosContext'
import LimiteDeError from './LimiteDeError'

/**
 * Cascarón común a los tres paneles: header, menú lateral y área de contenido.
 *
 * `cff-aero` solo se añade para el cliente: es la estética translúcida de
 * theme.css. El administrador y el empleado trabajan con tablas y formularios
 * densos, donde el cristal resta legibilidad; el cliente viene a mirar.
 */
export default function Layout({ children }) {
  const { rol, cerrarSesion } = useAuth()
  const avisos = useAvisos()
  const { pathname } = useLocation()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const opciones = MENU[rol] ?? []

>>>>>>> origin/main
  // El aviso vive en AvisosProvider, por encima del router: sobrevive a la
  // redirección al login, así que se ve en la pantalla de entrada.
  const salir = async () => {
    const { error } = await cerrarSesion()
    if (error) avisos.error('No se pudo cerrar la sesión', 'Inténtalo de nuevo.')
    else avisos.informacion('Sesión cerrada', 'Hasta pronto. Vuelve a entrar cuando quieras.')
  }

<<<<<<< HEAD
  // "Información" es un botón más del menú. No navega: abre el modal
  // institucional. Su sitio depende del rol:
  // - Admin y Owner: "Gestión de Información", justo después de Establecimiento.
  // - Empleado: al final, detrás de sus pantallas de trabajo.
  // - Visitante y Cliente: justo después de "Menú" (el tercero).
  const esAdministracion = tieneNivel(rol, ROLES.ADMIN)
  const informacionAlFinal = rol === ROLES.EMPLOYEE
  const informacionTras = esAdministracion ? 'establecimiento' : 'products'
  const botonInformacion = (
    <li className="nav-item">
      <button type="button" className="nav-link" onClick={abrirInformacion}>
        <i className="fa-solid fa-circle-info me-2" />
        {esAdministracion ? 'Gestión de Información' : 'Información'}
      </button>
    </li>
  )

  // Capa 2 del control de acceso: solo se dibuja el menú del rol activo.
  const navegacion = (
    <ul className="nav nav-panel flex-column gap-1">
      {opciones.map(({ vista, ruta, etiqueta, icono, modulo }) => (
        <Fragment key={vista}>
          <li className="nav-item">
            <NavLink
              to={ruta}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMenuAbierto(false)}
            >
              <i className={`fa-solid ${icono} me-2`} />
              {etiqueta}
            </NavLink>
          </li>
          {!informacionAlFinal && modulo === informacionTras && botonInformacion}
        </Fragment>
      ))}
      {informacionAlFinal && botonInformacion}
=======
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
>>>>>>> origin/main
    </ul>
  )

  return (
<<<<<<< HEAD
    <div className={ROLES_VITRINA.includes(rol) ? 'cff-aero' : undefined}>
      <header className="app-header d-flex align-items-center px-3 px-lg-4 gap-3">
        <img src={logo} alt="" width="34" height="34" className="object-fit-contain" />
=======
    <div className={rol === 'cliente' ? 'cff-aero' : undefined}>
      <header className="app-header d-flex align-items-center px-3 px-lg-4 gap-3">
        <img src={logo} alt="" width="44" height="44" className="object-fit-contain" />
>>>>>>> origin/main
        <h1 className="h5 text-white mb-0 me-auto">
          Corralejo <span className="text-brand">Fast Food</span>
          <small className="d-block d-sm-inline text-secondary ms-sm-2 fs-6 text-capitalize">
            {rol}
          </small>
        </h1>

        <button
          className="btn btn-outline-light btn-sm d-lg-none"
<<<<<<< HEAD
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuAbierto}
=======
          aria-label="Abrir menú"
>>>>>>> origin/main
          onClick={() => setMenuAbierto((abierto) => !abierto)}
        >
          <i className="fa-solid fa-bars" />
        </button>

<<<<<<< HEAD
        {/* El visitante no tiene sesión que cerrar: se le ofrece entrar. */}
        {usuario ? (
          <button className="btn btn-outline-light btn-sm" onClick={salir}>
            <i className="fa-solid fa-right-from-bracket" />
            <span className="d-none d-sm-inline ms-2">Salir</span>
          </button>
        ) : (
          <Link className="btn btn-outline-light btn-sm" to="/login">
            <i className="fa-solid fa-right-to-bracket" />
            <span className="d-none d-sm-inline ms-2">Iniciar sesión</span>
          </Link>
        )}
=======
        <button className="btn btn-outline-light btn-sm" onClick={salir}>
          <i className="fa-solid fa-right-from-bracket" />
          <span className="d-none d-sm-inline ms-2">Salir</span>
        </button>
>>>>>>> origin/main
      </header>

      <div className="container-fluid px-3 px-lg-4 py-4">
        <div className="d-flex gap-4 align-items-start">
          <aside className={`app-sidebar ${menuAbierto ? '' : 'd-none d-lg-block'}`}>
<<<<<<< HEAD
            <div className="app-sidebar-inner card border-0 shadow-sm p-3 d-flex flex-column">
=======
            <div className="app-sidebar-inner card border-0 shadow-sm p-3">
>>>>>>> origin/main
              <h2 className="h6 text-secondary text-uppercase mb-3">{TITULO_PANEL[rol]}</h2>
              {navegacion}
            </div>
          </aside>

          {/* El límite rodea solo el contenido: si una pantalla falla, el
              header y el menú siguen en pie y hay por dónde salir. */}
          <main className="flex-grow-1 min-width-0">
<<<<<<< HEAD
            <LimiteDeError clave={pathname}>
              {listaTopArriba && (
                <ListaTop rutaComentarios={rutaComentarios} rutaMenu={enPortada ? rutaMenu : null} />
              )}
              {/* La pantalla llega bajo demanda; si la descarga falla, la recoge LimiteDeError. */}
              <Suspense fallback={<Cargando texto="Cargando pantalla…" />}>{children}</Suspense>
            </LimiteDeError>
          </main>
        </div>
      </div>

      {verInformacion && <InformacionCasa onCerrar={() => setVerInformacion(false)} />}
=======
            <LimiteDeError clave={pathname}>{children}</LimiteDeError>
          </main>
        </div>
      </div>
>>>>>>> origin/main
    </div>
  )
}
