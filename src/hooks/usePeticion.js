import { useCallback, useRef, useState } from 'react'

/**
 * Envoltura de una escritura: { ejecutar, enviando, error, limpiar }. Complementa useRecurso.
 *
 * - `enviando` bloquea el doble envío (dos clics en Guardar no crean dos registros).
 * - `ejecutar` devuelve { ok, datos, error } en vez de lanzar: la pantalla escribe
 *   `if (ok) cerrar()` sin try/catch.
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
