// ESCALA DE VALORACIÓN: entero de 1 a 10 sobre 5 estrellas.
//
// Cada unidad es media estrella: 1 = ½★, 2 = 1★, 3 = 1½★ … 10 = 5★.
// Se guarda `valoracion` (1-10) y, junto a ella, `estrellas` = valoracion / 2
// (0.5-5): los indicadores (indicadores/calculos.js) y la moderación siguen
// leyendo `estrellas`, así que ninguno de los dos cambia.
//
// Registros anteriores a esta escala solo traen `estrellas` (entero 1-5): se
// leen como el doble (5★ → 10). No hace falta migrar db.json.

export const VALORACION_MAXIMA = 10

const acotar = (numero) => Math.max(0, Math.min(VALORACION_MAXIMA, Math.round(numero)))

/** Valoración 0-10 de un registro (0 = sin valoración: comentario del muro). */
export const valoracionDe = (registro) => {
  const valoracion = Number(registro?.valoracion)
  if (valoracion > 0) return acotar(valoracion)
  const estrellas = Number(registro?.estrellas)
  return estrellas > 0 ? acotar(estrellas * 2) : 0
}

/** 1-10 → 0.5-5, lo que pinta Estrellas. */
export const estrellasDe = (valoracion) => acotar(valoracion) / 2
