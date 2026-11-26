// RECETAS E INVENTARIO: las fórmulas, en un solo sitio (funciones puras, sin peticiones).
//
// Forma de una receta en la pantalla (recipes/api.js la traduce desde el backend):
//   receta: [{ insumo_id: '<_id del insumo>', cantidad_requerida: 0.125 }, …]
// `cantidad_requerida` está en la unidad del insumo (kg, L, u…). El backend aplica las mismas
// reglas al vender: descuenta los insumos y responde 409 si no alcanzan.

const DECIMALES = 1e4
// Margen para la coma flotante: 0.3 / 0.1 da 2.9999999999999996 y, sin él,
// Math.floor diría que alcanza para 2 cuando alcanza para 3.
const EPSILON = 1e-9

/** Redondeo a 4 decimales tras cada suma o resta de stock (32.5 − 0.45 ≠ 32.05 en JS). */
export const redondear = (valor) => Math.round((Number(valor) || 0) * DECIMALES) / DECIMALES

/** Normaliza y descarta líneas inválidas: sin insumo o con cantidad ≤ 0. */
export const limpiarReceta = (receta) =>
  (Array.isArray(receta) ? receta : [])
    .map((linea) => ({
      insumo_id: String(linea?.insumo_id ?? '').trim(),
      cantidad_requerida: redondear(linea?.cantidad_requerida),
    }))
    .filter((linea) => linea.insumo_id && linea.cantidad_requerida > 0)

/**
 * Cuántas unidades de un plato se pueden preparar con el stock dado.
 *   min( floor(stock_i / cantidad_i) )  sobre cada insumo de la receta.
 *
 * Devuelve `null` si el plato no tiene receta: no lo controla el inventario
 * (todavía nadie le asignó insumos) y se vende sin límite. Un insumo
 * que ya no existe cuenta como stock 0.
 *
 * @param {Array} receta
 * @param {(id: string) => number} stockDe  stock actual de un insumo
 */
export const unidadesPosibles = (receta, stockDe) => {
  const lineas = limpiarReceta(receta)
  if (lineas.length === 0) return null

  return Math.max(
    0,
    Math.min(
      ...lineas.map((linea) =>
        Math.floor((Number(stockDe(linea.insumo_id)) || 0) / linea.cantidad_requerida + EPSILON)
      )
    )
  )
}

/**
 * Consumo total de insumos de varias líneas de pedido. Suma por insumo, así
 * que dos platos que comparten pan o papa se cuentan juntos: es lo que impide
 * aprobar dos platos que, por separado, alcanzan, pero juntos no.
 *
 * @param {Array<{ receta: Array, cantidad: number }>} lineas
 * @returns {Map<string, number>}  insumo_id → cantidad total
 */
export const consumoDe = (lineas) => {
  const total = new Map()
  lineas.forEach(({ receta, cantidad }) => {
    const veces = Number(cantidad) || 0
    if (veces <= 0) return
    limpiarReceta(receta).forEach(({ insumo_id, cantidad_requerida }) => {
      total.set(insumo_id, redondear((total.get(insumo_id) ?? 0) + cantidad_requerida * veces))
    })
  })
  return total
}

/**
 * Los insumos que no alcanzan para un consumo. Lista vacía = se puede facturar.
 *
 * @param {Map<string, number>} consumo
 * @param {(id: string) => ({ nombre, unidad, stockActual } | undefined)} insumoDe
 */
export const faltantesDe = (consumo, insumoDe) =>
  [...consumo.entries()]
    .map(([insumo_id, requerido]) => {
      const insumo = insumoDe(insumo_id)
      const disponible = redondear(insumo?.stockActual)
      return {
        insumo_id,
        nombre: insumo?.nombre ?? `Insumo ${insumo_id} (ya no existe)`,
        unidad: insumo?.unidad ?? '',
        requerido,
        disponible,
        faltante: redondear(requerido - disponible),
      }
    })
    .filter((linea) => linea.faltante > EPSILON)

/** Color del aviso "alcanza para N": rojo si no alcanza, amarillo si quedan pocas, verde si sobra. */
export const colorAlcance = (unidades) => {
  if (unidades === 0) return 'bg-danger'
  if (unidades <= 5) return 'bg-warning text-dark'
  return 'bg-success'
}

/** «Papa pastusa: se necesitan 0.3 kg y hay 0.1»: el texto que ve quien factura. */
export const describirFaltante = ({ nombre, unidad, requerido, disponible }) => {
  const corta = String(unidad).match(/\(([^)]+)\)/)?.[1] ?? unidad
  return `${nombre}: se necesitan ${requerido} ${corta} y hay ${disponible}`
}
