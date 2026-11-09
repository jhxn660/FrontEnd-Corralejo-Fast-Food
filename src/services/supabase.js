import { createClient } from '@supabase/supabase-js'

import { config, faltanCredencialesSupabase } from './config'

if (faltanCredencialesSupabase) {
  // createClient lanza con valores vacíos, así que el aviso debe salir antes
  // para que la causa real no quede enterrada en el stack de la librería.
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY. Copia .env.example como .env.'
  )
}

export const supabase = createClient(config.supabaseUrl, config.supabaseKey)
