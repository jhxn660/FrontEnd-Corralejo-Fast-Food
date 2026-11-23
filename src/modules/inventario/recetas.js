// RECETAS E INVENTARIO: la fórmula, en un solo sitio.
//
// Lo importan el servidor Express (server/api) Y la interfaz (Pedidos, editor
// de recetas). Por eso son funciones puras, sin imports ni `import.meta.env`:
// Node y Vite las cargan igual, y la regla que decide si un plato se puede
// vender es exactamente la misma en el navegador y en el servidor.
//
// Forma de una receta, guardada en cada plato de `adminMenu[].items[]`:
//   receta: [{ insumo_id: '3', cantidad_requerida: 0.125 }, …]
// `cantidad_requerida` está en la unidad del insumo (kg, L, u…).

const DECIMALES = 1e4
// Margen para la coma flotante: 0.3 / 0.1 da 2.9999999999999996 y, sin él,
// Math.floor diría que alcanza para 2 cuando alcanza para 3.
const EPSILON = 1e-9

/** Redondeo a 4 decimales tras cada suma o resta de stock (32.5 − 0.45 ≠ 32.05 en JS). */
export const redondear = (valor) => Math.round((Number(valor) || 0) * DECIMALES) / DECIMALES

const SUFIJO_COMBO = ' (combo)'

/** "Hamburguesa Doble (combo)" → "Hamburguesa Doble". El combo gasta la receta del plato. */
export const nombreBase = (nombre) => String(nombre ?? '').replace(SUFIJO_COMBO, '').trim()

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
 * (todavía nadie le asignó insumos) y se sigue vendiendo como antes. Un insumo
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

/** "0,3 kg de Papa pastusa (hay 0,1)" — el texto que ve quien factura. */
export const describirFaltante = ({ nombre, unidad, requerido, disponible }) => {
  const corta = String(unidad).match(/\(([^)]+)\)/)?.[1] ?? unidad
  return `${nombre}: se necesitan ${requerido} ${corta} y hay ${disponible}`
}
