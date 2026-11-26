<<<<<<< HEAD
import { useCallback, useEffect, useRef, useState } from 'react'

import { useSincronizar } from './useSincronizar'

/**
 * Carga un recurso del backend y expone { datos, cargando, error, recargar }.
 *
 * - Se mantiene al día solo: cuando algo cambia (otra pantalla, pestaña o rol) vuelve a pedir
 *   los datos en silencio, sin spinner (ver useSincronizar).
 * - Si dos peticiones se cruzan, gana la última que se lanzó.
 * - Un refresco silencioso no interrumpe una carga visible (si no, el spinner no se apagaba).
 *
 * @param {() => Promise<any>} cargar  función que devuelve los datos (envuelta en useCallback)
=======
import { useCallback, useEffect, useState } from 'react'

/**
 * Carga un recurso de la API y expone {datos, cargando, error, recargar}.
 * Evita repetir el mismo trío de useState en cada pantalla.
 *
 * @param {() => Promise<any>} cargar  función que devuelve los datos
>>>>>>> origin/main
 * @param {any} inicial                valor mientras no haya respuesta
 */
export function useRecurso(cargar, inicial = null) {
  const [datos, setDatos] = useState(inicial)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
<<<<<<< HEAD
  const turno = useRef(0)
  const turnoVisible = useRef(0) // turno de la carga con spinner en curso (0 = ninguna)

  const pedir = useCallback(
    async ({ silencioso }) => {
      if (silencioso && turnoVisible.current) return
      const mio = ++turno.current
      if (!silencioso) {
        turnoVisible.current = mio
        setCargando(true)
        setError('')
      }
      try {
        const resultado = await cargar()
        if (mio !== turno.current) return
        setDatos(resultado)
        setError('')
      } catch (err) {
        // Un refresco en segundo plano que falla no tapa lo que ya se ve.
        if (mio === turno.current && !silencioso) setError(err.message)
      } finally {
        if (turnoVisible.current === mio) {
          turnoVisible.current = 0
          setCargando(false)
        }
      }
    },
    [cargar]
  )

  const recargar = useCallback(() => pedir({ silencioso: false }), [pedir])
  const refrescar = useCallback(() => pedir({ silencioso: true }), [pedir])
=======

  const recargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      setDatos(await cargar())
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }, [cargar])
>>>>>>> origin/main

  useEffect(() => {
    recargar()
  }, [recargar])

<<<<<<< HEAD
  useSincronizar(refrescar)

  return { datos, cargando, error, setError, recargar }
=======
  return { datos, setDatos, cargando, error, setError, recargar }
>>>>>>> origin/main
}
