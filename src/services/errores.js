// Error único de la capa de red. La UI nunca inspecciona `response`: lee
// `mensaje` o `estado`, de modo que cambiar fetch por otra librería no obliga a
// tocar ninguna pantalla.

export class ErrorApi extends Error {
  constructor({ mensaje, estado = 0, codigo = 'DESCONOCIDO', ruta = '', detalle = null }) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
    this.codigo = codigo
    this.ruta = ruta
    // Datos extra de la respuesta (p. ej. los mensajes por campo de un 400).
    this.detalle = detalle
  }
}

const MENSAJES = {
  400: 'Revisa los datos enviados.',
  404: 'No encontramos lo que buscabas.',
  409: 'Alguien más modificó este registro. Recarga antes de guardar.',
  422: 'Hay campos inválidos.',
  500: 'La API tuvo un problema. Inténtalo de nuevo.',
}

/**
 * El backend responde los errores como `{ msg }` y los de validación como
 * `{ campo: mensaje }`. Se muestra `msg`; si no viene, el primer mensaje de
 * campo; y si tampoco, el texto genérico del estado HTTP.
 */
export const desdeRespuesta = (estado, ruta, cuerpo = null) => {
  const { msg, ...detalle } = cuerpo && typeof cuerpo === 'object' ? cuerpo : {}
  const deCampo = Object.values(detalle).find((valor) => typeof valor === 'string' && valor)
  const mensaje = typeof msg === 'string' && msg ? msg : deCampo
  return new ErrorApi({
    mensaje: mensaje || (MENSAJES[estado] ?? `La API respondió ${estado}.`),
    estado,
    codigo: `HTTP_${estado}`,
    ruta,
    detalle: Object.keys(detalle).length > 0 ? detalle : null,
  })
}

export const errorDeRed = (ruta, comoArrancar = 'el backend (npm run dev en Backend-Corralejo-Fast-Food)') =>
  new ErrorApi({
    mensaje: `No se pudo conectar con la API. Verifica que ${comoArrancar} esté en marcha.`,
    codigo: 'SIN_CONEXION',
    ruta,
  })

export const errorDeTimeout = (ruta, ms) =>
  new ErrorApi({
    mensaje: `La API no respondió en ${ms / 1000}s.`,
    codigo: 'TIMEOUT',
    ruta,
  })
