import axios from 'axios'

import { notificarCambio } from '../services/sincronizacion'
import { vencimientoDe } from '../utils/jwt'

// URL del backend SIN /api (.env: VITE_API_URL=http://localhost:3000)
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '')

// Claves de la sesión en localStorage: 'token' (JWT) y 'User' (data del usuario)
const TOKEN_STORAGE_KEY = 'token'
export const USER_STORAGE_KEY = 'User'

function getToken() {
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

/** Milisegundos que le quedan al token guardado (0 si no hay token o ya venció). */
export function tiempoRestante() {
  const vence = vencimientoDe(getToken())
  return vence === null ? 0 : Math.max(0, vence - Date.now())
}

// Peticiones que terminan casi juntas (al abrir una pantalla) comparten UNA renovación
const AGRUPAR_RENOVACION_MS = 300

// Acciones que registra AuthContext: sesión vencida (401) y pedir un token nuevo
let onUnauthorized = null
let renovador = null
let renovacionProgramada = null
let renovacionEnCurso = null

export const setUnauthorizedHandler = (handler) => { onUnauthorized = handler }
export const setRenovador = (fn) => { renovador = fn }

/**
 * RENOVACIÓN DEL TOKEN con cada petición al backend.
 * Toda petición que el backend atiende (crear, leer, actualizar o eliminar) es uso real del
 * sistema: después de ella se pide un token nuevo (GET /auth/renew-token), que vuelve a durar
 * 2 horas. Así la sesión vence 2 horas después de la ÚLTIMA petición.
 * - Las peticiones que terminan casi juntas comparten una sola renovación.
 * - Las rutas de /auth no disparan otra renovación (evita un bucle).
 */
function renovarTrasPeticion(url = '') {
  if (!getToken() || !renovador) return
  if (String(url).includes('/auth/')) return
  clearTimeout(renovacionProgramada)
  renovacionProgramada = setTimeout(() => {
    renovacionProgramada = null
    // Una renovación que ya está en camino trae el token nuevo de estas peticiones
    if (!getToken() || !renovador || renovacionEnCurso) return
    renovacionEnCurso = renovador()
      .catch(() => null)
      .finally(() => {
        renovacionEnCurso = null
      })
  }, AGRUPAR_RENOVACION_MS)
}

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// El backend lee el token en la cabecera X-Token
apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.set('X-Token', token)
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    // Toda escritura se anuncia: las demás pantallas y pestañas recargan lo suyo
    if (response.config.method !== 'get') notificarCambio(response.config.url)
    renovarTrasPeticion(response.config.url)
    return response
  },
  (error) => {
    // 401 con sesión abierta: token vencido o cuenta desactivada. Un login fallido (sin
    // token) también es 401, pero ahí no hay sesión que cerrar.
    if (error.response?.status === 401 && getToken()) {
      clearToken()
      onUnauthorized?.()
    } else if (error.response) {
      // El backend atendió la petición aunque la rechazara (400, 403, 409…): también renueva
      renovarTrasPeticion(error.config?.url)
    }
    // Las pantallas muestran `error.message`: que sea el `msg` del backend ("No alcanzan los
    // insumos…") y no el texto técnico de axios ("Request failed with status code 409").
    error.message = mensajeDeError(error)
    return Promise.reject(error)
  }
)

/** El backend responde { msg, data }: de la respuesta de axios devuelve solo `data`. */
export const datos = async (peticion) => (await peticion).data.data

/** Mensaje legible de un error de axios: el `msg` del backend o uno genérico. */
function mensajeDeError(error) {
  if (!error?.response) return 'No se pudo conectar con el servidor. Inténtalo de nuevo.'
  const cuerpo = error.response.data ?? {}
  // El backend responde { msg }; si no viene, el primer texto del cuerpo; si tampoco, el código
  const primerTexto = Object.values(cuerpo).find((valor) => typeof valor === 'string')
  return cuerpo.msg || primerTexto || `El servidor respondió ${error.response.status}.`
}

// Convierte una ruta de imagen en URL completa (las data: URL se devuelven tal cual)
export function getImageUrl(path) {
  if (!path) return ''
  if (/^(https?:|data:)/.test(path)) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalized}`
}
