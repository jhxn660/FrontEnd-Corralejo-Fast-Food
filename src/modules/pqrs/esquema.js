// Esquema de PQRS de la pantalla, compartido por los paneles del cliente, el empleado y la
// administración. Registro (ver aPqrsUi en api.js):
//   { id, tipo, nombre, asunto, texto, fecha (ISO), estado, usuario, respuesta, fechaRespuesta }

/** Cada tipo con su icono y la frase que explica para qué sirve. */
const TIPOS = {
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

// Los mismos estados que acepta el backend (modelo PQRS).
export const ESTADOS = ['Pendiente', 'En proceso', 'Resuelto', 'Cerrado']

export const COLOR_ESTADO = {
  Pendiente: 'warning',
  'En proceso': 'info',
  Resuelto: 'success',
  Cerrado: 'secondary',
}

export const ICONO_ESTADO = {
  Pendiente: 'fa-hourglass-half',
  'En proceso': 'fa-magnifying-glass',
  Resuelto: 'fa-circle-check',
  Cerrado: 'fa-lock',
}

export const iconoDe = (tipo) => TIPOS[tipo]?.icono ?? TIPOS.Petición.icono
export const colorDe = (tipo) => TIPOS[tipo]?.color ?? 'var(--cff-cat-otros)'
export const ayudaDe = (tipo) => TIPOS[tipo]?.ayuda ?? ''

export const pqrsVacia = (tipo = 'Petición') => ({
  tipo,
  asunto: '',
  texto: '',
  estado: 'Pendiente',
})

const LARGO_MINIMO_TEXTO = 15
export const LARGO_MAXIMO_TEXTO = 1000

/**
 * Revisa la PQRS antes de enviarla y devuelve los errores por campo (vacío = válida).
 * Se hace antes de la petición para señalar el campo exacto; el backend también valida.
 */
export const validarPqrs = (valores) => {
  const fallos = {}
  const asunto = valores.asunto?.trim() ?? ''
  const texto = valores.texto?.trim() ?? ''

  if (!asunto) fallos.asunto = 'Escribe un asunto breve.'
  else if (asunto.length < 5) fallos.asunto = 'Al menos 5 caracteres.'

  if (!texto) fallos.texto = 'Cuéntanos los detalles.'
  else if (texto.length < LARGO_MINIMO_TEXTO) {
    fallos.texto = `Al menos ${LARGO_MINIMO_TEXTO} caracteres para poder atenderlo.`
  }

  return fallos
}

export const hayFallos = (fallos) => Object.keys(fallos).length > 0
