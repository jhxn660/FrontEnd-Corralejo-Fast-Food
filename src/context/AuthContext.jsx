<<<<<<< HEAD
import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react'

import { authApi } from '../api/auth.api'
import {
  clearToken,
  setRenovador,
  setUnauthorizedHandler,
  tiempoRestante,
  USER_STORAGE_KEY,
} from '../api/client'
import { ROLES, normalizarRol, puede as puedeRol } from '../config/roles.config'

import { useAvisos } from './AvisosContext'

const AuthContext = createContext(null)

const MAXIMA_ESPERA_MS = 2 ** 31 - 1

/** Lo que la aplicación usa del usuario de la sesión. */
const datosDeSesion = (usuario) =>
  usuario ? { _id: String(usuario._id), name: usuario.name, email: usuario.email, role: usuario.role } : null

/** ¿Mismos datos? Entonces no hace falta volver a pintar la aplicación. */
const mismoUsuario = (a, b) =>
  a?._id === b?._id && a?.name === b?.name && a?.email === b?.email && a?.role === b?.role

/** Usuario guardado junto a un token vigente ('User' en localStorage), o null. */
const usuarioGuardado = () => {
  if (tiempoRestante() === 0) return null
  try {
    return datosDeSesion(JSON.parse(localStorage.getItem(USER_STORAGE_KEY) ?? 'null'))
  } catch {
    return null
  }
}

/**
 * Única fuente de la sesión. En localStorage van juntos 'token' (JWT) y 'User' (datos): los
 * guarda authApi en login y renewToken, y los borra clearToken.
 *
 * REGLAS DE LA SESIÓN
 * - Dura 2 horas (el backend firma el token por 2 h) y al vencer se cierra con un aviso.
 * - Se renueva con cada petición al backend (lo hace api/client.js): la sesión vence 2 horas
 *   después de la última petición. No hay temporizadores que renueven por su cuenta.
 * - Renovar no vuelve a pintar la aplicación si los datos del usuario no cambiaron.
 */
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(usuarioGuardado)
  // Con una sesión guardada hay que confirmarla antes de pintar rutas protegidas.
  const [cargando, setCargando] = useState(() => usuarioGuardado() !== null)
  const avisos = useAvisos()

  /** Cambia el usuario solo si sus datos cambiaron: con el mismo objeto, React no repinta. */
  const actualizarUsuario = useCallback((nuevo) => {
    const datos = datosDeSesion(nuevo)
    setUsuario((actual) => (mismoUsuario(actual, datos) ? actual : datos))
  }, [])

  // 401 de cualquier petición (token vencido o cuenta desactivada) → sin sesión.
  useEffect(() => {
    setUnauthorizedHandler(() => setUsuario(null))
    return () => setUnauthorizedHandler(null)
  }, [])

  // Al abrir la app con una sesión guardada y vigente se confirma con GET /auth/renew-token: el
  // backend comprueba que la cuenta siga activa y entrega un token nuevo con los datos al día.
  useEffect(() => {
    if (!usuarioGuardado()) {
      clearToken()
      return
    }
    authApi
      .renewToken()
      .then((response) => actualizarUsuario(response.data.data))
      .catch((err) => {
        // Sin conexión no se borra la sesión: se vuelve a intentar en la próxima petición.
        if (!err.response) return
        clearToken()
        setUsuario(null)
      })
      .finally(() => setCargando(false))
  }, [actualizarUsuario])

  // Quien renueva el token: api/client.js lo llama después de cada petición al backend.
  useEffect(() => {
    setRenovador(() => authApi.renewToken().then((response) => actualizarUsuario(response.data.data)))
    return () => setRenovador(null)
  }, [actualizarUsuario])

  // VENCIMIENTO: al llegar la hora del token se cierra la sesión. Antes de cerrar se vuelve a
  // mirar el token guardado: si se renovó entretanto (en esta pestaña o en otra), se espera a
  // su nuevo vencimiento.
  const conSesion = Boolean(usuario)
  useEffect(() => {
    if (!conSesion) return undefined
    let temporizador = null
    const revisar = () => {
      const restante = tiempoRestante()
      if (restante > 0) {
        // setTimeout no admite esperas de más de ~24 días: con más, se volvería a revisar al instante
        temporizador = setTimeout(revisar, Math.min(restante, MAXIMA_ESPERA_MS))
        return
      }
      clearToken()
      setUsuario(null)
      avisos.error('Sesión expirada', 'La sesión dura 2 horas. Inicia sesión de nuevo.')
    }
    revisar()
    return () => clearTimeout(temporizador)
  }, [conSesion, avisos])

  /** Login: authApi.login ya guarda token y User; aquí solo se sincroniza el estado. */
  const iniciarSesion = useCallback(
    async (credenciales) => {
      const response = await authApi.login(credenciales)
      actualizarUsuario(response.data.data)
    },
    [actualizarUsuario]
  )

  const cerrarSesion = useCallback(() => {
    clearToken()
    setUsuario(null)
  }, [])

  // El rol se calcula del usuario (nunca se guarda aparte). Sin sesión es el del visitante.
  const rol = usuario ? normalizarRol(usuario.role) : ROLES.VISITOR

  // El valor solo cambia si cambia la sesión: así las pantallas no se repintan de más.
  // Uso en las pantallas: `puede(PERMISO.ELIMINAR_ADMINS)`.
  const valor = useMemo(
    () => ({
      usuario,
      rol,
      cargando,
      iniciarSesion,
      cerrarSesion,
      puede: (permiso) => puedeRol(rol, permiso),
    }),
    [usuario, rol, cargando, iniciarSesion, cerrarSesion]
  )

  return <AuthContext value={valor}>{children}</AuthContext>
}

export function useAuth() {
  return use(AuthContext)
=======
import { createContext, useContext, useEffect, useState } from 'react'

import { supabase } from '../services/supabase'
import { registrarManejadorNoAutorizado, registrarProveedorToken } from '../services/http'
import { normalizarRol } from '../config/roles'

const AuthContext = createContext(null)

/** Única fuente de la sesión: ningún componente llama a getSession() (R5). */
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)

  // La capa de red pide el token aquí en cada petición (RNF-05). Se consulta a
  // Supabase en el momento, no se guarda en estado: getSession() devuelve el
  // token ya refrescado, así que una pestaña abierta varias horas no envía uno
  // caducado. Un 401 del back significa que ni el refresco sirvió: se cierra
  // sesión y el guardia de ruta manda al login solo.
  useEffect(() => {
    registrarProveedorToken(async () => {
      const { data } = await supabase.auth.getSession()
      return data.session?.access_token ?? null
    })
    registrarManejadorNoAutorizado(() => supabase.auth.signOut())

    return () => {
      registrarProveedorToken(null)
      registrarManejadorNoAutorizado(null)
    }
  }, [])

  useEffect(() => {
    // Sesión que ya existía (por ejemplo, tras recargar la página).
    supabase.auth.getSession().then(({ data }) => {
      setUsuario(data.session?.user ?? null)
      setCargando(false)
    })

    // Cambios posteriores: login, logout, refresco de token, incluidos los
    // originados en otra pestaña.
    const { data: listener } = supabase.auth.onAuthStateChange((_evento, session) => {
      setUsuario(session?.user ?? null)
      setCargando(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const cerrarSesion = () => supabase.auth.signOut()

  // Valor derivado: nunca se desincroniza del usuario.
  const rol = normalizarRol(usuario?.user_metadata?.rol)

  return (
    <AuthContext.Provider value={{ usuario, rol, cargando, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
>>>>>>> origin/main
}
