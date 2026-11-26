import { moneda } from '../../utils/format'
import Estrellas from '../../components/ui/Estrellas'

import { ahorroDe, imagenDe, incluyeDe, tieneImagen, tonoDe } from './esquema'

/**
 * Tarjeta de un plato en la carta del cliente. Sin foto propia se pinta el logo del Corralejo
 * sobre el fondo oscuro de la marca.
 */
export default function TarjetaPlato({ plato, categoria, destacado = false, onAbrir }) {
  const tono = tonoDe(plato.nombre, categoria)
  const agotado = plato.estado === 'Inhabilitado'

  return (
    <div className="col">
      <article
        className={`tarjeta-plato card h-100 border-0 shadow-sm overflow-hidden ${
          agotado ? 'opacity-75' : 'card-clickable'
        }`}
        role={agotado ? undefined : 'button'}
        tabIndex={agotado ? undefined : 0}
        aria-label={agotado ? undefined : `Ver ${plato.nombre}`}
        onClick={() => !agotado && onAbrir(plato)}
        onKeyDown={(evento) => {
          if (agotado) return
          if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault()
            onAbrir(plato)
          }
        }}
      >
        <div className="plato-foto position-relative" style={{ '--plato-tono': tono }}>
          <img
            className={`plato-foto-img ${tieneImagen(plato) ? '' : 'plato-foto-respaldo'}`}
            src={imagenDe(plato)}
            alt={tieneImagen(plato) ? `Foto de ${plato.nombre}` : ''}
            aria-hidden={tieneImagen(plato) ? undefined : 'true'}
            loading="lazy"
          />

          {destacado && (
            <span className="badge bg-brand position-absolute top-0 start-0 m-2">
              <i className="fa-solid fa-fire me-1" />
              Más pedido
            </span>
          )}
          {agotado && (
            <span className="badge bg-dark position-absolute top-0 end-0 m-2">
              Agotado por hoy
            </span>
          )}
        </div>

        <div className="card-body d-flex flex-column p-3">
          <h4 className="h6 fw-bold mb-1">{plato.nombre}</h4>

          {plato.esCombo && <p className="small text-secondary mb-1">Incluye: {incluyeDe(plato)}</p>}

          {plato.descripcion && (
            <p className="text-secondary small recorte-3 mb-2">{plato.descripcion}</p>
          )}

          {/* Estrellas de los clientes (calificación por QR de sus compras) */}
          {plato.calificacion ? (
            <p className="mb-2 small d-flex align-items-center gap-2">
              <Estrellas valor={plato.calificacion} />
              <span className="text-secondary">({plato.totalCalificaciones})</span>
            </p>
          ) : null}

          <div className="mt-auto d-flex align-items-center justify-content-between gap-2">
            <span>
              <span className="plato-precio d-block">{moneda(plato.precio)}</span>
              {ahorroDe(plato) > 0 && (
                <small className="text-success">Ahorras {moneda(ahorroDe(plato))}</small>
              )}
            </span>
            {!agotado && (
              <span className="btn btn-sm btn-outline-primary">
                Ver
                <i className="fa-solid fa-arrow-right ms-2" />
              </span>
            )}
          </div>
        </div>
      </article>
    </div>
  )
}
