// Campos editables de la ficha del establecimiento. La ficha en sí —dirección,
// teléfono, WhatsApp, horario, referencias y tiempos— vive en json-server
// (colección "establecimiento"), no aquí: así el administrador la edita y
// todos los roles ven el mismo valor (R25).

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
