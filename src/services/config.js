// ÚNICO lugar del proyecto que lee import.meta.env (R19).
// Si una variable falta, se falla aquí y no en mitad de una petición.

const leer = (clave, porDefecto) => {
  const valor = import.meta.env[clave]
  return valor === undefined || valor === '' ? porDefecto : valor
}

export const config = {
  apiUrl: leer('VITE_API_URL', 'http://localhost:3000').replace(/\/+$/, ''),
  supabaseUrl: leer('VITE_SUPABASE_URL'),
  supabaseKey: leer('VITE_SUPABASE_PUBLISHABLE_KEY'),
  // Un timeout explícito evita peticiones colgadas cuando la API no responde:
  // fetch() no trae ninguno por defecto.
  timeoutMs: Number(leer('VITE_API_TIMEOUT_MS', 15000)),
}

export const faltanCredencialesSupabase = !config.supabaseUrl || !config.supabaseKey
