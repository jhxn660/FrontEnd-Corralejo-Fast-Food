// Textos fijos de interfaz (R23). Objetos con claves nombradas, nunca tuplas
// posicionales (R24).
//
// Lo que el negocio edita —misión, visión y narrativa— NO está aquí: vive en la
// colección `informacion` de json-server (establecimiento/api.js). De esos dos
// pilares solo se declara la presentación.
export const PILARES = [
  { id: 'mision', titulo: 'Nuestra misión', icono: 'fa-thumbtack' },
  { id: 'vision', titulo: 'Visión', icono: 'fa-eye' },
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

/** Panel del visitante (rol 'usuario', sin sesión): lo que ya puede hacer sin cuenta. */
export const ACCIONES_VISITANTE = [
  { id: 'local', icono: 'fa-store', texto: 'Conocer el local, su ubicación y horarios' },
  { id: 'menu', icono: 'fa-utensils', texto: 'Consultar la carta completa' },
  { id: 'ticket', icono: 'fa-qrcode', texto: 'Calificar su pedido escaneando el QR' },
  { id: 'muro', icono: 'fa-comments', texto: 'Leer el muro de comentarios y las valoraciones' },
]

/**
 * Lo que exige cuenta de cliente. PQRS está bloqueado para el visitante en
 * tres capas: no está en su menú (config/navegacion.jsx), el guardia lo manda
 * al login si escribe la URL (RutaProtegida) y no tiene PERMISO.PQRS_PROPIAS.
 */
export const BENEFICIOS_CUENTA = [
  { id: 'pqrs', icono: 'fa-users-rectangle', texto: 'Enviar peticiones, quejas, reclamos y sugerencias (PQRS)' },
  { id: 'megusta', icono: 'fa-heart', texto: 'Dar "me gusta" a los comentarios' },
]
