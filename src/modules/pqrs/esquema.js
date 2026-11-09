// Esquema único de PQRS, compartido por el panel del cliente y el del empleado.
// Antes cada pantalla guardaba campos distintos sobre la misma colección
// (asunto/descripcion vs nombre/texto), así que los registros no se veían entre sí.
//
// Registro: { id, tipo, nombre, asunto, texto, fecha (ISO), estado, usuario }

/** Cada tipo con su icono y la frase que explica para qué sirve. */
export const TIPOS = {
  Petición: {
    icono: 'fa-file-lines',
    ayuda: 'Pide información o un trámite concreto.',
    color: 'var(--cff-cat-bebidas)',
  },
  Queja: {
    icono: 'fa-bullhorn',
    ayuda: 'Cuéntanos qué no estuvo a la altura.',
    color: 'var(--cff-cat-acompanamientos)',
  },
  Reclamo: {
    icono: 'fa-triangle-exclamation',
    ayuda: 'Reporta un cobro o un pedido con problemas.',
    color: 'var(--cff-cat-salchipapas)',
  },
  Sugerencia: {
    icono: 'fa-lightbulb',
    ayuda: 'Propón algo que podamos mejorar.',
    color: 'var(--cff-cat-hamburguesas)',
  },
}

export const NOMBRES_TIPO = Object.keys(TIPOS)

export const ESTADOS = ['Pendiente', 'En revisión', 'Resuelta']

export const COLOR_ESTADO = {
  Pendiente: 'warning',
  'En revisión': 'info',
  Resuelta: 'success',
}

export const ICONO_ESTADO = {
  Pendiente: 'fa-hourglass-half',
  'En revisión': 'fa-magnifying-glass',
  Resuelta: 'fa-circle-check',
}

export const iconoDe = (tipo) => TIPOS[tipo]?.icono ?? TIPOS.Petición.icono
export const colorDe = (tipo) => TIPOS[tipo]?.color ?? 'var(--cff-cat-otros)'
export const ayudaDe = (tipo) => TIPOS[tipo]?.ayuda ?? ''

export const pqrsVacia = (tipo = 'Petición') => ({
  tipo,
  nombre: '',
  asunto: '',
  texto: '',
  estado: 'Pendiente',
})

export const LARGO_MINIMO_TEXTO = 15
export const LARGO_MAXIMO_TEXTO = 1000

/**
 * Validación de experiencia, no de seguridad: el back revalida (R61). Se
 * ejecuta antes de la llamada de red para no gastar un viaje y para poder
 * señalar el campo exacto que falta.
 *
 * `conSolicitante` solo lo pide el panel del empleado, que registra la PQRS en
 * nombre de alguien; en el del cliente el nombre sale de su propia sesión.
 */
export const validarPqrs = (valores, { conSolicitante = false } = {}) => {
  const fallos = {}
  const asunto = valores.asunto?.trim() ?? ''
  const texto = valores.texto?.trim() ?? ''

  if (!asunto) fallos.asunto = 'Escribe un asunto breve.'
  else if (asunto.length < 5) fallos.asunto = 'Al menos 5 caracteres.'

  if (!texto) fallos.texto = 'Cuéntanos los detalles.'
  else if (texto.length < LARGO_MINIMO_TEXTO) {
    fallos.texto = `Al menos ${LARGO_MINIMO_TEXTO} caracteres para poder atenderlo.`
  }

  if (conSolicitante && !valores.nombre?.trim()) {
    fallos.nombre = 'Indica de parte de quién es la solicitud.'
  }

  return fallos
}

export const hayFallos = (fallos) => Object.keys(fallos).length > 0
