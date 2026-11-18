import { createContext, use, useCallback, useEffect, useState } from 'react'

import { supabase } from '../services/supabase'
import { ROL, normalizarRol, puede as puedeRol } from '../config/roles'
import { useSincronizar } from '../hooks/useSincronizar'
import { usuariosApi } from '../modules/usuarios/api'
import { useAvisos } from './AvisosContext'

const AuthContext = createContext(null)

/** Única fuente de la sesión: ningún componente llama a getSession() (R5). */
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)
  const avisos = useAvisos()

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

  // CUENTAS DE PERSONAL DESACTIVADAS. Supabase no sabe que el Owner desactivó
  // o dio de baja a alguien en Gestión de Usuarios (eso vive en json-server),
  // así que se comprueba aquí: al entrar, y cada vez que algo cambia en
  // json-server (useSincronizar). Una cuenta sin ficha (los clientes) no se
  // toca, y si json-server no responde no se expulsa a nadie por eso.
  const correo = usuario?.email ?? null
  const comprobarCuenta = useCallback(async () => {
    if (!correo) return
    try {
      const ficha = await usuariosApi.fichaDe(correo)
      if (!ficha || (ficha.state !== false && !ficha.deletedAt)) return
      await supabase.auth.signOut()
      avisos.error(
        'Cuenta desactivada',
        'El propietario desactivó o dio de baja esta cuenta. Habla con él para recuperar el acceso.'
      )
    } catch {
      // Sin json-server no hay ficha que consultar.
    }
  }, [correo, avisos])

  useEffect(() => {
    comprobarCuenta()
  }, [comprobarCuenta])

  useSincronizar(comprobarCuenta)

  // Valor derivado: nunca se desincroniza del usuario. Sin sesión el rol es el
  // del visitante.
  const rol = usuario ? normalizarRol(usuario.user_metadata?.rol) : ROL.USUARIO

  // Renderizado condicional por acción: `puede(PERMISO.ELIMINAR_ADMINS)`.
  const puede = (permiso) => puedeRol(rol, permiso)

  return (
    <AuthContext value={{ usuario, rol, cargando, cerrarSesion, puede }}>
      {children}
    </AuthContext>
  )
}

export function useAuth() {
  return use(AuthContext)
}
