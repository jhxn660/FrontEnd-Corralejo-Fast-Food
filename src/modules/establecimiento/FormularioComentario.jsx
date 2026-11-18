import { useState } from 'react'

import { inicialesDe } from '../../utils/format'
import { PIE_REGLAS, REGLAS_COMENTARIOS } from '../../data/contenido'

export const LARGO_MINIMO = 10
const LARGO_MAXIMO = 300

/**
 * Escribir un comentario para el muro (cliente con sesión), con las normas a
 * un clic. Lo monta OpinionesClientes.
 *
 * Desde aquí NO se puntúa: este comentario no tiene ticket detrás. La
 * valoración 1-10 solo se da al escanear el QR del tiquete (CalificarPedido).
 */
export default function FormularioComentario({ autor, enviando, onPublicar, onCancelar }) {
  const [texto, setTexto] = useState('')
  const [verReglas, setVerReglas] = useState(false)

  if (verReglas) {
    return (
      <div className="pt-2">
        <h3 className="h4 fw-bold text-center mb-4">Reglas a tener en cuenta.</h3>

        <ol className="list-group list-group-numbered list-group-flush border rounded mb-3">
          {REGLAS_COMENTARIOS.map(({ id, titulo, texto: detalle }) => (
            <li className="list-group-item" key={id}>
              <strong className="d-block">{titulo}</strong>
              <span className="text-secondary small">{detalle}</span>
            </li>
          ))}
        </ol>

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <p className="small text-secondary mb-0">{PIE_REGLAS}</p>
          <button className="btn btn-primary" onClick={() => setVerReglas(false)}>
            <i className="fa-solid fa-arrow-left me-2" />
            Volver al comentario
          </button>
        </div>
      </div>
    )
  }

  const enviar = (evento) => {
    evento.preventDefault()
    onPublicar(texto.trim(), () => setTexto(''))
  }

  return (
    <div className="pt-2">
      <div className="d-flex align-items-center gap-3 mb-4">
        <span
          className="icon-tile d-flex align-items-center justify-content-center flex-shrink-0 rounded-circle fw-bold"
          aria-hidden="true"
        >
          {inicialesDe(autor)}
        </span>
        <div className="min-width-0">
          <h3 className="h5 fw-bold mb-0 text-truncate">{autor}</h3>
          <small className="text-secondary">Así te verán los demás clientes.</small>
        </div>
      </div>

      <form onSubmit={enviar}>
        <label className="form-label" htmlFor="nuevo-comentario">
          Escribe tu comentario:
        </label>
        <textarea
          id="nuevo-comentario"
          className="form-control mb-2"
          rows="5"
          maxLength={LARGO_MAXIMO}
          placeholder="Escribe aquí tu comentario."
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          disabled={enviando}
          autoFocus
        />
        <small className={`d-block mb-3 ${texto.trim().length < LARGO_MINIMO ? 'text-secondary' : 'text-success'}`}>
          {texto.length}/{LARGO_MAXIMO} caracteres
          {texto.trim().length < LARGO_MINIMO && ` · mínimo ${LARGO_MINIMO}`}
        </small>

        <div className="d-flex flex-wrap justify-content-center gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={onCancelar} disabled={enviando}>
            Cancelar
          </button>
          <button className="btn btn-primary" type="submit" disabled={enviando}>
            {enviando ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Publicando…
              </>
            ) : (
              <>
                <i className="fa-solid fa-paper-plane me-2" />
                Publicar comentario
              </>
            )}
          </button>
        </div>
      </form>

      <p className="text-center mt-3 mb-0">
        <button className="btn btn-link" onClick={() => setVerReglas(true)}>
          Reglas a tener en cuenta para comentar
        </button>
      </p>
    </div>
  )
}
