import axios from 'axios'

// URL del backend SIN /api (.env: VITE_API_URL=http://localhost:3000)
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

// Clave del token en localStorage
export const TOKEN_STORAGE_KEY = 'token'

// Clave del usuario de la sesión en localStorage (la guarda authApi.login)
export const USER_STORAGE_KEY = 'User'

// Lee el token guardado
export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

// Guarda el token, o lo borra si es null
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token)
  else localStorage.removeItem(TOKEN_STORAGE_KEY)
}

// Borra el token y el usuario guardado (cerrar sesión o 401)
export function clearToken() {
  setToken(null)
  localStorage.removeItem(USER_STORAGE_KEY)
}

// Acción a ejecutar si la sesión expira (la registra AuthContext)
let onUnauthorized = null

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

/** Aviso de sesión vencida para el otro cliente HTTP (services/http.js). */
export function notificarNoAutorizado() {
  clearToken()
  onUnauthorized?.()
}

/* ── TOKEN NUEVO EN CADA PETICIÓN ──
 * Tras cada respuesta correcta con sesión abierta se pide un token nuevo (renewToken).
 * La función que renueva la registra AuthContext (setRenovador) para no importar auth.js
 * aquí. Si varias peticiones terminan a la vez, se hace UNA sola renovación. */
let renovador = null
let renovacionEnCurso = null
let onActividad = null

export function setRenovador(fn) {
  renovador = fn
}

/** Cada petición cuenta como actividad (para el cierre por inactividad de AuthContext). */
export function setActividadHandler(handler) {
  onActividad = handler
}

/** Lo llaman los dos clientes HTTP (axios y services/http.js) tras una respuesta correcta. */
export function notificarPeticionExitosa(url = '') {
  if (!getToken()) return
  onActividad?.()
  // La propia renovación y el login no disparan otra renovación (evita un bucle)
  if (String(url).includes('/auth/') || !renovador || renovacionEnCurso) return
  renovacionEnCurso = renovador()
    .catch(() => null)
    .finally(() => {
      renovacionEnCurso = null
    })
}

// Instancia de Axios para toda la API
export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Agrega el token a cada petición
apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.set('X-Token', token)
  return config
})

// Si responde 401 con sesión abierta: borra el token y cierra sesión.
// Un login fallido (sin token) también es 401, pero ahí no hay sesión que cerrar.
apiClient.interceptors.response.use(
  (response) => {
    notificarPeticionExitosa(response.config?.url)
    return response
  },
  (error) => {
    if (error.response?.status === 401 && getToken()) notificarNoAutorizado()
    return Promise.reject(error)
  }
)

// Convierte una ruta de imagen en URL completa
export function getImageUrl(path) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalized}`
}
