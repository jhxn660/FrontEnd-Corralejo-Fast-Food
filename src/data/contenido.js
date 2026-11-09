// Textos fijos de las pantallas de información (R23).
// Objetos con claves nombradas, nunca tuplas posicionales (R24).

export const MISION =
  'En Corralejo Fast Food creamos momentos mágicos alrededor de la mesa, uniendo a parejas y amigos a través del poder de la auténtica comida rápida. Nos dedicamos a deleitar cada paladar con sabores irresistibles y legendarios —como nuestras icónicas Costillas BBQ—, ofreciendo una experiencia acogedora, alegre y cercana, ya sea en nuestro punto físico o en la comodidad de su hogar.'

export const VISION =
  'Para el futuro, nos consolidamos como el epicentro del sabor y la celebración en nuestra comunidad, siendo reconocidos por nuestra capacidad de innovar, evolucionar y crecer junto a nuestros clientes. Aspiramos a expandir nuestro legado gastronómico, manteniendo siempre la calidez de nuestra atención, el espíritu festivo en cada temporada y la promesa de llevar la mejor comida rápida a cada mesa.'

export const HISTORIAS = [
  {
    id: 'origen',
    titulo: 'El Origen',
    texto:
      'En las crónicas de las Tierras del Sabor, se habla de un antiguo y místico lugar conocido como El Corralejo. No era un sitio cualquiera; era un refugio legendario donde los guerreros, los viajeros y los enamorados de los reinos cercanos guardaban sus armas para sentarse uno al lado del otro. Tras un tiempo de misterioso silencio en el que el refugio cerró sus portales, los fuegos de la gran cocina se han vuelto a encender. ¡El Corralejo ha vuelto! Y sus puertas están abiertas de par en par para recibir a todos los clanes en su punto físico, o enviando sus tesoros culinarios a través de veloces mensajeros directamente a sus castillos.',
  },
  {
    id: 'banquete',
    titulo: 'El Secreto del Banquete',
    texto:
      'El gran orgullo del refugio es una receta custodiada por los maestros del fuego: La Salchipapa Especial. Dicen las leyendas que aquellos que se atreven a probarlas experimentan una explosión de misticismo, acompañadas por las Hamburguesas Clásicas de la Corraleja, si falta alguna de su combo especial donde acompañan las papas francesas sagradas de la casa y un elixir de bebidas frescas.',
  },
  {
    id: 'comunidad',
    titulo: 'La Comunidad Gastronómica',
    texto:
      'Corralejo no es solo comida; es un lugar de celebración. Cada año terráqueo, el refugio se transforma. Cuando llega la época de la luna, el lugar se viste de hechizos y misterio, invitando a las almas a compartir bajo una atmósfera mágica. Los guardianes de Corralejo no olvidan a quienes los apoyan: celebran sus aniversarios repartiendo cofres de recompensa y grandes sorteos para agradecer a la comunidad que los ayuda a crecer día a día.',
  },
  {
    id: 'lema',
    titulo: 'El Lema de la Casa',
    texto:
      'No importa de qué rincón del reino vengas, ni si vienes a compartir un romance o una victoria con tus amigos; en Corralejo, la mejor comida rápida siempre encontrará el camino hacia tu mesa.',
  },
]

export const PILARES = [
  { id: 'mision', titulo: 'Nuestra misión', icono: 'fa-thumbtack', texto: MISION },
  { id: 'vision', titulo: 'Visión', icono: 'fa-eye', texto: VISION },
]

export const PUNTOS_CLAVE = [
  { id: 'ambiente', texto: 'Fácil acceso y ambiente acogedor' },
  { id: 'transporte', texto: 'A pocas cuadras de la estación de Transmilenio' },
  { id: 'domicilio', texto: 'Servicio a domicilio en la zona' },
  { id: 'whatsapp', texto: 'Información adicional y dudas vía WhatsApp' },
]

// Datos de muestra de la pantalla de valoraciones; aún no vienen de la API.
export const VALORACIONES = {
  promedio: '4.8',
  total: '352 reseñas registradas',
  recientes: [
    { id: 'juan', nombre: 'Juan Pérez', estrellas: '★★★★★', cuando: '20 min' },
    { id: 'maria', nombre: 'María Gómez', estrellas: '★★★★☆', cuando: '1 hora' },
    { id: 'carlos', nombre: 'Carlos Ruiz', estrellas: '★★★★★', cuando: '3 horas' },
  ],
}
