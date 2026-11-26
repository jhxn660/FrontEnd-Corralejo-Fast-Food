<<<<<<< HEAD
// Esquema de PQRS de la pantalla, compartido por los paneles del cliente, el empleado y la
// administración. Registro (ver aPqrsUi en api.js):
//   { id, tipo, nombre, asunto, texto, fecha (ISO), estado, usuario, respuesta, fechaRespuesta }

/** Cada tipo con su icono y la frase que explica para qué sirve. */
const TIPOS = {
=======
// Esquema único de PQRS, compartido por el panel del cliente y el del empleado.
// Antes cada pantalla guardaba campos distintos sobre la misma colección
// (asunto/descripcion vs nombre/texto), así que los registros no se veían entre sí.
//
// Registro: { id, tipo, nombre, asunto, texto, fecha (ISO), estado, usuario }

/** Cada tipo con su icono y la frase que explica para qué sirve. */
export const TIPOS = {
>>>>>>> origin/main
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

<<<<<<< HEAD
// Los mismos estados que acepta el backend (modelo PQRS).
export const ESTADOS = ['Pendiente', 'En proceso', 'Resuelto', 'Cerrado']

export const COLOR_ESTADO = {
  Pendiente: 'warning',
  'En proceso': 'info',
  Resuelto: 'success',
  Cerrado: 'secondary',
=======
export const ESTADOS = ['Pendiente', 'En revisión', 'Resuelta']

export const COLOR_ESTADO = {
  Pendiente: 'warning',
  'En revisión': 'info',
  Resuelta: 'success',
>>>>>>> origin/main
}

export const ICONO_ESTADO = {
  Pendiente: 'fa-hourglass-half',
<<<<<<< HEAD
  'En proceso': 'fa-magnifying-glass',
  Resuelto: 'fa-circle-check',
  Cerrado: 'fa-lock',
=======
  'En revisión': 'fa-magnifying-glass',
  Resuelta: 'fa-circle-check',
>>>>>>> origin/main
}

export const iconoDe = (tipo) => TIPOS[tipo]?.icono ?? TIPOS.Petición.icono
export const colorDe = (tipo) => TIPOS[tipo]?.color ?? 'var(--cff-cat-otros)'
export const ayudaDe = (tipo) => TIPOS[tipo]?.ayuda ?? ''

export const pqrsVacia = (tipo = 'Petición') => ({
  tipo,
<<<<<<< HEAD
=======
  nombre: '',
>>>>>>> origin/main
  asunto: '',
  texto: '',
  estado: 'Pendiente',
})

<<<<<<< HEAD
const LARGO_MINIMO_TEXTO = 15
export const LARGO_MAXIMO_TEXTO = 1000

/**
 * Revisa la PQRS antes de enviarla y devuelve los errores por campo (vacío = válida).
 * Se hace antes de la petición para señalar el campo exacto; el backend también valida.
 */
export const validarPqrs = (valores) => {
=======
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
>>>>>>> origin/main
  const fallos = {}
  const asunto = valores.asunto?.trim() ?? ''
  const texto = valores.texto?.trim() ?? ''

  if (!asunto) fallos.asunto = 'Escribe un asunto breve.'
  else if (asunto.length < 5) fallos.asunto = 'Al menos 5 caracteres.'

  if (!texto) fallos.texto = 'Cuéntanos los detalles.'
  else if (texto.length < LARGO_MINIMO_TEXTO) {
    fallos.texto = `Al menos ${LARGO_MINIMO_TEXTO} caracteres para poder atenderlo.`
  }

<<<<<<< HEAD
=======
  if (conSolicitante && !valores.nombre?.trim()) {
    fallos.nombre = 'Indica de parte de quién es la solicitud.'
  }

>>>>>>> origin/main
  return fallos
}

export const hayFallos = (fallos) => Object.keys(fallos).length > 0
<<<<<<< HEAD
=======

/**
 * Nombre que se muestra en el muro público. Cuando el cliente no escribe un
 * nombre, la solicitud guarda su correo como nombre; publicarlo tal cual sería
 * exponer el correo de alguien, así que se recorta y se enmascara.
 */
export const nombrePublico = (nombre) => {
  const texto = String(nombre ?? '').trim()
  if (!texto) return 'Cliente'
  if (!texto.includes('@')) return texto
  return `${texto.split('@')[0].slice(0, 3)}***`
}
>>>>>>> origin/main
