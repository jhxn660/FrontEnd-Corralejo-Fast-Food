import { useCallback, useEffect, useRef, useState } from 'react'

import { useSincronizar } from './useSincronizar'

/**
 * Carga un recurso de json-server y expone {datos, cargando, error, recargar}.
 *
 * Se mantiene al día solo: cuando cualquier pantalla, pestaña o rol escribe
 * (o pasa el intervalo de sincronización) vuelve a pedir los datos EN SILENCIO,
 * sin spinner ni borrar lo que hay en pantalla (ver useSincronizar).
 *
 * Si dos peticiones se cruzan, gana la última que se lanzó: una respuesta
 * vieja que llega tarde no pisa a una nueva.
 *
 * Un refresco silencioso NO se lanza mientras hay una carga visible en curso:
 * esa carga ya trae los datos frescos, y si el refresco le quitaba el turno
 * nadie apagaba `cargando` y la pantalla se quedaba en el spinner.
 *
 * @param {() => Promise<any>} cargar  función que devuelve los datos
 * @param {any} inicial                valor mientras no haya respuesta
 */
export function useRecurso(cargar, inicial = null) {
  const [datos, setDatos] = useState(inicial)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
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

  useEffect(() => {
    recargar()
  }, [recargar])

  useSincronizar(refrescar)

  return { datos, cargando, error, setError, recargar }
}
