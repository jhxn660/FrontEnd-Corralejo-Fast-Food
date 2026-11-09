import { useCallback, useEffect, useState } from 'react'

/**
 * Carga un recurso de la API y expone {datos, cargando, error, recargar}.
 * Evita repetir el mismo trío de useState en cada pantalla.
 *
 * @param {() => Promise<any>} cargar  función que devuelve los datos
 * @param {any} inicial                valor mientras no haya respuesta
 */
export function useRecurso(cargar, inicial = null) {
  const [datos, setDatos] = useState(inicial)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

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

  useEffect(() => {
    recargar()
  }, [recargar])

  return { datos, setDatos, cargando, error, setError, recargar }
}
