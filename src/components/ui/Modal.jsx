import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * Modal con estilos de Bootstrap pero controlado por React (R30).
 * Se monta en document.body para que ningún contenedor con overflow o z-index
 * (como el header fijo) lo recorte.
 *
 * POR QUÉ LA CLASE `modal` ES IMPRESCINDIBLE
 * Bootstrap 5.3 declara TODAS las variables --bs-modal-* dentro de `.modal`:
 * el fondo de `.modal-content`, el relleno de la cabecera y del cuerpo, el
 * radio, la sombra y el ancho que `modal-lg` solo redefine. Un portal que
 * pinta `.modal-dialog` sin un ancestro `.modal` deja esas variables sin
 * valor, y una propiedad que resuelve a una variable inexistente es inválida:
 * el diálogo sale transparente, sin relleno y sin ancho. Por eso el contenedor
 * lleva `modal` (más `d-block`, porque `.modal` nace en display:none).
 *
 * Además:
 * - Devuelve el foco al elemento que abrió el modal, y lo atrapa dentro
 *   mientras está abierto: tabular no debe llevar a la página de detrás.
 * - Compensa el ancho de la barra de desplazamiento al bloquear el scroll, para
 *   que la página no dé un salto lateral al abrirse.
 *
 * @param {string}  titulo       encabezado del diálogo
 * @param {string}  icono        clase de Font Awesome sin el prefijo fa-solid
 * @param {string}  descripcion  subtítulo opcional bajo el título
 * @param {string}  tamano       'modal-lg' | 'modal-xl' | 'modal-sm' | ''
 * @param {string}  tono         'peligro' | 'exito' | '' (color de la cabecera)
 * @param {boolean} cerrarAlPulsarFuera  false en formularios con datos a medias
 */
export default function Modal({
  titulo,
  icono,
  descripcion,
  tamano = '',
  tono = '',
  cerrarAlPulsarFuera = true,
  onClose,
  children,
  footer,
}) {
  const contenido = useRef(null)
  const idTitulo = useRef(`modal-${Math.random().toString(36).slice(2, 9)}`)

  useEffect(() => {
    const previamenteEnfocado = document.activeElement

    const enfocables = () =>
      Array.from(
        contenido.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((elemento) => elemento.offsetParent !== null)

    // Foco inicial: el primer campo del formulario si hay, y si no el propio
    // diálogo. Nunca un botón destructivo del pie (R58).
    const candidatos = enfocables()
    const primerCampo = candidatos.find((e) => e.matches('input, select, textarea'))
    ;(primerCampo ?? contenido.current)?.focus()

    const alPulsarTecla = (evento) => {
      if (evento.key === 'Escape') {
        onClose()
        return
      }
      if (evento.key !== 'Tab') return

      // Trampa de foco: Tab en el último vuelve al primero y al revés.
      const lista = enfocables()
      if (lista.length === 0) return
      const primero = lista[0]
      const ultimo = lista[lista.length - 1]

      if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primero.focus()
      } else if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault()
        ultimo.focus()
      }
    }

    document.addEventListener('keydown', alPulsarTecla)

    // Bloqueo del scroll compensando la barra: sin el padding, quitar el scroll
    // ensancha la página y todo se desplaza unos píxeles al abrir el modal.
    const anchoBarra = window.innerWidth - document.documentElement.clientWidth
    const paddingPrevio = document.body.style.paddingRight
    document.body.classList.add('overflow-hidden')
    if (anchoBarra > 0) document.body.style.paddingRight = `${anchoBarra}px`

    return () => {
      document.removeEventListener('keydown', alPulsarTecla)
      document.body.classList.remove('overflow-hidden')
      document.body.style.paddingRight = paddingPrevio
      previamenteEnfocado?.focus?.()
    }
  }, [onClose])

  return createPortal(
    <div
      className="modal d-block cff-backdrop p-2 p-sm-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby={idTitulo.current}
      onMouseDown={(evento) => {
        if (cerrarAlPulsarFuera && evento.target === evento.currentTarget) onClose()
      }}
    >
      <div
        className={`modal-dialog modal-dialog-centered cff-dialogo ${tamano} ${
          tono ? `modal-tono-${tono}` : ''
        }`}
      >
        <div className="modal-content" ref={contenido} tabIndex={-1}>
          <div className="modal-header">
            <h5 className="modal-title min-width-0" id={idTitulo.current}>
              {icono && <i className={`fa-solid ${icono} text-brand`} />}
              <span className="text-truncate">{titulo}</span>
            </h5>
            <button type="button" className="btn-close" aria-label="Cerrar" onClick={onClose} />
          </div>

          {descripcion && (
            <p className="px-3 pt-3 mb-0 text-secondary small border-bottom pb-3">{descripcion}</p>
          )}

          <div className="modal-body">{children}</div>

          {footer && <div className="modal-footer">{footer}</div>}
        </div>
      </div>
    </div>,
    document.body
  )
}
