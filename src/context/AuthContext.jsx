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
}
