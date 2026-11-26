import { useState } from 'react'

import Modal from '../../components/ui/Modal'
import { HISTORIAS, MISION } from '../../data/contenido'

/**
 * Narrativa de la casa: la misión y las cuatro historias del refugio.
 *
 * QUÉ CAMBIA
 * Los botones eran cuatro `btn-outline-primary btn-sm` en fila, con solo el
 * título y sin ninguna pista de qué había detrás; el modal que abrían era un
 * párrafo suelto sin márgenes ni cierre claro. Ahora cada historia es una
 * tarjeta con su icono y un resumen que invita a abrirla, y el modal presenta
 * el texto como una lectura: ancho cómodo, tipografía mayor y navegación entre
 * historias sin tener que cerrar y volver a abrir.
 */
export default function NarrativaCreativa() {
  const [indice, setIndice] = useState(null)

  const historia = indice === null ? null : HISTORIAS[indice]
  const hayAnterior = indice !== null && indice > 0
  const haySiguiente = indice !== null && indice < HISTORIAS.length - 1

  return (
    <>
      <section className="card border-0 shadow-sm mb-3">
        <div className="card-header bg-white">
          <h2 className="h6 fw-bold mb-0">
            <i className="fa-solid fa-book-open text-brand me-2" />
            Narrativa creativa
          </h2>
        </div>

        <div className="card-body">
          <p className="text-secondary">{MISION}</p>

          <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3">
            {HISTORIAS.map((item, posicion) => (
              <div className="col" key={item.id}>
                <button
                  className="card card-clickable border-0 shadow-sm h-100 w-100 text-start p-3"
                  onClick={() => setIndice(posicion)}
                >
                  <div className="icon-tile d-flex align-items-center justify-content-center mb-3">
                    <i className={`fa-solid ${item.icono}`} />
                  </div>
                  <h3 className="h6 fw-bold mb-2">{item.titulo}</h3>
                  <p className="text-secondary small recorte-3 mb-3">{item.resumen}</p>
                  <span className="mt-auto small fw-semibold text-brand">
                    Leer la historia
                    <i className="fa-solid fa-arrow-right ms-2" />
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {historia && (
        <Modal
          titulo={historia.titulo}
          icono={historia.icono}
          descripcion={historia.resumen}
          tamano="modal-lg"
          onClose={() => setIndice(null)}
          footer={
            <>
              <button
                className="btn btn-outline-secondary"
                onClick={() => setIndice(indice - 1)}
                disabled={!hayAnterior}
              >
                <i className="fa-solid fa-chevron-left me-2" />
                Anterior
              </button>
              <span className="small text-secondary mx-auto">
                Historia {indice + 1} de {HISTORIAS.length}
              </span>
              <button
                className="btn btn-outline-secondary"
                onClick={() => setIndice(indice + 1)}
                disabled={!haySiguiente}
              >
                Siguiente
                <i className="fa-solid fa-chevron-right ms-2" />
              </button>
              <button className="btn btn-primary" onClick={() => setIndice(null)}>
                Cerrar
              </button>
            </>
          }
        >
          {/* Medida de lectura acotada: una línea de 120 caracteres cansa. */}
          <p className="fs-6 lh-lg mb-0" style={{ maxWidth: '62ch' }}>
            {historia.texto}
          </p>
        </Modal>
      )}
    </>
  )
}
