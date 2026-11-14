import { useCallback } from 'react'

import { useRecurso } from '../../hooks/useRecurso'
import { fechaCorta, inicialesDe } from '../../utils/format'
import { Cargando, Vacio } from '../../components/ui/Estado'
import Estrellas from '../../components/ui/Estrellas'
import { nombrePublico } from '../pqrs/esquema'
import { valoracionesApi } from './api'

const AUTOR_ANONIMO = 'Visitante sin cuenta'

/**
 * Valoraciones registradas desde el QR de un ticket: los comentarios que
 * llevan QR (ver `valoracionesApi` en api.js).
 *
 * La ve el cliente que la escribió, cualquier otro usuario y el administrador:
 * es la misma lista para los tres. `detallado` (el administrador) añade el
 * código del QR y quién la dejó, que es lo que permite auditar que cada
 * valoración corresponde a una compra real.
 *
 * Los productos van debajo, en pequeño: son lo que recibe la nota y la prueba
 * de que quien puntuó compró eso.
 */
export default function ListaValoraciones({ detallado = false }) {
  const cargar = useCallback(() => valoracionesApi.listar(), [])
  const { datos: valoraciones, cargando } = useRecurso(cargar, [])

  if (cargando && valoraciones.length === 0) return <Cargando texto="Cargando valoraciones…" />

  return (
    <section className="card border-0 shadow-sm mb-3">
      <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h2 className="h6 fw-bold mb-0">
          <i className="fa-solid fa-star text-brand me-2" />
          Valoraciones de pedidos
        </h2>
        {valoraciones.length > 0 && (
          <span className="badge bg-secondary">{valoraciones.length}</span>
        )}
      </div>

      <div className="card-body">
        {valoraciones.length === 0 ? (
          <Vacio
            texto="Todavía nadie ha calificado un pedido con el QR de su ticket."
            icono="fa-qrcode"
          />
        ) : (
          <div className="row row-cols-1 row-cols-md-2 g-3">
            {valoraciones.map((valoracion) => {
              const autor = valoracion.usuario ? nombrePublico(valoracion.usuario) : AUTOR_ANONIMO

              return (
                <div className="col" key={valoracion.id}>
                  <article className="card h-100 border-0 shadow-sm cinta-superior p-3">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span
                        className="icon-tile icon-tile-sm d-flex align-items-center justify-content-center flex-shrink-0 rounded-circle fw-bold small"
                        aria-hidden="true"
                      >
                        {inicialesDe(autor)}
                      </span>
                      <span className="min-width-0 flex-grow-1">
                        <strong className="d-block small text-truncate">{autor}</strong>
                        <small className="text-secondary">
                          Publicado: {fechaCorta(valoracion.fecha)}
                        </small>
                      </span>
                      <Estrellas valor={valoracion.estrellas} />
                    </div>

                    {/* Tres casos: comentario aprobado, comentario pendiente y
                        puntuación sin texto, que es igual de válida. */}
                    {valoracion.texto ? (
                      <p className="small mb-3">{valoracion.texto}</p>
                    ) : (
                      <p className="small text-secondary fst-italic mb-3">
                        {valoracion.moderando
                          ? 'Comentario pendiente de aprobación.'
                          : 'Puntuación sin comentario.'}
                      </p>
                    )}

                    <p className="small text-secondary mb-1">
                      <i className="fa-solid fa-basket-shopping me-2" />
                      {detallado
                        ? `Calificó lo del ticket ${valoracion.ticket}:`
                        : 'Calificó este pedido:'}
                    </p>
                    <p className="small text-secondary mb-0">
                      {(valoracion.productos ?? [])
                        .map((item) => `${item.cantidad}× ${item.producto}`)
                        .join(' · ')}
                    </p>

                    {detallado && (
                      <p className="small text-secondary border-top mt-3 pt-3 mb-0">
                        <i className="fa-solid fa-qrcode me-2" />
                        <code>{valoracion.qr}</code> · {valoracion.usuario ?? 'sin cuenta'}
                      </p>
                    )}
                  </article>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
