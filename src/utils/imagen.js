// Lectura y reducción de las imágenes que sube el administrador.
//
// POR QUÉ SE REDUCE ANTES DE GUARDAR
// La imagen viaja dentro del registro del plato, así que una foto de teléfono
// de 4 MB se convertiría en unos 5,5 MB de texto base64 en `db.json`, y el
// navegador tendría que descargarla entera cada vez que alguien abre la carta.
// Reducirla a 800 px de ancho la deja en unas decenas de kilobytes, que a
// tamaño de tarjeta se ve igual.
//
// POR QUÉ SIEMPRE SALE JPEG
// Se aceptan JPG y PNG de entrada, pero se guarda JPEG: reencodear como PNG una
// fotografía la deja en varios cientos de kilobytes. Un PNG con transparencia
// pierde el canal alfa, así que antes de dibujarlo se pinta el lienzo de blanco
// —si no, las zonas transparentes saldrían negras—.

export const TIPOS_ACEPTADOS = ['image/jpeg', 'image/jpg', 'image/png']

/** Lo que se le pasa al `accept` del input, para que el explorador ya filtre. */
export const ACEPTA = '.jpg,.jpeg,.png,image/jpeg,image/png'

export const MAX_BYTES = 5 * 1024 * 1024
const ANCHO_MAXIMO = 800
const CALIDAD = 0.72

const megas = (bytes) => (bytes / (1024 * 1024)).toFixed(1).replace('.', ',')

/**
 * Motivo por el que un archivo no sirve, o null si sirve.
 *
 * Se comprueba el tipo y no la extensión: renombrar un .pdf a .png no lo
 * convierte en una imagen, y el `accept` del input es una sugerencia que el
 * arrastre no respeta.
 */
export const errorDeImagen = (archivo) => {
  if (!archivo) return 'No llegó ningún archivo.'
  if (!TIPOS_ACEPTADOS.includes(archivo.type)) {
    return 'Solo se aceptan imágenes JPG o PNG.'
  }
  if (archivo.size > MAX_BYTES) {
    return `La imagen pesa ${megas(archivo.size)} MB y el máximo son ${megas(MAX_BYTES)} MB.`
  }
  return null
}

/**
 * Archivo → `data:` URL ya reducida, lista para guardarse en el plato.
 *
 * Rechaza con un Error legible: quien llama lo enseña tal cual.
 */
export const leerImagenReducida = (archivo) =>
  new Promise((resolver, rechazar) => {
    const motivo = errorDeImagen(archivo)
    if (motivo) {
      rechazar(new Error(motivo))
      return
    }

    const lector = new FileReader()
    lector.onerror = () => rechazar(new Error('No se pudo leer el archivo.'))
    lector.onload = () => {
      const imagen = new Image()
      imagen.onerror = () => rechazar(new Error('Ese archivo no es una imagen que podamos abrir.'))
      imagen.onload = () => {
        const escala = Math.min(1, ANCHO_MAXIMO / (imagen.width || 1))
        const ancho = Math.max(1, Math.round(imagen.width * escala))
        const alto = Math.max(1, Math.round(imagen.height * escala))

        const lienzo = document.createElement('canvas')
        lienzo.width = ancho
        lienzo.height = alto

        const contexto = lienzo.getContext('2d')
        if (!contexto) {
          rechazar(new Error('Este navegador no puede procesar la imagen.'))
          return
        }
        contexto.fillStyle = '#ffffff'
        contexto.fillRect(0, 0, ancho, alto)
        contexto.drawImage(imagen, 0, 0, ancho, alto)

        resolver(lienzo.toDataURL('image/jpeg', CALIDAD))
      }
      imagen.src = String(lector.result)
    }
    lector.readAsDataURL(archivo)
  })

/** El primer archivo de un arrastre, venga como `files` o como `items`. */
export const archivoArrastrado = (transferencia) => {
  const directo = transferencia?.files?.[0]
  if (directo) return directo
  const entrada = [...(transferencia?.items ?? [])].find((item) => item.kind === 'file')
  return entrada?.getAsFile() ?? null
}
