// ÚNICO lugar del proyecto que lee import.meta.env (R19).
// Si una variable falta, se falla aquí y no en mitad de una petición.

const leer = (clave, porDefecto) => {
  const valor = import.meta.env[clave]
  return valor === undefined || valor === '' ? porDefecto : valor
}

export const config = {
  apiUrl: leer('VITE_API_URL', 'http://localhost:3000').replace(/\/+$/, ''),
  // Dirección pública de la aplicación. Es lo que se codifica en el QR del
  // tiquete, así que en producción debe apuntar al dominio real: el QR se
  // imprime en papel y se escanea desde un teléfono que no sabe nada de
  // localhost. Por defecto, el origen desde el que se está sirviendo.
  appUrl: leer('VITE_APP_URL', globalThis.location?.origin ?? '').replace(/\/+$/, ''),
  supabaseUrl: leer('VITE_SUPABASE_URL'),
  supabaseKey: leer('VITE_SUPABASE_PUBLISHABLE_KEY'),
  // Un timeout explícito evita peticiones colgadas cuando la API no responde:
  // fetch() no trae ninguno por defecto.
  timeoutMs: Number(leer('VITE_API_TIMEOUT_MS', 15000)),
}

export const faltanCredencialesSupabase = !config.supabaseUrl || !config.supabaseKey
