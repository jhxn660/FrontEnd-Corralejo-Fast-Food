// Error único de la capa de red. La UI nunca inspecciona `response`: lee
// `codigo` o `estado`, de modo que cambiar fetch por otra librería no obliga a
// tocar ninguna pantalla.

export class ErrorApi extends Error {
  constructor({ mensaje, estado = 0, codigo = 'DESCONOCIDO', campos = null, ruta = '' }) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.estado = estado
    this.codigo = codigo
    this.campos = campos // { campo: motivo } para pintar errores por input
    this.ruta = ruta
  }

  get esDeRed() {
    return this.estado === 0
  }

  get esConflicto() {
    return this.estado === 409 // RNF-12: otro empleado modificó el registro
  }

  get esProhibido() {
    return this.estado === 403 // RF-44: ventana de modificación expirada
  }
}

const MENSAJES = {
  400: 'Revisa los datos enviados.',
  401: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  403: 'No tienes permiso para esta acción.',
  404: 'No encontramos lo que buscabas.',
  409: 'Alguien más modificó este registro. Recarga antes de guardar.',
  422: 'Hay campos inválidos.',
  429: 'Demasiados intentos. Espera unos minutos.',
  500: 'La API tuvo un problema. Inténtalo de nuevo.',
}

/** Traduce la respuesta de error del back al contrato { error: {codigo, mensaje, campos} }. */
export const desdeRespuesta = (estado, cuerpo, ruta) => {
  const error = cuerpo?.error ?? {}
  return new ErrorApi({
    mensaje: error.mensaje ?? MENSAJES[estado] ?? `La API respondió ${estado}.`,
    estado,
    codigo: error.codigo ?? `HTTP_${estado}`,
    campos: error.campos ?? null,
    ruta,
  })
}

export const errorDeRed = (ruta) =>
  new ErrorApi({
    mensaje: `No se pudo conectar con la API. Verifica que esté en marcha.`,
    codigo: 'SIN_CONEXION',
    ruta,
  })

export const errorDeTimeout = (ruta, ms) =>
  new ErrorApi({
    mensaje: `La API no respondió en ${ms / 1000}s.`,
    codigo: 'TIMEOUT',
    ruta,
  })
