// Textos fijos de las pantallas de información (R23).
// Objetos con claves nombradas, nunca tuplas posicionales (R24).

export const MISION =
  'En Corralejo Fast Food creamos momentos mágicos alrededor de la mesa, uniendo a parejas y amigos a través del poder de la auténtica comida rápida. Nos dedicamos a deleitar cada paladar con sabores irresistibles y legendarios —como nuestras icónicas Costillas BBQ—, ofreciendo una experiencia acogedora, alegre y cercana, ya sea en nuestro punto físico o en la comodidad de su hogar.'

export const VISION =
  'Para el futuro, nos consolidamos como el epicentro del sabor y la celebración en nuestra comunidad, siendo reconocidos por nuestra capacidad de innovar, evolucionar y crecer junto a nuestros clientes. Aspiramos a expandir nuestro legado gastronómico, manteniendo siempre la calidez de nuestra atención, el espíritu festivo en cada temporada y la promesa de llevar la mejor comida rápida a cada mesa.'

/**
 * Narrativa de la casa. Cada historia trae `icono` y `resumen` además del
 * texto: los botones de la pantalla eran cuatro rectángulos con solo el título,
 * y no daban ninguna razón para pulsarlos. El resumen es el anzuelo y el icono
 * distingue de un vistazo una historia de otra.
 */
export const HISTORIAS = [
  {
    id: 'origen',
    titulo: 'El Origen',
    icono: 'fa-dungeon',
    resumen: 'Un refugio legendario que cerró sus portales y volvió a encender los fuegos.',
    texto:
      'En las crónicas de las Tierras del Sabor, se habla de un antiguo y místico lugar conocido como El Corralejo. No era un sitio cualquiera; era un refugio legendario donde los guerreros, los viajeros y los enamorados de los reinos cercanos guardaban sus armas para sentarse uno al lado del otro. Tras un tiempo de misterioso silencio en el que el refugio cerró sus portales, los fuegos de la gran cocina se han vuelto a encender. ¡El Corralejo ha vuelto! Y sus puertas están abiertas de par en par para recibir a todos los clanes en su punto físico, o enviando sus tesoros culinarios a través de veloces mensajeros directamente a sus castillos.',
  },
  {
    id: 'banquete',
    titulo: 'El Secreto del Banquete',
    icono: 'fa-flask',
    resumen: 'La receta que los maestros del fuego custodian: la Salchipapa Especial.',
    texto:
      'El gran orgullo del refugio es una receta custodiada por los maestros del fuego: La Salchipapa Especial. Dicen las leyendas que aquellos que se atreven a probarlas experimentan una explosión de misticismo, acompañadas por las Hamburguesas Clásicas de la Corraleja, si falta alguna de su combo especial donde acompañan las papas francesas sagradas de la casa y un elixir de bebidas frescas.',
  },
  {
    id: 'comunidad',
    titulo: 'La Comunidad Gastronómica',
    icono: 'fa-hand-holding-heart',
    resumen: 'Aniversarios, sorteos y una atmósfera que cambia con cada temporada.',
    texto:
      'Corralejo no es solo comida; es un lugar de celebración. Cada año terráqueo, el refugio se transforma. Cuando llega la época de la luna, el lugar se viste de hechizos y misterio, invitando a las almas a compartir bajo una atmósfera mágica. Los guardianes de Corralejo no olvidan a quienes los apoyan: celebran sus aniversarios repartiendo cofres de recompensa y grandes sorteos para agradecer a la comunidad que los ayuda a crecer día a día.',
  },
  {
    id: 'lema',
    titulo: 'El Lema de la Casa',
    icono: 'fa-quote-left',
    resumen: 'Vengas de donde vengas, la mejor comida rápida encuentra tu mesa.',
    texto:
      'No importa de qué rincón del reino vengas, ni si vienes a compartir un romance o una victoria con tus amigos; en Corralejo, la mejor comida rápida siempre encontrará el camino hacia tu mesa.',
  },
]

export const PILARES = [
  { id: 'mision', titulo: 'Nuestra misión', icono: 'fa-thumbtack', texto: MISION },
  { id: 'vision', titulo: 'Visión', icono: 'fa-eye', texto: VISION },
]

/**
 * Normas del muro de comentarios. Se enseñan antes de publicar, no después de
 * moderar: quien las lee a tiempo no escribe el comentario que habría que
 * borrar. El administrador sigue aprobando cada uno en Moderación de PQRS.
 */
export const REGLAS_COMENTARIOS = [
  {
    id: 'respeto',
    titulo: 'Respeto ante todo',
    texto: 'Los comentarios deben ser respetuosos con el restaurante y con otros usuarios.',
  },
  {
    id: 'experiencia',
    titulo: 'Comentarios relacionados con la experiencia',
    texto: 'Comparte opiniones sobre la comida, el servicio o el ambiente.',
  },
  {
    id: 'lenguaje',
    titulo: 'Evita lenguaje ofensivo',
    texto: 'No se permite ningún tipo de insulto, discriminación o contenido inapropiado.',
  },
  {
    id: 'constructivo',
    titulo: 'Sé honesto y constructivo',
    texto: 'Las críticas deben ayudar a mejorar el servicio.',
  },
  {
    id: 'spam',
    titulo: 'No spam ni publicidad',
    texto: 'No está permitido publicar enlaces o promociones externas.',
  },
]

export const PIE_REGLAS = 'Tus comentarios nos ayudan a mejorar la experiencia de todos.'

export const PUNTOS_CLAVE = [
  { id: 'ambiente', texto: 'Fácil acceso y ambiente acogedor' },
  { id: 'transporte', texto: 'A pocas cuadras de la estación de Transmilenio' },
  { id: 'domicilio', texto: 'Servicio a domicilio en la zona' },
  { id: 'whatsapp', texto: 'Información adicional y dudas vía WhatsApp' },
]
