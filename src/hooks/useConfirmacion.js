import { useCallback, useState } from 'react'

/**
 * Estado de «estoy a punto de eliminar esto»: registro señalado, enviando y error.
 *
 * Uso:
 *   const eliminacion = useConfirmacion((insumo) => insumosApi.eliminar(insumo.id))
 *   <button onClick={() => eliminacion.pedir(insumo)}>Eliminar</button>
 *   {eliminacion.objetivo && <ConfirmarEliminacion {...} />}
 *
 * `objetivo` es el registro completo: el modal necesita su nombre.
 * `confirmar()` devuelve true o false, para saber si avisar del borrado o del fallo.
 */
export function useConfirmacion(accion, { alTerminar } = {}) {
  const [objetivo, setObjetivo] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  const pedir = useCallback((registro) => {
    setError(null)
    setObjetivo(registro)
  }, [])

  const cancelar = useCallback(() => {
    setObjetivo(null)
    setError(null)
  }, [])

  const confirmar = useCallback(async () => {
    if (!objetivo || enviando) return false
    setEnviando(true)
    setError(null)
    try {
      await accion(objetivo)
      setObjetivo(null)
      alTerminar?.()
      return true
    } catch (err) {
      // El modal sigue abierto con el error: cerrarlo dejaría al usuario
      // creyendo que el registro se eliminó.
      setError(err)
      return false
    } finally {
      setEnviando(false)
    }
  }, [objetivo, enviando, accion, alTerminar])

  return { objetivo, enviando, error, pedir, cancelar, confirmar }
}
