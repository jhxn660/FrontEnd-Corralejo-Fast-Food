import { moneda } from '../../utils/format'
import { Vacio } from '../../components/ui/Estado'

import { imagenDe, incluyeDe, tieneImagen, tonoDe } from './esquema'

/**
 * La carta tal como la administra el dueño: una tarjeta por categoría con sus platos y precios,
 * y sus mandos (mostrar u ocultar, editar y eliminar). Comparte `useMenu` con CartaCliente: una
 * sola fuente de datos, dos presentaciones. La miniatura muestra el logo si al plato le falta foto.
 */
export default function GestionCategorias({
  categorias,
  escribiendo,
  onEditar,
  onAlternar,
  onEliminar,
  onEditarPlato,
  onAlternarPlato,
}) {
  if (categorias.length === 0) {
    return (
      <div className="card border-0 shadow-sm">
        <Vacio texto="No hay categorías que coincidan." icono="fa-utensils" />
      </div>
    )
  }

  return (
    <div className="row g-3">
      {categorias.map((categoria) => {
        const precios = categoria.productos.map((plato) => plato.precio).filter((p) => p > 0)
        const desde = precios.length > 0 ? Math.min(...precios) : 0
        const hasta = precios.length > 0 ? Math.max(...precios) : 0
        const agotados = categoria.productos.filter((p) => p.estado === 'Inhabilitado').length

        return (
          <div className="col-12 col-xl-6" key={categoria.id}>
            <article
              className={`card h-100 border-0 shadow-sm cinta-superior ${
                categoria.disponible ? '' : 'bg-body-tertiary'
              }`}
              style={{ '--color-cinta': tonoDe(categoria.nombre, categoria.nombre) }}
            >
              <div className="card-body">
                <div className="d-flex gap-3 mb-3">
                  <div className="icon-tile d-flex align-items-center justify-content-center flex-shrink-0">
                    <i className={categoria.icono} />
                  </div>
                  <div className="flex-grow-1 min-width-0">
                    <div className="d-flex align-items-start gap-2">
                      <h3 className="h6 fw-bold mb-1 flex-grow-1">{categoria.nombre}</h3>
                      {!categoria.disponible && (
                        <span className="badge bg-dark flex-shrink-0">
                          <i className="fa-solid fa-eye-slash me-1" />
                          Oculta
                        </span>
                      )}
                    </div>
                    <p className="text-secondary small mb-2 recorte-2">
                      {categoria.descripcion || 'Sin descripción.'}
                    </p>
                    <div className="d-flex flex-wrap gap-2">
                      <span className="badge bg-secondary">
                        {categoria.productos.length} plato(s)
                      </span>
                      {precios.length > 0 && (
                        <span className="badge bg-brand">
                          {desde === hasta
                            ? moneda(desde)
                            : `${moneda(desde)} – ${moneda(hasta)}`}
                        </span>
                      )}
                      {agotados > 0 && (
                        <span className="badge bg-warning text-dark">{agotados} agotado(s)</span>
                      )}
                    </div>
                  </div>
                </div>

                {categoria.productos.length === 0 ? (
                  <p className="text-secondary small fst-italic mb-0">
                    Esta categoría está vacía: el cliente ve un hueco en la carta.
                  </p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Plato</th>
                          <th className="text-end">Precio</th>
                          <th className="text-center">A la venta</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {categoria.productos.map((plato) => (
                          <tr key={plato.id}>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <img
                                  className={`miniatura-plato ${
                                    tieneImagen(plato) ? '' : 'miniatura-respaldo'
                                  }`}
                                  src={imagenDe(plato)}
                                  alt={tieneImagen(plato) ? `Foto de ${plato.nombre}` : ''}
                                  aria-hidden={tieneImagen(plato) ? undefined : 'true'}
                                  loading="lazy"
                                />
                                <span className="min-width-0">
                                  <span className="fw-semibold">{plato.nombre}</span>
                                  {!tieneImagen(plato) && (
                                    <span className="badge bg-secondary ms-2 fw-normal">
                                      Sin foto
                                    </span>
                                  )}
                                  {plato.descripcion && (
                                    <small className="d-block text-secondary recorte-2">
                                      {plato.descripcion}
                                    </small>
                                  )}
                                </span>
                              </div>
                            </td>
                            <td className="text-end fw-semibold text-nowrap">
                              {moneda(plato.precio)}
                              {plato.esCombo && (
                                <small className="d-block text-secondary fw-normal">
                                  Combo · {plato.combo.modoPrecio === 'sum' ? 'suma de productos' : 'precio fijo'}
                                  <span className="d-block">{incluyeDe(plato)}</span>
                                </small>
                              )}
                            </td>
                            {/* Cada plato se gestiona solo: el interruptor lo marca agotado y el lápiz abre su edición. */}
                            <td className="text-center">
                              <div className="form-check form-switch d-inline-block mb-0">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  role="switch"
                                  checked={plato.estado !== 'Inhabilitado'}
                                  onChange={() => onAlternarPlato(categoria, plato)}
                                  disabled={escribiendo}
                                  aria-label={`${plato.nombre}: ${
                                    plato.estado === 'Inhabilitado' ? 'agotado' : 'a la venta'
                                  }`}
                                />
                              </div>
                            </td>
                            <td className="text-end">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => onEditarPlato(categoria, plato)}
                                disabled={escribiendo}
                                aria-label={`Editar ${plato.nombre}`}
                              >
                                <i className="fa-solid fa-pen" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="card-footer bg-transparent d-flex flex-wrap gap-2 align-items-center">
                {/* Un interruptor (y no un botón con el estado escrito): se ve de un vistazo si
                    la categoría está visible y no se confunde con la acción. */}
                <div className="form-check form-switch mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id={`visible-${categoria.id}`}
                    checked={categoria.disponible}
                    onChange={() => onAlternar(categoria)}
                    disabled={escribiendo}
                  />
                  <label className="form-check-label small" htmlFor={`visible-${categoria.id}`}>
                    {categoria.disponible ? 'Visible en la carta' : 'Oculta para el cliente'}
                  </label>
                </div>

                <div className="ms-auto d-flex gap-2">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => onEditar(categoria)}
                    disabled={escribiendo}
                  >
                    <i className="fa-solid fa-pen me-2" />
                    Editar
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => onEliminar(categoria)}
                    disabled={escribiendo}
                  >
                    <i className="fa-solid fa-trash-can me-2" />
                    Eliminar
                  </button>
                </div>
              </div>
            </article>
          </div>
        )
      })}
    </div>
  )
}
