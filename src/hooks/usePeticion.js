import { useCallback, useRef, useState } from 'react'

/**
 * Envoltura de una escritura: expone { ejecutar, enviando, error, limpiar }.
 * Complementa useRecurso, que solo sabe leer.
 *
 * Dos cosas que no son obvias:
 * - `enviando` bloquea el doble envío. Sin él, dos clics seguidos en "Guardar"
 *   crean dos registros, y con json-server no hay restricción que lo impida.
 * - `ejecutar` devuelve { ok, datos, error } en vez de lanzar, para que la
 *   pantalla escriba `if (ok) cerrar()` sin un try/catch en cada handler. El
 *   error ya quedó en el estado del hook.
 */
export function usePeticion(accion) {
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const enVuelo = useRef(false)

  const ejecutar = useCallback(
    async (...args) => {
      if (enVuelo.current) return { ok: false, error: null }
      enVuelo.current = true
      setEnviando(true)
      setError(null)
      try {
        const datos = await accion(...args)
        return { ok: true, datos, error: null }
      } catch (err) {
        if (err?.name === 'AbortError') return { ok: false, error: null }
        setError(err)
        return { ok: false, datos: null, error: err }
      } finally {
        enVuelo.current = false
        setEnviando(false)
      }
    },
    [accion]
  )

  return { ejecutar, enviando, error, limpiar: () => setError(null) }
}
