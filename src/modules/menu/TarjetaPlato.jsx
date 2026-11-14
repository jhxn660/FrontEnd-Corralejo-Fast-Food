import { moneda } from '../../utils/format'
import { imagenDe, tieneImagen, tonoDe } from './esquema'

/**
 * Tarjeta de un plato en la carta del cliente.
 *
 * LA FOTO
 * La que el administrador haya subido en la edición del plato. Mientras no
 * suba ninguna se pinta el logo del Corralejo sobre el fondo oscuro de la
 * marca: identifica la casa sin fingir ser una fotografía del plato, que es
 * lo que hacían las imágenes de archivo que había antes aquí.
 */
export default function TarjetaPlato({ plato, categoria, destacado = false, onAbrir }) {
  const tono = tonoDe(plato.nombre, categoria)
  const agotado = plato.estado === 'Inhabilitado'

  return (
    <div className="col">
      <article
        className={`card h-100 border-0 shadow-sm overflow-hidden ${
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

          {plato.descripcion && (
            <p className="text-secondary small recorte-3 mb-2">{plato.descripcion}</p>
          )}

          {plato.calificacion ? (
            <p className="mb-2 small" aria-label={`Calificación ${plato.calificacion} de 5`}>
              <span className="text-warning" aria-hidden="true">
                {'★'.repeat(plato.calificacion)}
                {'☆'.repeat(Math.max(0, 5 - plato.calificacion))}
              </span>
            </p>
          ) : null}

          <div className="mt-auto d-flex align-items-center justify-content-between gap-2">
            <span>
              <span className="plato-precio d-block">{moneda(plato.precio)}</span>
              {plato.precioCombo && (
                <small className="text-secondary">Combo {moneda(plato.precioCombo)}</small>
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
