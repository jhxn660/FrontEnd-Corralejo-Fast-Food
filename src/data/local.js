// Campos editables de la ficha del establecimiento y datos de contacto del pie.
// La ficha en sí vive en la API (colección "establecimiento"), no aquí: así el
// administrador la edita y el cliente ve el mismo valor (R25).

export const CAMPOS_INFO = [
  { campo: 'nombre', etiqueta: 'Nombre del restaurante' },
  { campo: 'direccion', etiqueta: 'Dirección' },
  { campo: 'ciudad', etiqueta: 'Ciudad' },
  { campo: 'telefono', etiqueta: 'Teléfono' },
  { campo: 'whatsapp', etiqueta: 'WhatsApp' },
  { campo: 'horario', etiqueta: 'Horario de atención' },
  { campo: 'mapa', etiqueta: 'URL del mapa (Google Maps embed)' },
]

export const MAPA_EMBED =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3977.0392348398457!2d-74.10398322523777!3d4.587391995387431!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e3f9919fcd7c191%3A0xc48fe33ee5ecf5c9!2sCl.%2032%20Sur%20%2323f-14%2C%20Bogot%C3%A1!5e0!3m2!1ses!2sco!4v1717616000000!5m2!1ses!2sco'

export const CONTACTO = [
  { id: 'direccion', icono: 'fa-location-arrow', texto: 'Cl. 32 Sur #23 F 14, Bogotá, Colombia' },
  { id: 'telefono', icono: 'fa-phone', texto: '+57 311 8370904' },
  { id: 'horario', icono: 'fa-clock', texto: 'Martes a domingo de 2 pm a 10 pm' },
]
