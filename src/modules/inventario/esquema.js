// Esquema del módulo de inventario: categorías, unidades y forma del registro.
// Vive en el módulo porque solo el inventario lo usa (R42), y aparte de la
// pantalla para que el formulario y el detalle lean la misma definición.

/**
 * Cada categoría trae su icono y la variable de color con la que se pinta su
 * tarjeta. El color se cita como var(--cff-…) para que ningún hexadecimal viva
 * fuera de theme.css (R28).
 */
export const CATEGORIAS = {
  Harinas: { icono: 'fa-solid fa-wheat-awn', color: 'var(--cff-cat-acompanamientos)' },
  Carnes: { icono: 'fa-solid fa-drumstick-bite', color: 'var(--cff-cat-salchipapas)' },
  Embutidos: { icono: 'fa-solid fa-hotdog', color: 'var(--cff-cat-perros)' },
  Lácteos: { icono: 'fa-solid fa-cheese', color: 'var(--cff-cat-acompanamientos)' },
  Verduras: { icono: 'fa-solid fa-leaf', color: 'var(--cff-cat-hamburguesas)' },
  Aceites: { icono: 'fa-solid fa-bottle-droplet', color: 'var(--cff-cat-acompanamientos)' },
  Salsas: { icono: 'fa-solid fa-jar', color: 'var(--cff-cat-salchipapas)' },
  Panadería: { icono: 'fa-solid fa-bread-slice', color: 'var(--cff-cat-perros)' },
  Bebidas: { icono: 'fa-solid fa-bottle-water', color: 'var(--cff-cat-bebidas)' },
  Abarrotes: { icono: 'fa-solid fa-box-open', color: 'var(--cff-cat-otros)' },
  Congelados: { icono: 'fa-solid fa-snowflake', color: 'var(--cff-cat-bebidas)' },
  Desechables: { icono: 'fa-solid fa-utensils', color: 'var(--cff-cat-otros)' },
}

export const NOMBRES_CATEGORIA = Object.keys(CATEGORIAS)

export const UNIDADES = [
  'Kilogramos (kg)',
  'Gramos (g)',
  'Litros (L)',
  'Mililitros (ml)',
  'Unidades (u)',
  'Paquetes (paq)',
]

export const ESTADOS = ['Disponible', 'Fuera de stock']

export const INSUMO_VACIO = {
  nombre: '',
  descripcion: '',
  categoria: NOMBRES_CATEGORIA[0],
  unidad: UNIDADES[0],
  estado: 'Disponible',
  stockActual: '',
  stockMinimo: '',
  costo: '',
  vencimiento: '',
  pesoUnidad: '',
  calorias: '',
  proveedor: '',
}

export const iconoDe = (categoria) =>
  CATEGORIAS[categoria]?.icono ?? 'fa-solid fa-box'

export const colorDe = (categoria) =>
  CATEGORIAS[categoria]?.color ?? 'var(--cff-cat-otros)'

/** "Kilogramos (kg)" → "kg". La tarjeta compacta no tiene sitio para el resto. */
export const abreviatura = (unidad = '') => unidad.match(/\(([^)]+)\)/)?.[1] ?? unidad

/** "2026-07-10" → "10/07/2026", sin pasar por la zona horaria. */
export const fechaLegible = (iso) => (iso ? iso.split('-').reverse().join('/') : '---')

/**
 * Semáforo del stock. Tres niveles y no dos: "por debajo del mínimo" y "justo
 * en el mínimo" piden acciones distintas, y un único booleano no las distingue.
 */
export const nivelDe = (insumo) => {
  const actual = Number(insumo.stockActual) || 0
  const minimo = Number(insumo.stockMinimo) || 0

  if (actual <= 0) return { clave: 'agotado', etiqueta: 'Agotado', color: 'danger' }
  if (actual <= minimo) return { clave: 'bajo', etiqueta: 'Stock bajo', color: 'danger' }
  if (actual <= minimo * 1.5) return { clave: 'justo', etiqueta: 'Stock justo', color: 'warning' }
  return { clave: 'suficiente', etiqueta: 'Stock suficiente', color: 'success' }
}

/**
 * Cuánto se llena la barra de la tarjeta. El 100% se ancla al doble del mínimo
 * —el punto en el que ya no hay que reponer— y no al stock más alto del
 * almacén: si no, un insumo que se compra por toneladas aplastaría la barra de
 * todos los demás.
 */
export const porcentajeStock = (insumo) => {
  const actual = Number(insumo.stockActual) || 0
  const minimo = Number(insumo.stockMinimo) || 0
  const techo = minimo > 0 ? minimo * 2 : Math.max(actual, 1)
  return Math.min(100, Math.round((actual / techo) * 100))
}

/** Días hasta el vencimiento; null si el insumo no tiene fecha. */
export const diasParaVencer = (iso) => {
  if (!iso) return null
  const [año, mes, dia] = iso.split('-').map(Number)
  if (!año || !mes || !dia) return null
  const vence = new Date(año, mes - 1, dia)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return Math.round((vence - hoy) / 86400000)
}
