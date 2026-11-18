// Error único de la capa de red. La UI nunca inspecciona `response`: lee
// `mensaje` o `estado`, de modo que cambiar fetch por otra librería no obliga a
// tocar ninguna pantalla.

export class ErrorApi extends Error {
  constructor({ mensaje, estado = 0, codigo = 'DESCONOCIDO', ruta = '' }) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
    this.codigo = codigo
    this.ruta = ruta
  }
}

const MENSAJES = {
  400: 'Revisa los datos enviados.',
  404: 'No encontramos lo que buscabas.',
  409: 'Alguien más modificó este registro. Recarga antes de guardar.',
  422: 'Hay campos inválidos.',
  500: 'La API tuvo un problema. Inténtalo de nuevo.',
}

/** json-server no trae un cuerpo de error útil: el mensaje sale del estado. */
export const desdeRespuesta = (estado, ruta) =>
  new ErrorApi({
    mensaje: MENSAJES[estado] ?? `La API respondió ${estado}.`,
    estado,
    codigo: `HTTP_${estado}`,
    ruta,
  })

export const errorDeRed = (ruta) =>
  new ErrorApi({
    mensaje: 'No se pudo conectar con la API. Verifica que json-server esté en marcha (npm run api).',
    codigo: 'SIN_CONEXION',
    ruta,
  })

export const errorDeTimeout = (ruta, ms) =>
  new ErrorApi({
    mensaje: `La API no respondió en ${ms / 1000}s.`,
    codigo: 'TIMEOUT',
    ruta,
  })
