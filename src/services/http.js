// Cliente HTTP de la API (config.apiUrl). fetch nativo, sin axios: timeout
// propio, cancelación por señal y errores normalizados en ErrorApi.
//
// Contrato del backend: el token viaja en `X-Token`; las respuestas buenas
// llegan como `{ msg, data }` y aquí se devuelve solo `data`; un 401 significa
// que el token venció o la cuenta se desactivó, y cierra la sesión.

import { config } from './config'
import { desdeRespuesta, errorDeRed, errorDeTimeout } from './errores'
// El token es el mismo que guarda el cliente axios (api/client.js): una sola sesión.
import { getToken, notificarNoAutorizado, notificarPeticionExitosa } from '../api/client'
import { notificarCambio } from './sincronizacion'

/** `{ msg, data }` → `data`. Lo que no venga con ese envoltorio pasa tal cual. */
const desenvolver = (cuerpo) =>
  cuerpo && typeof cuerpo === 'object' && !Array.isArray(cuerpo) && 'data' in cuerpo
    ? cuerpo.data
    : cuerpo

const construirUrl = (base, ruta, query) => {
  const url = new URL(`${base}${ruta}`)
  Object.entries(query ?? {}).forEach(([clave, valor]) => {
    // Un filtro sin valor no debe viajar: `?estado=` significa otra cosa que
    // no filtrar, y la API lo interpretaría literalmente.
    if (valor !== undefined && valor !== null && valor !== '') {
      url.searchParams.set(clave, String(valor))
    }
  })
  return url.toString()
}

async function ejecutar({ base, servicio, ruta, metodo = 'GET', cuerpo, query, senal }) {
  const url = construirUrl(base, ruta, query)

  // Timeout propio combinado con la señal que pueda traer quien llama (un
  // componente que se desmonta a mitad de la carga).
  const controlador = new AbortController()
  const temporizador = setTimeout(() => controlador.abort('timeout'), config.timeoutMs)
  senal?.addEventListener('abort', () => controlador.abort(senal.reason), { once: true })

  // Cancelada a propósito (desmontaje o una recarga que pisa a la anterior) o
  // por el timeout. Con un motivo propio, fetch rechaza con ESE motivo y no con
  // un AbortError: sin esta traducción se pintaba "No se pudo conectar con la
  // API" aunque los datos llegaran bien.
  const cancelada = () =>
    controlador.signal.reason === 'timeout'
      ? errorDeTimeout(ruta, config.timeoutMs)
      : new DOMException('Petición cancelada', 'AbortError')

  const token = getToken()

  let res
  try {
    res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Token': token } : {}) },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: controlador.signal,
    })
  } catch (err) {
    clearTimeout(temporizador)
    if (controlador.signal.aborted || err?.name === 'AbortError') throw cancelada()
    throw errorDeRed(ruta, servicio)
  }

  // El cuerpo también puede cortarse a medias: sin esta comprobación, una
  // lectura abortada devolvía `null` y la pantalla se quedaba con una lista
  // vacía como si fuera la respuesta buena.
  const datos = res.status === 204 ? null : await res.json().catch(() => null)
  clearTimeout(temporizador)
  if (controlador.signal.aborted) throw cancelada()
  if (!res.ok) {
    // Con sesión abierta, un 401 es un token vencido o una cuenta desactivada.
    // Sin token (un login fallido) no hay sesión que cerrar.
    if (res.status === 401 && token) notificarNoAutorizado()
    throw desdeRespuesta(res.status, ruta, datos)
  }

  // Toda escritura que llega a la API se anuncia: las demás pantallas,
  // pestañas y roles recargan lo suyo (services/sincronizacion.js).
  if (metodo !== 'GET') notificarCambio(ruta)
  // Respuesta correcta: cuenta como actividad y renueva el token (api/client.js)
  notificarPeticionExitosa(ruta)
  return desenvolver(datos)
}

/** Forma única de las listas: `{ datos, total }` a partir de un array. */
const normalizarLista = (respuesta) => {
  const datos = Array.isArray(respuesta) ? respuesta : []
  return { datos, total: datos.length }
}

/** Cliente de un servidor: timeout, errores y aviso de cambios compartidos. */
const crearCliente = (base, servicio) => {
  const llamar = (opciones) => ejecutar({ ...opciones, base: base(), servicio })
  return {
    get: (ruta, opciones) => llamar({ ...opciones, ruta, metodo: 'GET' }),
    post: (ruta, cuerpo, opciones) => llamar({ ...opciones, ruta, metodo: 'POST', cuerpo }),
    put: (ruta, cuerpo, opciones) => llamar({ ...opciones, ruta, metodo: 'PUT', cuerpo }),
    patch: (ruta, cuerpo, opciones) => llamar({ ...opciones, ruta, metodo: 'PATCH', cuerpo }),
    delete: (ruta, opciones) => llamar({ ...opciones, ruta, metodo: 'DELETE' }),
    lista: async (ruta, opciones) => normalizarLista(await llamar({ ...opciones, ruta })),
  }
}

/** API REST del proyecto (Backend-Corralejo-Fast-Food). */
export const http = crearCliente(
  () => config.apiUrl,
  'el backend (npm run dev en Backend-Corralejo-Fast-Food)'
)
