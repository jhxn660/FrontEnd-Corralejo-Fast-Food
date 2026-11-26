/**
 * Identificador aleatorio para las filas nuevas de un formulario (platos de una categoría).
 * `crypto.randomUUID` solo existe en contextos seguros (HTTPS o localhost); abriendo la app por
 * la IP de la red local no está, por eso hay respaldo.
 */
export const idUnico = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
