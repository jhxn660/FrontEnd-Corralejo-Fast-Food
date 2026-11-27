// Variables de entorno de la app (VITE_API_URL la lee api/client.js).
// Todas tienen un valor por defecto para desarrollo.

const leer = (clave, porDefecto) => {
  const valor = import.meta.env[clave]
  return valor === undefined || valor === '' ? porDefecto : valor
}

export const config = {
  // Dirección pública de la app: es lo que codifica el QR del tiquete. En producción debe ser
  // el dominio real (el QR se escanea desde un teléfono). Por defecto, el origen actual.
  appUrl: leer('VITE_APP_URL', globalThis.location?.origin ?? '').replace(/\/+$/, ''),
  // WhatsApp del local para "Pedir por WhatsApp" en la carta. Se usa cuando la ficha
  // del local (ubicación en el backend) todavía no tiene teléfono.
  whatsapp: leer('VITE_WHATSAPP_NUMERO', ''),
}
