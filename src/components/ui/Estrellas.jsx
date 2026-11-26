import { useState } from 'react'

<<<<<<< HEAD
const POSICIONES = [1, 2, 3, 4, 5]

/** Icono de la estrella `posicion` (1-5) para un valor en medias estrellas. */
const iconoDe = (posicion, medias) => {
  if (medias >= posicion * 2) return 'fa-solid fa-star'
  if (medias === posicion * 2 - 1) return 'fa-solid fa-star-half-stroke'
  return 'fa-regular fa-star'
}

/**
 * Estrellas sobre una base de 5, con medias estrellas.
 *
 * SOLO LECTURA (sin `onCalificar`): `valor` de 0 a 5, redondeado a la media estrella (3.4 → 3½★).
 * SELECTOR (con `onCalificar`): puntuación entera de 1 a 10, donde cada unidad es media
 * estrella; `miVoto` es la elegida. Solo se usa al calificar una compra con el QR del tiquete.
 */
export default function Estrellas({ valor = 0, miVoto = 0, onCalificar, deshabilitado = false }) {
  const [sobre, setSobre] = useState(0)

  if (!onCalificar) {
    const estrellas = Math.max(0, Math.min(5, Number(valor) || 0))
    const medias = Math.round(estrellas * 2)
    return (
      <span
        className="estrellas-lectura text-warning text-nowrap"
        role="img"
        aria-label={`${(medias / 2).toLocaleString('es-CO')} de 5 estrellas`}
      >
        {POSICIONES.map((posicion) => (
          <i key={posicion} className={iconoDe(posicion, medias)} aria-hidden="true" />
        ))}
=======
/**
 * Calificación de 1 a 5 estrellas.
 *
 * Sin `onCalificar` es solo lectura. Con `onCalificar` es interactiva, y SOLO
 * se le pasa desde la pantalla de calificar un pedido por QR: ahí el ticket
 * demuestra que quien vota compró el plato. Nunca desde un listado público —
 * ese fue el fallo que obligó a retirar el voto la primera vez.
 *
 * Que el votante no tenga cuenta no cambia nada: lo que respalda la nota es el
 * código del tiquete, no el correo de quien la deja. Lo que no puede volver es
 * una estrella pulsable junto a un plato de la carta, sin ningún QR detrás.
 */
export default function Estrellas({ valor = 0, miVoto = 0, onCalificar, deshabilitado = false, clase = '' }) {
  const [sobre, setSobre] = useState(0)
  const puntuacion = Number(valor) || 0
  const llenas = Math.max(0, Math.min(5, Math.round(puntuacion)))

  if (!onCalificar) {
    return (
      <span
        className={`text-warning ${clase}`.trim()}
        role="img"
        aria-label={`${puntuacion.toFixed(1)} de 5 estrellas`}
      >
        {'★'.repeat(llenas)}
        {'☆'.repeat(5 - llenas)}
>>>>>>> origin/main
      </span>
    )
  }

<<<<<<< HEAD
  const activas = sobre || miVoto

  return (
    <div
      className="d-inline-flex align-items-center"
      role="radiogroup"
      aria-label="Tu valoración, de 1 a 10"
      onMouseLeave={() => setSobre(0)}
    >
      {POSICIONES.map((posicion) => (
        <span className={`estrella ${activas >= posicion * 2 - 1 ? 'activa' : ''}`} key={posicion}>
          <i className={iconoDe(posicion, activas)} aria-hidden="true" />
          {[posicion * 2 - 1, posicion * 2].map((puntos) => (
            <button
              key={puntos}
              type="button"
              role="radio"
              aria-checked={miVoto === puntos}
              aria-label={`${puntos} de 10`}
              className={`estrella-mitad ${puntos % 2 ? 'izquierda' : 'derecha'}`}
              onMouseEnter={() => setSobre(puntos)}
              onFocus={() => setSobre(puntos)}
              onBlur={() => setSobre(0)}
              onClick={() => onCalificar(puntos)}
              disabled={deshabilitado}
            />
          ))}
        </span>
=======
  const activas = sobre || miVoto || llenas

  return (
    <div
      className={`d-inline-flex ${clase}`.trim()}
      role="radiogroup"
      aria-label="Tu calificación"
      onMouseLeave={() => setSobre(0)}
    >
      {[1, 2, 3, 4, 5].map((posicion) => (
        <button
          key={posicion}
          type="button"
          role="radio"
          aria-checked={miVoto === posicion}
          aria-label={`${posicion} estrella${posicion > 1 ? 's' : ''}`}
          className={`estrella ${posicion <= activas ? 'activa' : ''}`}
          onMouseEnter={() => setSobre(posicion)}
          onFocus={() => setSobre(posicion)}
          onBlur={() => setSobre(0)}
          onClick={() => onCalificar(posicion)}
          disabled={deshabilitado}
        >
          <i className={`fa-${posicion <= activas ? 'solid' : 'regular'} fa-star`} />
        </button>
>>>>>>> origin/main
      ))}
    </div>
  )
}
