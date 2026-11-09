// Cliente HTTP base. fetch nativo, no axios: lo único que axios aportaría aquí
// son los interceptores, que caben en 40 líneas, y el bundle ya pesa 663 KB.
//
// DECISIÓN DE INTEGRACIÓN — de dónde sale el token (RNF-05):
// este módulo NO importa supabase. Si lo hiciera habría dos dueños de la sesión
// (el contexto y la capa de red) y un ciclo de imports. En su lugar AuthContext
// *inyecta* un proveedor al montarse: la sesión sigue teniendo un único dueño y
// http.js es testeable sin Supabase. Mientras no haya proveedor registrado las
// peticiones salen sin Authorization, que es exactamente lo que necesitan los
// endpoints públicos (ticket por enlace, menú del visitante).

import { config } from './config'
import { desdeRespuesta, errorDeRed, errorDeTimeout } from './errores'

let proveedorToken = null // () => Promise<string | null>
let alNoAutorizado = null // () => void, lo registra AuthContext

export const registrarProveedorToken = (fn) => {
  proveedorToken = fn
}

export const registrarManejadorNoAutorizado = (fn) => {
  alNoAutorizado = fn
}

const interceptores = { peticion: [], respuesta: [] }

export const interceptarPeticion = (fn) => {
  interceptores.peticion.push(fn)
  return () => {
    interceptores.peticion = interceptores.peticion.filter((i) => i !== fn)
  }
}

export const interceptarRespuesta = (fn) => {
  interceptores.respuesta.push(fn)
  return () => {
    interceptores.respuesta = interceptores.respuesta.filter((i) => i !== fn)
  }
}

// Interceptor de petición por defecto: adjunta el JWT si hay sesión.
interceptarPeticion(async (peticion) => {
  if (!proveedorToken || peticion.publica) return peticion
  const token = await proveedorToken()
  if (!token) return peticion
  return { ...peticion, cabeceras: { ...peticion.cabeceras, Authorization: `Bearer ${token}` } }
})

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

async function ejecutar(peticion) {
  let preparada = peticion
  for (const interceptor of interceptores.peticion) preparada = await interceptor(preparada)

  const { ruta, metodo = 'GET', cuerpo, query, cabeceras, senal } = preparada
  const url = construirUrl(ruta, query)

  // Timeout propio combinado con la señal que pueda traer quien llama (un
  // componente que se desmonta a mitad de la carga).
  const controlador = new AbortController()
  const temporizador = setTimeout(() => controlador.abort('timeout'), config.timeoutMs)
  senal?.addEventListener('abort', () => controlador.abort(senal.reason), { once: true })

  let res
  try {
    res = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...cabeceras },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: controlador.signal,
    })
  } catch (err) {
    clearTimeout(temporizador)
    if (controlador.signal.reason === 'timeout') throw errorDeTimeout(ruta, config.timeoutMs)
    if (err?.name === 'AbortError') throw err // desmontaje: lo ignora quien llama
    throw errorDeRed(ruta)
  }
  clearTimeout(temporizador)

  const cuerpoRespuesta = res.status === 204 ? null : await res.json().catch(() => null)

  let resultado = { estado: res.status, datos: cuerpoRespuesta, ruta }
  for (const interceptor of interceptores.respuesta) resultado = await interceptor(resultado)

  if (!res.ok) {
    if (res.status === 401) alNoAutorizado?.()
    throw desdeRespuesta(res.status, resultado.datos, ruta)
  }

  return resultado.datos
}

/**
 * Normaliza la forma de las listas. json-server devuelve un array plano; el
 * contrato acordado con el back devuelve { datos, total, pagina }. Aceptar las
 * dos formas es lo que permite migrar sin reescribir ningún hook: cuando el
 * back entre, esta función deja de hacer nada y nadie más cambia.
 */
export const normalizarLista = (respuesta) =>
  Array.isArray(respuesta)
    ? { datos: respuesta, total: respuesta.length, pagina: 1 }
    : {
        datos: respuesta?.datos ?? [],
        total: respuesta?.total ?? respuesta?.datos?.length ?? 0,
        pagina: respuesta?.pagina ?? 1,
      }

export const http = {
  get: (ruta, opciones) => ejecutar({ ...opciones, ruta, metodo: 'GET' }),
  post: (ruta, cuerpo, opciones) => ejecutar({ ...opciones, ruta, metodo: 'POST', cuerpo }),
  put: (ruta, cuerpo, opciones) => ejecutar({ ...opciones, ruta, metodo: 'PUT', cuerpo }),
  patch: (ruta, cuerpo, opciones) => ejecutar({ ...opciones, ruta, metodo: 'PATCH', cuerpo }),
  delete: (ruta, opciones) => ejecutar({ ...opciones, ruta, metodo: 'DELETE' }),
  lista: async (ruta, opciones) => normalizarLista(await ejecutar({ ...opciones, ruta })),
}
