import { useCallback, useState } from 'react'

/**
 * Estado del "estoy a punto de eliminar esto". Evita que cada pantalla repita
 * el mismo trío: registro señalado, enviando y error.
 *
 * Uso:
 *   const eliminacion = useConfirmacion((insumo) => api.remove('insumos', insumo.id))
 *   <button onClick={() => eliminacion.pedir(insumo)}>Eliminar</button>
 *   {eliminacion.objetivo && <ConfirmarEliminacion {...} />}
 *
 * `objetivo` es el registro completo, no su id: el modal necesita el nombre
 * para poder decir qué se va a borrar, que es el punto de RNF-01.
 *
 * `confirmar()` devuelve true o false. Hace falta porque quien llama necesita
 * saber si avisar del borrado o del fallo, y no puede deducirlo leyendo
 * `objetivo` después del await: ese valor es el del render en curso y todavía
 * apunta al registro, aunque el borrado ya haya terminado.
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
