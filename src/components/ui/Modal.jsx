import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * Pila de modales abiertos (el último está encima). Cuando un modal abre otro (detalle →
 * confirmar borrado), solo el de arriba atiende el teclado, y el scroll de la página se libera
 * al cerrar el último.
 */
const pila = []
const bloqueo = { paddingPrevio: '' }

/**
 * Modal con estilos de Bootstrap controlado por React. Se monta en document.body (portal)
 * para que ningún contenedor con overflow o z-index lo recorte.
 *
 * El contenedor lleva la clase `modal` (y `d-block`): Bootstrap declara ahí las variables
 * --bs-modal-*, y sin ella el diálogo sale transparente y sin ancho.
 * Atrapa el foco mientras está abierto, lo devuelve al cerrar y compensa la barra de scroll.
 *
 * @param {string}  titulo       encabezado del diálogo
 * @param {string}  icono        clase de Font Awesome sin el prefijo fa-solid
 * @param {string}  descripcion  subtítulo opcional bajo el título
 * @param {string}  tamano       'modal-lg' | 'modal-xl' | 'modal-sm' | ''
 * @param {string}  tono         'peligro' | '' (color de la cabecera)
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
  const idTitulo = useId()

  // `onClose` se guarda en una ref para que el efecto de abajo corra UNA sola vez. Los
  // padres suelen pasar una función nueva en cada render; si el efecto dependiera de ella,
  // se repetiría con cada tecla y el foco saltaría al primer campo del formulario.
  const cerrarRef = useRef(onClose)
  useEffect(() => {
    cerrarRef.current = onClose
  })

  useEffect(() => {
    const id = {}
    pila.push(id)
    const estaEncima = () => pila[pila.length - 1] === id

    const previamenteEnfocado = document.activeElement

    const enfocables = () =>
      Array.from(
        contenido.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((elemento) => elemento.offsetParent !== null)

    // Foco inicial: el primer campo del formulario si hay, y si no el propio
    // diálogo. Nunca un botón destructivo del pie.
    const candidatos = enfocables()
    const primerCampo = candidatos.find((e) => e.matches('input, select, textarea'))
    ;(primerCampo ?? contenido.current)?.focus()

    const alPulsarTecla = (evento) => {
      // Solo el modal de encima atiende el teclado.
      if (!estaEncima()) return

      if (evento.key === 'Escape') {
        cerrarRef.current()
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

    // Bloquea el scroll compensando el ancho de la barra (si no, la página da un salto).
    // Lo pone el primer modal de la pila y lo quita el último en cerrarse.
    if (pila.length === 1) {
      const anchoBarra = window.innerWidth - document.documentElement.clientWidth
      bloqueo.paddingPrevio = document.body.style.paddingRight
      document.body.classList.add('overflow-hidden')
      if (anchoBarra > 0) document.body.style.paddingRight = `${anchoBarra}px`
    }

    return () => {
      document.removeEventListener('keydown', alPulsarTecla)
      pila.splice(pila.indexOf(id), 1)
      if (pila.length === 0) {
        document.body.classList.remove('overflow-hidden')
        document.body.style.paddingRight = bloqueo.paddingPrevio
      }
      previamenteEnfocado?.focus?.()
    }
  }, [])

  return createPortal(
    <div
      className="modal d-block cff-backdrop p-2 p-sm-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby={idTitulo}
      onMouseDown={(evento) => {
        if (cerrarAlPulsarFuera && evento.target === evento.currentTarget) cerrarRef.current()
      }}
    >
      <div
        className={`modal-dialog modal-dialog-centered cff-dialogo ${tamano} ${
          tono ? `modal-tono-${tono}` : ''
        }`}
      >
        <div className="modal-content" ref={contenido} tabIndex={-1}>
          <div className="modal-header">
            <h5 className="modal-title min-width-0" id={idTitulo}>
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
