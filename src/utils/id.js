/**
 * Identificador aleatorio para registros que se crean en el navegador (platos
 * de la carta, códigos QR).
 *
 * `crypto.randomUUID` solo existe en contextos seguros (HTTPS o localhost):
 * abriendo la aplicación por la IP de la red local desde un teléfono no está,
 * y sin el respaldo el alta se rompía.
 */
export const idUnico = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
