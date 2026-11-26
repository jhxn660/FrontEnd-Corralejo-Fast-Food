// SINCRONIZACIÓN ENTRE PANTALLAS, PESTAÑAS Y ROLES.
//
// El backend no empuja cambios, así que cada escritura se anuncia aquí y los
// hooks de datos (useRecurso, useMenu) vuelven a pedir lo suyo en silencio:
// - misma pestaña: un EventTarget local (otra pantalla montada a la vez, como
//   la Lista Top del Layout, se entera al instante);
// - otras pestañas del mismo navegador (p. ej. Admin en una y Cliente en otra):
//   BroadcastChannel;
// - otros dispositivos: no hay canal; sus cambios se ven al volver a la pestaña
//   (useSincronizar), al cambiar de pantalla o al pulsar «Actualizar».

const EVENTO = 'cambio'
const local = new EventTarget()
const canal = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('cff-datos')

canal?.addEventListener('message', ({ data }) => {
  local.dispatchEvent(new CustomEvent(EVENTO, { detail: data }))
})

/** Anuncia que `ruta` cambió en la API (lo llama api/client.js tras cada escritura). */
export const notificarCambio = (ruta) => {
  const detalle = { ruta, en: Date.now() }
  local.dispatchEvent(new CustomEvent(EVENTO, { detail: detalle }))
  canal?.postMessage(detalle)
}

/** Se suscribe a los cambios; devuelve la función para desuscribirse. */
export const alCambiar = (fn) => {
  const manejador = (evento) => fn(evento.detail)
  local.addEventListener(EVENTO, manejador)
  return () => local.removeEventListener(EVENTO, manejador)
}
