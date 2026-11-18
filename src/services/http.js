// Cliente HTTP de json-server. fetch nativo, sin axios: timeout propio,
// cancelación por señal y errores normalizados en ErrorApi.
//
// La sesión (Supabase) no viaja aquí: json-server no autentica, así que las
// peticiones salen sin cabecera Authorization.

import { config } from './config'
import { desdeRespuesta, errorDeRed, errorDeTimeout } from './errores'
import { notificarCambio } from './sincronizacion'

const construirUrl = (ruta, query) => {
  const url = new URL(`${config.apiUrl}${ruta}`)
  Object.entries(query ?? {}).forEach(([clave, valor]) => {
    // Un filtro sin valor no debe viajar: `?estado=` significa otra cosa que
    // no filtrar, y json-server lo interpreta literalmente.
    if (valor !== undefined && valor !== null && valor !== '') {
      url.searchParams.set(clave, String(valor))
    }
  })
  return url.toString()
}

async function ejecutar({ ruta, metodo = 'GET', cuerpo, query, senal }) {
  const url = construirUrl(ruta, query)

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

  let res
  try {
    res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: controlador.signal,
    })
  } catch (err) {
    clearTimeout(temporizador)
    if (controlador.signal.aborted || err?.name === 'AbortError') throw cancelada()
    throw errorDeRed(ruta)
  }

  // El cuerpo también puede cortarse a medias: sin esta comprobación, una
  // lectura abortada devolvía `null` y la pantalla se quedaba con una lista
  // vacía como si fuera la respuesta buena.
  const datos = res.status === 204 ? null : await res.json().catch(() => null)
  clearTimeout(temporizador)
  if (controlador.signal.aborted) throw cancelada()
  if (!res.ok) throw desdeRespuesta(res.status, ruta)

  // Toda escritura que llega a json-server se anuncia: las demás pantallas,
  // pestañas y roles recargan lo suyo (services/sincronizacion.js).
  if (metodo !== 'GET') notificarCambio(ruta)
  return datos
}

/**
 * Forma única de las listas. json-server devuelve un array plano y, si se
 * pagina con `_page`, un objeto con `data`; las dos se leen igual.
 */
const normalizarLista = (respuesta) => {
  const datos = Array.isArray(respuesta) ? respuesta : (respuesta?.data ?? [])
  return { datos, total: respuesta?.items ?? datos.length }
}

export const http = {
  get: (ruta, opciones) => ejecutar({ ...opciones, ruta, metodo: 'GET' }),
  post: (ruta, cuerpo, opciones) => ejecutar({ ...opciones, ruta, metodo: 'POST', cuerpo }),
  put: (ruta, cuerpo, opciones) => ejecutar({ ...opciones, ruta, metodo: 'PUT', cuerpo }),
  patch: (ruta, cuerpo, opciones) => ejecutar({ ...opciones, ruta, metodo: 'PATCH', cuerpo }),
  delete: (ruta, opciones) => ejecutar({ ...opciones, ruta, metodo: 'DELETE' }),
  lista: async (ruta, opciones) => normalizarLista(await ejecutar({ ...opciones, ruta })),
}
