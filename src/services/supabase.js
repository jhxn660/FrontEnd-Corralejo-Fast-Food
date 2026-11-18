import { createClient } from '@supabase/supabase-js'

import { config, faltanCredencialesSupabase } from './config'

if (faltanCredencialesSupabase) {
  // createClient lanza con valores vacíos, así que el aviso debe salir antes
  // para que la causa real no quede enterrada en el stack de la librería.
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY. Copia .env.example como .env.'
  )
}

/** Cliente de la sesión de la aplicación (AuthContext es su único dueño). */
export const supabase = createClient(config.supabaseUrl, config.supabaseKey)

/**
 * Cliente SIN sesión persistida, solo para dar de alta cuentas de personal
 * desde Gestión de Usuarios. `signUp` con el cliente principal sustituiría la
 * sesión del Owner por la de la cuenta recién creada; este no guarda ni
 * refresca nada, y su `storageKey` propio evita el aviso de dos clientes
 * compartiendo almacenamiento.
 */
const supabaseAltas = createClient(config.supabaseUrl, config.supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'cff-altas-personal',
  },
})

/**
 * Crea la cuenta de acceso en Supabase. `rol` va en user_metadata, que es de
 * donde AuthContext lo lee (`admin` / `empleado`).
 */
export const crearCuentaDeAcceso = async ({ email, password, rol, nombre }) => {
  const { data, error } = await supabaseAltas.auth.signUp({
    email,
    password,
    options: { data: { rol, nombre } },
  })
  if (error) throw error
  return data.user
}
