import { createContext, use, useCallback, useEffect, useRef, useState } from 'react'

import { ROL, normalizarRol, puede as puedeRol } from '../config/roles'
import { authApi } from '../api/auth'
import {
  clearToken,
  getToken,
  setActividadHandler,
  setRenovador,
  setUnauthorizedHandler,
  USER_STORAGE_KEY,
} from '../api/client'
import { useAvisos } from './AvisosContext'

const AuthContext = createContext(null)

// El token del backend dura 1 hora. Además de renovarse con cada petición, se renueva
// cada 30 min mientras la sesión siga viva, para que no venza estando inactiva.
const RENOVAR_CADA_MS = 30 * 60 * 1000

// La sesión se cierra tras 4 horas sin actividad (clics, teclas, scroll ni peticiones).
const INACTIVIDAD_MAXIMA_MS = 4 * 60 * 60 * 1000
const REVISAR_INACTIVIDAD_CADA_MS = 60 * 1000
const EVENTOS_DE_ACTIVIDAD = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart']

/** Usuario guardado junto al token ('User' en localStorage), o null. */
const usuarioGuardado = () => {
  if (!getToken()) return null
  try {
    return JSON.parse(localStorage.getItem(USER_STORAGE_KEY) ?? 'null')
  } catch {
    return null
  }
}

/**
 * Única fuente de la sesión (R5). En localStorage van juntos 'token' (JWT) y 'User'
 * (data): los guarda authApi en login y renewToken, y los borra clearToken.
 */
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(usuarioGuardado)
  // Con un token guardado hay que confirmarlo antes de pintar rutas protegidas.
  const [cargando, setCargando] = useState(() => Boolean(getToken()))

  // 401 de cualquier petición (token vencido o cuenta desactivada) → sin sesión.
  useEffect(() => {
    setUnauthorizedHandler(() => setUsuario(null))
    return () => setUnauthorizedHandler(null)
  }, [])

  // Al abrir la app con un token guardado: renewToken lo valida y guarda juntos el
  // token nuevo y el usuario actualizado. Si el backend lo rechaza, se borran los dos.
  useEffect(() => {
    if (!getToken()) return
    authApi
      .renewToken()
      .then((response) => setUsuario(response.data.data))
      .catch((err) => {
        // Sin conexión no se borra el token: se reintenta en la próxima visita.
        if (err.response) clearToken()
      })
      .finally(() => setCargando(false))
  }, [])

  // TOKEN NUEVO EN CADA PETICIÓN: api/client.js llama a esta función tras cada
  // respuesta correcta; renewToken guarda juntos el token nuevo y el User.
  useEffect(() => {
    setRenovador(() => authApi.renewToken().then((response) => setUsuario(response.data.data)))
    return () => setRenovador(null)
  }, [])

  const conSesion = Boolean(usuario)
  useEffect(() => {
    if (!conSesion) return undefined
    const intervalo = setInterval(() => {
      authApi.renewToken().then((response) => setUsuario(response.data.data)).catch(() => null)
    }, RENOVAR_CADA_MS)
    return () => clearInterval(intervalo)
  }, [conSesion])

  // CIERRE POR INACTIVIDAD: se guarda el momento de la última actividad (interacción con
  // la página o petición a la API) y cada minuto se revisa si pasaron 4 horas.
  const avisos = useAvisos()
  const ultimaActividad = useRef(Date.now())

  // Al abrir sesión el contador de inactividad empieza de cero
  useEffect(() => {
    if (conSesion) ultimaActividad.current = Date.now()
  }, [conSesion])

  useEffect(() => {
    if (!conSesion) return undefined

    const registrarActividad = () => {
      ultimaActividad.current = Date.now()
    }
    EVENTOS_DE_ACTIVIDAD.forEach((evento) => window.addEventListener(evento, registrarActividad, { passive: true }))
    setActividadHandler(registrarActividad)

    const revision = setInterval(() => {
      if (Date.now() - ultimaActividad.current < INACTIVIDAD_MAXIMA_MS) return
      clearToken()
      setUsuario(null)
      avisos.error('Sesión cerrada', 'Pasaron 4 horas sin actividad. Inicia sesión de nuevo.')
    }, REVISAR_INACTIVIDAD_CADA_MS)

    return () => {
      EVENTOS_DE_ACTIVIDAD.forEach((evento) => window.removeEventListener(evento, registrarActividad))
      setActividadHandler(null)
      clearInterval(revision)
    }
  }, [conSesion, avisos])

  /** Login: authApi.login ya guarda token y User; aquí solo se sincroniza el estado. */
  const iniciarSesion = useCallback(async (credenciales) => {
    const response = await authApi.login(credenciales)
    setUsuario(response.data.data)
  }, [])

  const cerrarSesion = useCallback(() => {
    clearToken()
    setUsuario(null)
  }, [])

  // Valor derivado: nunca se desincroniza del usuario. Sin sesión el rol es el
  // del visitante.
  const rol = usuario ? normalizarRol(usuario.role) : ROL.USUARIO

  // Renderizado condicional por acción: `puede(PERMISO.ELIMINAR_ADMINS)`.
  const puede = (permiso) => puedeRol(rol, permiso)

  return (
    <AuthContext value={{ usuario, rol, cargando, iniciarSesion, cerrarSesion, puede }}>
      {children}
    </AuthContext>
  )
}

export function useAuth() {
  return use(AuthContext)
}
