import { useEffect, useRef } from 'react'

import { alCambiar } from '../services/sincronizacion'

// Varias escrituras seguidas (crear + recargar, o un lote) se agrupan en una
// sola recarga.
const AGRUPAR_MS = 150

/**
 * Llama a `refrescar` cuando los datos pueden haber cambiado en la API:
 * - otra pantalla o pestaña de este navegador escribió (services/sincronizacion.js);
 * - la pestaña vuelve a estar visible o recupera el foco (así se ven los cambios hechos
 *   desde otro dispositivo).
 * No hay sondeo con temporizador: solo se pide lo que el uso real del sistema provoca.
 *
 * `refrescar` debe ser silencioso (sin spinner): lo usan useRecurso y useMenu.
 */
export function useSincronizar(refrescar) {
  // La última versión de `refrescar` sin re-suscribirse en cada render.
  const ultimo = useRef(refrescar)
  useEffect(() => {
    ultimo.current = refrescar
  }, [refrescar])

  useEffect(() => {
    let temporizador = null
    const programar = () => {
      clearTimeout(temporizador)
      temporizador = setTimeout(() => ultimo.current(), AGRUPAR_MS)
    }
    const siVisible = () => document.visibilityState === 'visible' && programar()

    const dejarDeEscuchar = alCambiar(programar)
    document.addEventListener('visibilitychange', siVisible)
    window.addEventListener('focus', siVisible)

    return () => {
      dejarDeEscuchar()
      clearTimeout(temporizador)
      document.removeEventListener('visibilitychange', siVisible)
      window.removeEventListener('focus', siVisible)
    }
  }, [])
}
