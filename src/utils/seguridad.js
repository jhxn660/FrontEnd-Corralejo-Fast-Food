// Comprobaciones de seguridad que hace la interfaz antes de pintar contenido
// que viene de la API. No sustituyen a las del servidor: evitan que un
// dato malicioso guardado allí llegue a la pantalla de otros usuarios.

const HOSTS_MAPA = new Set(['www.google.com', 'google.com', 'maps.google.com'])

/**
 * ¿Es esta URL un mapa insertado de Google Maps?
 *
 * La ficha del local guarda una URL que se pinta en un <iframe> en el panel de TODOS los
 * clientes. Comprobar solo que contenga "/maps/embed" no basta: también lo cumple
 * `https://sitio-falso.com/?/maps/embed`, que incrustaría una página falsa. Por eso se
 * analiza la URL completa: protocolo https, dominio de Google y ruta de inserción.
 */
export const esMapaDeGoogle = (valor) => {
  try {
    const url = new URL(String(valor ?? ''))
    return (
      url.protocol === 'https:' &&
      HOSTS_MAPA.has(url.hostname) &&
      url.pathname.startsWith('/maps/embed')
    )
  } catch {
    return false
  }
}
