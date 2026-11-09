// Validaciones de los formularios de acceso (RNF-15).
//
// Son validaciones de EXPERIENCIA, no de seguridad: todo lo que hay aquí se
// puede saltar con la consola abierta. Su trabajo es que el usuario sepa qué
// le falta antes de enviar, no proteger la cuenta. El back revalida la misma
// política, y cuando exponga GET /auth/politica-password estas constantes se
// alimentarán de ahí para no tener dos reglas que puedan divergir.

export const MINIMO_PASSWORD = 8

// Una regla por requisito, en vez de un único regex ilegible con lookaheads:
// así el formulario puede decir exactamente cuál falta.
export const REGLAS_PASSWORD = [
  { id: 'longitud', texto: `Al menos ${MINIMO_PASSWORD} caracteres`, prueba: /.{8,}/ },
  { id: 'mayuscula', texto: 'Una letra mayúscula', prueba: /[A-ZÁÉÍÓÚÑ]/ },
  { id: 'numero', texto: 'Un número', prueba: /\d/ },
  { id: 'especial', texto: 'Un carácter especial', prueba: /[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/ },
]

// Deliberadamente permisivo: validar correos con un regex exhaustivo rechaza
// direcciones válidas. Lo único que importa es detectar el error de dedo; el
// correo se verifica de verdad enviando el mensaje de confirmación.
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const reglasIncumplidas = (password) =>
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

export const validarConfirmacion = (password, confirmacion) => {
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

export const validarRegistro = ({ email, password, confirmacion }) => ({
  email: validarEmail(email),
  password: validarPassword(password),
  confirmacion: validarConfirmacion(password, confirmacion),
})

export const hayErrores = (errores) => Object.values(errores).some(Boolean)
