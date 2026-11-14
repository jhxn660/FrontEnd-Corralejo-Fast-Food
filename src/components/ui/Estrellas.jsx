import { useState } from 'react'

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
      </span>
    )
  }

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
      ))}
    </div>
  )
}
