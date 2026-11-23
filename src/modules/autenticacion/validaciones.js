// Validaciones de los formularios de acceso (RNF-15).
//
// Son validaciones de EXPERIENCIA, no de seguridad: todo lo que hay aquí se
// puede saltar con la consola abierta. Su trabajo es que el usuario sepa qué
// le falta antes de enviar, no proteger la cuenta. El backend aplica la misma
// política al crear la cuenta (users.services.js) y rechaza lo que no la cumpla.

const MINIMO_PASSWORD = 8
const MAXIMO_PASSWORD = 60

// Una regla por requisito, en vez de un único regex ilegible con lookaheads:
// así el formulario puede decir exactamente cuál falta. Mayúscula, minúscula y
// símbolo son los que acepta el backend: letras sin tilde y estos símbolos.
export const REGLAS_PASSWORD = [
  {
    id: 'longitud',
    texto: `Entre ${MINIMO_PASSWORD} y ${MAXIMO_PASSWORD} caracteres, sin espacios`,
    prueba: /^\S{8,60}$/,
  },
  { id: 'mayuscula', texto: 'Una letra mayúscula', prueba: /[A-Z]/ },
  { id: 'minuscula', texto: 'Una letra minúscula', prueba: /[a-z]/ },
  { id: 'numero', texto: 'Un número', prueba: /\d/ },
  {
    id: 'especial',
    texto: 'Un símbolo (! @ # $ % & * . - _ …)',
    prueba: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/,
  },
]

// Deliberadamente permisivo: validar correos con un regex exhaustivo rechaza
// direcciones válidas. Es el mismo formato que exige el modelo User del backend.
const FORMATO_EMAIL = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

const reglasIncumplidas = (password) =>
  REGLAS_PASSWORD.filter((regla) => !regla.prueba.test(password ?? ''))

export const esPasswordValida = (password) => reglasIncumplidas(password).length === 0

export const validarEmail = (email) => {
  const valor = (email ?? '').trim()
  if (!valor) return 'Escribe tu correo.'
  if (!FORMATO_EMAIL.test(valor)) return 'Ese correo no parece válido.'
  return null
}

/** Mensaje único para el input de contraseña; null si cumple. */
export const validarPassword = (password) => {
  if (!password) return 'Escribe una contraseña.'
  const faltan = reglasIncumplidas(password)
  if (faltan.length === 0) return null
  return `Falta: ${faltan.map((regla) => regla.texto.toLowerCase()).join(', ')}.`
}

const validarConfirmacion = (password, confirmacion) => {
  if (!confirmacion) return 'Repite la contraseña.'
  if (password !== confirmacion) return 'Las contraseñas no coinciden.'
  return null
}

/**
 * En el LOGIN no se aplica la política de contraseña: una cuenta creada antes
 * de endurecerla seguiría cumpliendo para entrar, y señalar "tu contraseña es
 * débil" en el login le dice a un atacante que acertó el formato. Solo se
 * comprueba que los campos no vayan vacíos.
 */
export const validarLogin = ({ email, password }) => ({
  email: validarEmail(email),
  password: password ? null : 'Escribe tu contraseña.',
})

// Mismo formato que exige el modelo User del backend: celular colombiano, con o sin +57.
const FORMATO_TELEFONO = /^(?:\+57)?3[0-9]{9}$/

/** Nombre y teléfono son opcionales: vacíos no dan error; con valor se validan. */
const validarNombre = (nombre) =>
  (nombre ?? '').trim().length > 100 ? 'Máximo 100 caracteres.' : null

const validarTelefono = (telefono) => {
  const valor = (telefono ?? '').replace(/\s+/g, '')
  if (!valor) return null
  return FORMATO_TELEFONO.test(valor) ? null : 'Celular colombiano: 3XXXXXXXXX, con o sin +57.'
}

export const validarRegistro = ({ nombre, telefono, email, password, confirmacion }) => ({
  nombre: validarNombre(nombre),
  telefono: validarTelefono(telefono),
  email: validarEmail(email),
  password: validarPassword(password),
  confirmacion: validarConfirmacion(password, confirmacion),
})

export const hayErrores = (errores) => Object.values(errores).some(Boolean)

/**
 * Traduce el error del backend al registrarse a un mensaje para la persona.
 *
 * El "correo ya registrado" NO se muestra tal cual: confirmaría que ese correo
 * tiene cuenta, que es la misma enumeración de usuarios que R63 evita en el
 * login. Cae en el mensaje genérico, igual que cualquier fallo desconocido.
 */
export const mensajeErrorRegistro = (error) => {
  // Error de axios: sin `response` no hubo respuesta del servidor.
  if (!error?.response) return 'No se pudo conectar con el servidor. Inténtalo de nuevo.'

  // El backend responde { msg } o, en validaciones, { campo: mensaje }.
  const cuerpo = error.response.data ?? {}
  const texto = String(cuerpo.msg ?? Object.values(cuerpo).find((v) => typeof v === 'string') ?? '').toLowerCase()

  if (error.response.status === 429) {
    return 'Demasiados intentos seguidos. Espera unos minutos y vuelve a probar.'
  }
  if (texto.includes('contraseña')) {
    return 'La contraseña no cumple la política de seguridad del servidor.'
  }
  if (texto.includes('correo') && texto.includes('formato')) {
    return 'Revisa el formato del correo electrónico.'
  }
  return 'No pudimos crear la cuenta. Si ya tienes una con ese correo, inicia sesión; si no, inténtalo de nuevo en unos minutos.'
}
