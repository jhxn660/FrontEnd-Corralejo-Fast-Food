import { useId, useRef, useState } from 'react'

import { ACEPTA, archivoArrastrado, leerImagenReducida } from '../../utils/imagen'

/**
 * Campo de imagen con arrastrar y soltar.
 *
 * Vive en components/ui y no en el módulo de menú porque no sabe nada de
 * platos: recibe una imagen, devuelve otra, y cualquier pantalla que necesite
 * subir un JPG o un PNG puede usarlo (R43).
 *
 * TRES FORMAS DE PONER LA IMAGEN, UNA DE QUITARLA
 * Se puede arrastrar el archivo encima, pulsar la zona para abrir el
 * explorador o usar el teclado (la zona es un `<button>`, así que entra en el
 * orden de tabulación y responde a Enter y espacio). El arrastre solo no
 * bastaría: en un móvil no hay nada que arrastrar.
 *
 * `valor` es una `data:` URL o null. Con null se enseña `respaldo` —el logo, en
 * el caso de los platos— para que se vea exactamente lo que verá el cliente si
 * se guarda así.
 *
 * El componente no guarda nada: avisa con `onCambiar` y el formulario de turno
 * decide cuándo escribir.
 */
export default function CampoImagen({
  valor,
  onCambiar,
  respaldo,
  etiqueta = 'Imagen',
  ayuda = 'Arrastra un JPG o un PNG, o pulsa para elegirlo.',
  textoRespaldo = 'Sin imagen propia: se usará esta por defecto.',
  deshabilitado = false,
}) {
  const entrada = useRef(null)
  const idAyuda = useId()
  const [encima, setEncima] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState(null)

  const procesar = async (archivo) => {
    setError(null)
    if (!archivo) return
    setProcesando(true)
    try {
      onCambiar(await leerImagenReducida(archivo))
    } catch (fallo) {
      setError(fallo.message)
    } finally {
      setProcesando(false)
    }
  }

  const soltar = (evento) => {
    evento.preventDefault()
    setEncima(false)
    if (deshabilitado) return
    procesar(archivoArrastrado(evento.dataTransfer))
  }

  // `dragover` hay que cancelarlo o el navegador abre el archivo en una
  // pestaña nueva en vez de dejarlo caer aquí.
  const arrastrarEncima = (evento) => {
    evento.preventDefault()
    if (!deshabilitado) setEncima(true)
  }

  const quitar = () => {
    setError(null)
    onCambiar(null)
    // El input recuerda el último archivo: sin limpiarlo, volver a elegir el
    // mismo no dispara `change` y parecería que la subida falló.
    if (entrada.current) entrada.current.value = ''
  }

  const vistaPrevia = valor || respaldo || null

  return (
    <div>
      <p className="form-label mb-1">{etiqueta}</p>

      <div
        className={`zona-imagen ${encima ? 'zona-imagen-activa' : ''} ${
          deshabilitado ? 'opacity-50' : ''
        }`}
        onDragOver={arrastrarEncima}
        onDragLeave={() => setEncima(false)}
        onDrop={soltar}
      >
        <button
          type="button"
          className="zona-imagen-boton"
          onClick={() => entrada.current?.click()}
          disabled={deshabilitado || procesando}
          aria-describedby={idAyuda}
        >
          {vistaPrevia ? (
            <img
              className={`zona-imagen-foto ${valor ? '' : 'zona-imagen-foto-respaldo'}`}
              src={vistaPrevia}
              alt={valor ? 'Vista previa de la imagen elegida' : 'Imagen por defecto'}
            />
          ) : (
            <span className="text-secondary">
              <i className="fa-solid fa-image fs-2 d-block mb-2" />
              {procesando ? 'Procesando…' : 'Arrastra la imagen aquí'}
            </span>
          )}

          {procesando && (
            <span className="zona-imagen-velo">
              <span className="spinner-border spinner-border-sm me-2" role="status" />
              Procesando…
            </span>
          )}
        </button>

        <input
          ref={entrada}
          type="file"
          className="d-none"
          accept={ACEPTA}
          onChange={(evento) => procesar(evento.target.files?.[0])}
          disabled={deshabilitado}
        />
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={() => entrada.current?.click()}
          disabled={deshabilitado || procesando}
        >
          <i className="fa-solid fa-upload me-2" />
          {valor ? 'Cambiar imagen' : 'Subir imagen'}
        </button>

        {valor && (
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={quitar}
            disabled={deshabilitado || procesando}
          >
            <i className="fa-solid fa-trash-can me-2" />
            Quitar
          </button>
        )}
      </div>

      <div className="form-text" id={idAyuda}>
        {valor ? ayuda : textoRespaldo}
      </div>

      {error && (
        <div className="invalid-feedback d-block" role="alert">
          {error}
        </div>
      )}
    </div>
  )
}
