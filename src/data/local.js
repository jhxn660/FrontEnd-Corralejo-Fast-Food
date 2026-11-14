// Campos editables de la ficha del establecimiento y datos de contacto del pie.
// La ficha en sí vive en la API (colección "establecimiento"), no aquí: así el
// administrador la edita y el cliente ve el mismo valor (R25).

/**
 * Campos editables de la ficha. Cada entrada lleva además su tipo de input, su
 * icono, el ancho de columna y la ayuda que hace falta para no equivocarse: el
 * formulario los recorre y no decide nada por su cuenta (R24).
 */
export const CAMPOS_INFO = [
  {
    campo: 'nombre',
    etiqueta: 'Nombre del restaurante',
    icono: 'fa-store',
    columna: 'col-12 col-sm-8',
  },
  { campo: 'ciudad', etiqueta: 'Ciudad', icono: 'fa-city', columna: 'col-12 col-sm-4' },
  {
    campo: 'direccion',
    etiqueta: 'Dirección',
    icono: 'fa-location-dot',
    columna: 'col-12',
    ayuda: 'Como debe leerla quien llega por primera vez.',
  },
  {
    campo: 'telefono',
    etiqueta: 'Teléfono',
    tipo: 'tel',
    icono: 'fa-phone',
    columna: 'col-12 col-sm-6',
  },
  {
    campo: 'whatsapp',
    etiqueta: 'WhatsApp',
    tipo: 'tel',
    icono: 'fa-comment-sms',
    columna: 'col-12 col-sm-6',
  },
  {
    campo: 'horario',
    etiqueta: 'Horario de atención',
    icono: 'fa-clock',
    columna: 'col-12',
    ayuda: 'Ej. Martes a domingo de 2 pm a 10 pm.',
  },
  {
    campo: 'mapa',
    etiqueta: 'URL del mapa',
    tipo: 'url',
    icono: 'fa-map-location-dot',
    columna: 'col-12',
    ayuda: 'En Google Maps: Compartir → Insertar un mapa → copiar el src del iframe.',
  },
]

export const MAPA_EMBED =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3977.0392348398457!2d-74.10398322523777!3d4.587391995387431!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e3f9919fcd7c191%3A0xc48fe33ee5ecf5c9!2sCl.%2032%20Sur%20%2323f-14%2C%20Bogot%C3%A1!5e0!3m2!1ses!2sco!4v1717616000000!5m2!1ses!2sco'

// Número de WhatsApp en el formato que pide wa.me: solo dígitos, con indicativo
// y sin signos. Se guarda aparte del texto que se muestra en pantalla porque son
// dos usos distintos del mismo dato y formatearlo en el enlace rompería la URL.
export const WHATSAPP_NUMERO = '573118370904'

export const CONTACTO = [
  { id: 'direccion', icono: 'fa-location-arrow', texto: 'Cl. 32 Sur #23 F 14, Bogotá, Colombia' },
  { id: 'telefono', icono: 'fa-phone', texto: '+57 311 8370904' },
  { id: 'horario', icono: 'fa-clock', texto: 'Martes a domingo de 2 pm a 10 pm' },
]

/**
 * PUNTOS DE REFERENCIA Y TIEMPOS DE LLEGADA.
 *
 * Son el respaldo de `ficha.referencias` y `ficha.tiempos`: si la API ya los
 * trae, mandan los de la API; si no —y hoy el back todavía no los expone—, se
 * usan estos. Mismo patrón que `HORARIO_POR_DEFECTO` en establecimiento/horario.js.
 *
 * Los puntos salen del entorno real del local (Cl. 32 Sur #23F-14, junto al
 * Restrepo y Olaya, en Rafael Uribe Uribe). Los tiempos son estimaciones de la
 * casa, no promesas: la pantalla los presenta como aproximados.
 *
 * PENDIENTE: el formulario de la ficha todavía no los edita, así que cambiarlos
 * hoy es tocar este archivo o la colección `establecimiento`.
 */
export const REFERENCIAS_POR_DEFECTO = [
  { id: 'transmilenio', icono: 'fa-train-subway', texto: 'Cerca de la estación Restrepo de TransMilenio' },
  { id: 'plaza', icono: 'fa-shop', texto: 'A pocas cuadras de la Plaza de Mercado del Restrepo' },
  { id: 'estadio', icono: 'fa-futbol', texto: 'En el sector del Estadio Olaya Herrera' },
  { id: 'alcaldia', icono: 'fa-building-columns', texto: 'Junto a la Alcaldía Local de Rafael Uribe Uribe' },
]

export const TIEMPOS_POR_DEFECTO = [
  { id: 'domicilio', icono: 'fa-motorcycle', medio: 'Domicilio en la zona', texto: '25 a 40 minutos' },
  { id: 'recoger', icono: 'fa-bag-shopping', medio: 'Para recoger en el local', texto: '15 a 20 minutos' },
  { id: 'caminando', icono: 'fa-person-walking', medio: 'Desde la estación Restrepo', texto: '10 minutos caminando' },
]
