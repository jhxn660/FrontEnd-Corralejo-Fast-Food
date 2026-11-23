import logo from '../../assets/logo.png'

// Presentación de la carta: iconos, emojis y tonos por categoría (R23, R24).
//
// Las categorías de la carta las crea el administrador, así que no se pueden
// enumerar de antemano como sí se hace con las del inventario. Por eso aquí no
// hay una tabla fija por nombre: hay reglas que se aplican a cualquier nombre,
// y un reparto determinista para lo que no encaje en ninguna.

/** Tonos disponibles; el valor real de cada color vive en theme.css (R28). */
const TONOS = [
  'var(--cff-cat-perros)',
  'var(--cff-cat-salchipapas)',
  'var(--cff-cat-hamburguesas)',
  'var(--cff-cat-bebidas)',
  'var(--cff-cat-acompanamientos)',
  'var(--cff-cat-combos)',
]

/**
 * Palabras que identifican un plato. Se busca primero en el nombre del plato y
 * después en el de su categoría, porque "Mazorcada Carne" dentro de "Carnes"
 * es una mazorca, no un corte de res.
 */
const PISTAS = [
  { claves: ['hamburgues', 'burger'], emoji: '🍔', icono: 'fa-burger', tono: TONOS[2] },
  { claves: ['perro', 'hot dog'], emoji: '🌭', icono: 'fa-hotdog', tono: TONOS[0] },
  { claves: ['salchipapa', 'papa', 'francesa'], emoji: '🍟', icono: 'fa-bowl-food', tono: TONOS[1] },
  { claves: ['mazorca'], emoji: '🌽', icono: 'fa-bowl-food', tono: TONOS[4] },
  { claves: ['burrito'], emoji: '🌯', icono: 'fa-pepper-hot', tono: TONOS[4] },
  { claves: ['tortilla', 'arepa'], emoji: '🫓', icono: 'fa-cookie', tono: TONOS[4] },
  { claves: ['costilla', 'carne', 'churrasco', 'lomo', 'res', 'cerdo'], emoji: '🍖', icono: 'fa-drumstick-bite', tono: TONOS[1] },
  { claves: ['pollo', 'alita', 'nugget'], emoji: '🍗', icono: 'fa-drumstick-bite', tono: TONOS[4] },
  { claves: ['gaseosa', 'bebida', 'jugo', 'limonada', 'malteada', 'agua', 'cerveza'], emoji: '🥤', icono: 'fa-glass-water', tono: TONOS[3] },
  { claves: ['combo', 'familiar'], emoji: '⭐', icono: 'fa-star', tono: TONOS[5] },
  { claves: ['postre', 'helado', 'torta', 'brownie'], emoji: '🍰', icono: 'fa-cake-candles', tono: TONOS[5] },
  { claves: ['entrada', 'picada', 'aperitivo'], emoji: '🍢', icono: 'fa-utensils', tono: TONOS[0] },
  { claves: ['ensalada', 'veggie', 'vegetal'], emoji: '🥗', icono: 'fa-leaf', tono: TONOS[2] },
  { claves: ['adicional', 'extra', 'acompañ', 'salsa', 'queso'], emoji: '🧂', icono: 'fa-plus', tono: TONOS[4] },
]

const normalizar = (texto) =>
  String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const pistaDe = (...textos) => {
  const buscar = textos.map(normalizar)
  for (const texto of buscar) {
    const encontrada = PISTAS.find(({ claves }) =>
      claves.some((clave) => texto.includes(normalizar(clave)))
    )
    if (encontrada) return encontrada
  }
  return null
}

/**
 * Tono de reserva repartido por el nombre. Es determinista a propósito: si
 * dependiera del índice en la lista, reordenar la carta repintaría de otro
 * color unas categorías que no han cambiado.
 */
const tonoPorNombre = (nombre) => {
  const texto = normalizar(nombre)
  let suma = 0
  for (let i = 0; i < texto.length; i += 1) suma = (suma + texto.charCodeAt(i)) % 997
  return TONOS[suma % TONOS.length]
}

export const emojiDe = (nombre, categoria = '') => pistaDe(nombre, categoria)?.emoji ?? '🍽️'

export const tonoDe = (nombre, categoria = '') =>
  pistaDe(nombre, categoria)?.tono ?? tonoPorNombre(categoria || nombre)

export const iconoDe = (categoria) =>
  pistaDe(categoria)?.icono ? `fa-solid ${pistaDe(categoria).icono}` : 'fa-solid fa-utensils'

/** Los iconos que el administrador puede elegir al crear una categoría. */
export const ICONOS_CATEGORIA = [
  { valor: 'fa-solid fa-utensils', etiqueta: 'Cubiertos' },
  { valor: 'fa-solid fa-burger', etiqueta: 'Hamburguesa' },
  { valor: 'fa-solid fa-hotdog', etiqueta: 'Perro caliente' },
  { valor: 'fa-solid fa-bowl-food', etiqueta: 'Plato servido' },
  { valor: 'fa-solid fa-drumstick-bite', etiqueta: 'Carnes' },
  { valor: 'fa-solid fa-pepper-hot', etiqueta: 'Picante' },
  { valor: 'fa-solid fa-cookie', etiqueta: 'Tortillas' },
  { valor: 'fa-solid fa-glass-water', etiqueta: 'Bebidas' },
  { valor: 'fa-solid fa-cake-candles', etiqueta: 'Postres' },
  { valor: 'fa-solid fa-star', etiqueta: 'Combos' },
  { valor: 'fa-solid fa-leaf', etiqueta: 'Ensaladas' },
  { valor: 'fa-solid fa-plus', etiqueta: 'Adicionales' },
]

export const PRODUCTO_VACIO = {
  nombre: '',
  precio: '',
  precioCombo: '',
  descripcion: '',
  // null, no '': es lo que el adaptador entiende por "sin imagen propia", y
  // así un plato recién creado ya enseña el logo sin pasar por ningún caso
  // especial.
  imagen: null,
  estado: 'Disponible',
}

export const categoriaVacia = (icono = 'fa-solid fa-utensils') => ({
  nombre: '',
  descripcion: '',
  icono,
  estado: 'Disponible',
  productos: [],
})

/** Identificador estable para anclar la cinta de categorías de la carta. */
export const anclaDe = (categoria) => `carta-${String(categoria.id).replace(/\W/g, '')}`

/**
 * LA IMAGEN DE UN PLATO, O EL LOGO.
 *
 * El administrador sube un JPG o un PNG desde la edición del plato y queda en
 * `plato.imagen`. Todo lo que pinta un plato con imagen —la carta del cliente,
 * su ficha, la tabla del administrador, el catálogo de Pedidos, el podio de más
 * vendidos y la lista top— pasa por aquí, así que una imagen nueva aparece en
 * los seis sitios a la vez y no hay ningún listado con su propia regla.
 *
 * Sin imagen propia se devuelve el logo del Corralejo. Antes había en su lugar
 * una tabla de fotos de archivo de Unsplash por familia de plato: imágenes que
 * no eran de los platos reales, enlazadas a un servidor ajeno. Una foto que no
 * corresponde al plato engaña al cliente, y el logo no.
 *
 * `tieneImagen` acompaña a `imagenDe` porque el logo necesita otro trato al
 * pintarse: el archivo es blanco sobre transparente, así que sobre fondo claro
 * no se vería. Las clases `.plato-foto-respaldo` y `.miniatura-respaldo` de
 * theme.css le ponen el fondo oscuro.
 */
export const LOGO_CORRALEJO = logo

export const imagenDe = (plato) => plato?.imagen || LOGO_CORRALEJO

export const tieneImagen = (plato) => Boolean(plato?.imagen)
