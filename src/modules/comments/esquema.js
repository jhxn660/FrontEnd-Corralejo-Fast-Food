// Reglas de presentación de los comentarios del muro público.

/**
 * Nombre que se muestra en el muro público. Cuando una cuenta no tiene nombre, su correo
 * hace de nombre; publicarlo tal cual sería exponer el correo de alguien, así que se recorta
 * y se enmascara.
 */
export const nombrePublico = (nombre) => {
  const texto = String(nombre ?? '').trim()
  if (!texto) return 'Cliente'
  if (!texto.includes('@')) return texto
  return `${texto.split('@')[0].slice(0, 3)}***`
}
