import { useState } from 'react'

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
 * SOLO LECTURA (sin `onCalificar`): `valor` va de 0 a 5 y se redondea a la
 * media estrella más cercana (3.4 → 3½★). Lo usan la Lista Top, el podio y
 * las tarjetas de opiniones (valoración 1-10 / 2).
 *
 * SELECTOR (con `onCalificar`): puntuación ENTERA de 1 a 10, donde cada unidad
 * es media estrella. Cada estrella tiene dos mitades pulsables: la izquierda
 * vale 2n-1 y la derecha 2n. `miVoto` es la puntuación elegida (1-10).
 * Solo se monta en la calificación por QR: el ticket demuestra la compra.
 * Nunca junto a un plato de un listado público.
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
      </span>
    )
  }

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
      ))}
    </div>
  )
}
