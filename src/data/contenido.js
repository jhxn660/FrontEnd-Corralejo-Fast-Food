// Textos fijos de interfaz (objetos con claves nombradas).
// Misión, visión y narrativa NO están aquí: las edita el negocio en /establecimiento
// (establecimiento/api.js). De esos pilares solo se declara la presentación.
export const PILARES = [
  { id: 'mision', titulo: 'Nuestra misión', icono: 'fa-thumbtack' },
  { id: 'vision', titulo: 'Visión', icono: 'fa-eye' },
]

/** "Puntos clave" del local: se muestran en la ficha (Ubicación y Gestión del Establecimiento). */
export const PUNTOS_CLAVE = [
  { id: 'ambiente', texto: 'Fácil acceso y ambiente acogedor' },
  { id: 'transporte', texto: 'A pocas cuadras de la estación de Transmilenio' },
  { id: 'domicilio', texto: 'Servicio a domicilio en la zona' },
  { id: 'whatsapp', texto: 'Información adicional y dudas vía WhatsApp' },
]

/** Panel del visitante (sin sesión): lo que ya puede hacer sin cuenta. */
export const ACCIONES_VISITANTE = [
  { id: 'local', icono: 'fa-store', texto: 'Conocer el local, su ubicación y horarios' },
  { id: 'menu', icono: 'fa-utensils', texto: 'Consultar la carta completa' },
  { id: 'ticket', icono: 'fa-qrcode', texto: 'Calificar su pedido escaneando el QR' },
  { id: 'muro', icono: 'fa-comments', texto: 'Leer el muro de comentarios y las valoraciones' },
]

/** Lo que exige una cuenta de cliente. */
export const BENEFICIOS_CUENTA = [
  { id: 'pqrs', icono: 'fa-users-rectangle', texto: 'Enviar peticiones, quejas, reclamos y sugerencias (PQRS)' },
  { id: 'megusta', icono: 'fa-heart', texto: 'Dar "me gusta" a los comentarios' },
]
