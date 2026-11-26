// Campos editables de la ficha del local: los mismos que guarda una ubicación en el backend
// (/ubicaciones): nombre → titulo · ciudad · direccion · telefono · referencia · mapa → enlaceMapa.
// El teléfono es también el WhatsApp del local; el horario se edita aparte (/horarios).

/**
 * Cada campo con su tipo de input, icono, ancho de columna y ayuda: el formulario los recorre.
 * `requerido` es el mensaje que se muestra si un campo obligatorio queda vacío.
 */
export const CAMPOS_INFO = [
  {
    campo: 'nombre',
    etiqueta: 'Nombre del restaurante',
    icono: 'fa-store',
    columna: 'col-12 col-sm-8',
    requerido: 'El local necesita un nombre.',
  },
  { campo: 'ciudad', etiqueta: 'Ciudad', icono: 'fa-city', columna: 'col-12 col-sm-4' },
  {
    campo: 'direccion',
    etiqueta: 'Dirección',
    icono: 'fa-location-dot',
    columna: 'col-12',
    ayuda: 'Como debe leerla quien llega por primera vez.',
    requerido: 'Indica la dirección del local.',
  },
  {
    campo: 'telefono',
    etiqueta: 'Teléfono',
    tipo: 'tel',
    icono: 'fa-phone',
    columna: 'col-12',
    ayuda: 'También es el WhatsApp del local: los botones "WhatsApp" y "Pedir por WhatsApp" usan este número.',
    requerido: 'Indica el teléfono del local.',
  },
  {
    campo: 'referencia',
    etiqueta: 'Cómo ubicarnos',
    icono: 'fa-map-pin',
    columna: 'col-12',
    ayuda: 'Puntos de referencia separados por « · ». Ej.: Cerca de la estación Restrepo · Junto a la Alcaldía Local',
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
