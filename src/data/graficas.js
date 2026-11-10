// Paletas de las gráficas (R23, R24, R28).
// Los valores hexadecimales viven en styles/theme.css; aquí solo se citan las
// variables, de modo que ningún color se escriba fuera del tema.

export const PALETA_TORTA = [
  'var(--cff-grafica-1)',
  'var(--cff-grafica-2)',
  'var(--cff-grafica-3)',
  'var(--cff-grafica-4)',
  'var(--cff-grafica-5)',
]

/** Nombre legible y color de cada categoría del catálogo. */
export const CATEGORIAS = {
  perros: { titulo: 'Perros Calientes', color: 'var(--cff-cat-perros)' },
  salchipapas: { titulo: 'Salchipapas', color: 'var(--cff-cat-salchipapas)' },
  hamburguesas: { titulo: 'Hamburguesas', color: 'var(--cff-cat-hamburguesas)' },
  bebidas: { titulo: 'Bebidas', color: 'var(--cff-cat-bebidas)' },
  acompañamientos: { titulo: 'Acompañamientos', color: 'var(--cff-cat-acompanamientos)' },
  combos: { titulo: 'Combos', color: 'var(--cff-cat-combos)' },
}

export const COLOR_SIN_CATEGORIA = 'var(--cff-cat-otros)'

/** Diez tonos distintos para repartir categorías de la carta en una gráfica. */
export const PALETA_CATEGORIAS = [
  'var(--cff-cat-perros)',
  'var(--cff-cat-hamburguesas)',
  'var(--cff-cat-bebidas)',
  'var(--cff-cat-salchipapas)',
  'var(--cff-cat-combos)',
  'var(--cff-cat-acompanamientos)',
  'var(--cff-grafica-2)',
  'var(--cff-grafica-4)',
  'var(--cff-grafica-5)',
  'var(--cff-grafica-3)',
]
