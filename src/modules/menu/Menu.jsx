import { useState } from 'react'

import { moneda } from '../../utils/format'
import Modal from '../../components/ui/Modal'
import ConfirmarEliminacion from '../../components/ui/ConfirmarEliminacion'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, Error, Vacio } from '../../components/ui/Estado'
import { useConfirmacion } from '../../hooks/useConfirmacion'
import { useMenu } from './useMenu'

const ORDENES = {
  '': 'Orden por defecto',
  asc: 'Precio: menor a mayor',
  desc: 'Precio: mayor a menor',
}

const FORMULARIOS = {
  categoria: { titulo: 'Registrar nueva categoría', icono: 'fa-circle-plus' },
  combo: { titulo: 'Registrar nuevo combo', icono: 'fa-burger' },
  edicion: { titulo: 'Editar categoría', icono: 'fa-pen' },
}

const categoriaNueva = (icono) => ({
  nombre: '',
  descripcion: '',
  icono,
  estado: 'Disponible',
  productos: [],
})

const PRODUCTO_NUEVO = { nombre: '', precio: '' }

/**
 * Carta del restaurante. Una sola pantalla para los tres roles: `editable`
 * añade las operaciones de escritura y nada más (R44).
 *
 * Esta vista no calcula, no filtra y no habla con la API: todo eso es useMenu.
 * Aquí solo se pinta y se recogen eventos.
 */
export default function Menu({ editable = false }) {
  const {
    categorias,
    cargando,
    error,
    recargar,
    busqueda,
    setBusqueda,
    orden,
    setOrden,
    guardar,
    eliminar,
    alternarEstado,
    escribiendo,
  } = useMenu({ editable })

  const [formulario, setFormulario] = useState(null) // { modo, categoria }
  const [productoNuevo, setProductoNuevo] = useState(PRODUCTO_NUEVO)
  const [errorFormulario, setErrorFormulario] = useState(null)

  // useMenu.eliminar no lanza: devuelve { ok, error }. El modal necesita el
  // fallo como excepción para quedarse abierto en vez de cerrarse como si
  // hubiera funcionado.
  const eliminacion = useConfirmacion(async (categoria) => {
    const { ok, error: fallo } = await eliminar(categoria.id)
    if (!ok) throw fallo ?? new Error('No se pudo eliminar la categoría.')
  })

  const abrirFormulario = (modo, categoria) => {
    setProductoNuevo(PRODUCTO_NUEVO)
    setErrorFormulario(null)
    setFormulario({ modo, categoria })
  }

  const cerrarFormulario = () => setFormulario(null)

  const cambiarCategoria = (cambios) =>
    setFormulario((actual) => ({ ...actual, categoria: { ...actual.categoria, ...cambios } }))

  const agregarProducto = () => {
    const nombre = productoNuevo.nombre.trim()
    const precio = Number(productoNuevo.precio)
    if (!nombre || !Number.isFinite(precio) || precio <= 0) return

    cambiarCategoria({
      productos: [...formulario.categoria.productos, { nombre, precio, estado: 'Disponible' }],
    })
    setProductoNuevo(PRODUCTO_NUEVO)
  }

  const quitarProducto = (posicion) =>
    cambiarCategoria({
      productos: formulario.categoria.productos.filter((_, indice) => indice !== posicion),
    })

  const guardarCategoria = async (evento) => {
    evento.preventDefault()

    // Una categoría sin productos se ve como un hueco en la carta del cliente.
    if (formulario.categoria.productos.length === 0) {
      setErrorFormulario('Añade al menos un producto antes de guardar.')
      return
    }

    setErrorFormulario(null)
    const { ok, error: fallo } = await guardar(formulario.categoria)
    if (ok) cerrarFormulario()
    else setErrorFormulario(fallo?.message ?? 'No se pudo guardar la categoría.')
  }

  return (
    <>
      <EncabezadoPagina
        titulo={editable ? 'Gestión de Menú' : 'Menú'}
        descripcion={
          editable
            ? 'Crea, actualiza y elimina las categorías de la carta.'
            : 'Consulta los productos y categorías disponibles en la carta.'
        }
      >
        <select
          className="form-select"
          style={{ width: 'auto' }}
          value={orden}
          onChange={(evento) => setOrden(evento.target.value)}
          aria-label="Ordenar productos por precio"
        >
          {Object.entries(ORDENES).map(([valor, texto]) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </select>

        {editable && (
          <>
            <button
              className="btn btn-primary"
              onClick={() => abrirFormulario('categoria', categoriaNueva('fa-solid fa-utensils'))}
            >
              <i className="fa-solid fa-circle-plus me-2" />
              Nueva categoría
            </button>
            <button
              className="btn btn-primary"
              onClick={() => abrirFormulario('combo', categoriaNueva('fa-solid fa-burger'))}
            >
              <i className="fa-solid fa-burger me-2" />
              Nuevo combo
            </button>
          </>
        )}

        <button className="btn btn-outline-secondary" onClick={recargar} disabled={cargando}>
          <i className="fa-solid fa-rotate me-2" />
          Actualizar
        </button>
      </EncabezadoPagina>

      <Error texto={error?.message} onReintentar={recargar} />

      <div className="input-group mb-4" style={{ maxWidth: '24rem' }}>
        <span className="input-group-text bg-white">
          <i className="fa-solid fa-magnifying-glass text-secondary" />
        </span>
        <input
          className="form-control"
          placeholder="Consultar categoría o producto…"
          aria-label="Buscar categoría o producto"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
        />
      </div>

      {cargando && <Cargando texto="Cargando menú…" />}

      {!cargando && categorias.length === 0 && (
        <Vacio texto="No hay categorías que coincidan." icono="fa-utensils" />
      )}

      <div className="row g-3">
        {categorias.map((categoria) => (
          <div className="col-12 col-xl-6" key={categoria.id}>
            <article className="card h-100 border-0 shadow-sm">
              <div className="card-body d-flex gap-3">
                <div className="icon-tile d-flex align-items-center justify-content-center flex-shrink-0">
                  <i className={categoria.icono} />
                </div>
                <div className="flex-grow-1 min-width-0">
                  <div className="d-flex align-items-start gap-2">
                    <h3 className="h6 fw-bold mb-1 flex-grow-1">{categoria.nombre}</h3>
                    {!categoria.disponible && (
                      <span className="badge bg-secondary flex-shrink-0">Inhabilitado</span>
                    )}
                  </div>
                  <p className="text-secondary small">{categoria.descripcion}</p>

                  <ul className="list-group list-group-flush small">
                    {categoria.productos.map((producto) => (
                      <li key={producto.id} className="list-group-item px-0 py-1 border-0">
                        <div className="d-flex justify-content-between gap-3">
                          <span>{producto.nombre}</span>
                          <span className="fw-semibold text-brand flex-shrink-0">
                            {moneda(producto.precio)}
                          </span>
                        </div>
                        {producto.descripcion && (
                          <p className="text-secondary mb-0 fst-italic">{producto.descripcion}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {editable && (
                <div className="card-footer bg-transparent d-flex flex-wrap gap-2 align-items-center">
                  <button
                    className={`btn btn-sm btn-${categoria.disponible ? 'success' : 'secondary'}`}
                    onClick={() => alternarEstado(categoria)}
                    disabled={escribiendo}
                  >
                    {categoria.estado}
                  </button>
                  <div className="ms-auto d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => abrirFormulario('edicion', structuredClone(categoria))}
                    >
                      <i className="fa-solid fa-pen me-2" />
                      Editar
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => eliminacion.pedir(categoria)}
                    >
                      <i className="fa-solid fa-trash-can me-2" />
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </article>
          </div>
        ))}
      </div>

      {formulario && (
        <Modal
          titulo={FORMULARIOS[formulario.modo].titulo}
          icono={FORMULARIOS[formulario.modo].icono}
          tamano="modal-lg"
          onClose={cerrarFormulario}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={cerrarFormulario}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                form="formulario-categoria"
                type="submit"
                disabled={escribiendo}
              >
                {escribiendo ? 'Guardando…' : 'Guardar'}
              </button>
            </>
          }
        >
          <form id="formulario-categoria" onSubmit={guardarCategoria} className="d-grid gap-3">
            {errorFormulario && (
              <div className="alert alert-danger mb-0" role="alert">
                {errorFormulario}
              </div>
            )}
            <div>
              <label className="form-label" htmlFor="nombre-categoria">
                {formulario.modo === 'combo' ? 'Nombre del combo' : 'Título de la categoría'}
              </label>
              <input
                id="nombre-categoria"
                className="form-control"
                value={formulario.categoria.nombre}
                onChange={(evento) => cambiarCategoria({ nombre: evento.target.value })}
                placeholder="Ej. Perros Calientes"
                required
              />
            </div>

            <div>
              <label className="form-label" htmlFor="descripcion-categoria">
                Descripción
              </label>
              <textarea
                id="descripcion-categoria"
                className="form-control"
                rows="2"
                value={formulario.categoria.descripcion}
                onChange={(evento) => cambiarCategoria({ descripcion: evento.target.value })}
                required={formulario.modo === 'combo'}
              />
            </div>

            <fieldset>
              <legend className="form-label">Productos</legend>
              <div className="input-group mb-2">
                <input
                  className="form-control"
                  placeholder="Nombre del producto"
                  aria-label="Nombre del producto"
                  value={productoNuevo.nombre}
                  onChange={(evento) =>
                    setProductoNuevo({ ...productoNuevo, nombre: evento.target.value })
                  }
                />
                {/* El precio es numérico: el back lo espera como número y así
                    no hay que reparsear "$12.500" para ordenar (R54). */}
                <input
                  className="form-control"
                  style={{ maxWidth: '8rem' }}
                  type="number"
                  min="1"
                  step="50"
                  placeholder="Precio"
                  aria-label="Precio en pesos"
                  value={productoNuevo.precio}
                  onChange={(evento) =>
                    setProductoNuevo({ ...productoNuevo, precio: evento.target.value })
                  }
                />
                <button className="btn btn-primary" type="button" onClick={agregarProducto}>
                  <i className="fa-solid fa-plus" />
                  <span className="visually-hidden">Añadir producto</span>
                </button>
              </div>

              {formulario.categoria.productos.length === 0 ? (
                <p className="text-secondary small mb-0">Ningún producto agregado todavía.</p>
              ) : (
                <ul className="list-group">
                  {formulario.categoria.productos.map((producto, posicion) => (
                    <li
                      key={`${producto.nombre}-${posicion}`}
                      className="list-group-item d-flex align-items-center justify-content-between"
                    >
                      <span>{producto.nombre}</span>
                      <span className="d-flex align-items-center gap-3">
                        <span className="fw-semibold">{moneda(producto.precio)}</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => quitarProducto(posicion)}
                          aria-label={`Quitar ${producto.nombre}`}
                        >
                          <i className="fa-solid fa-trash-can" />
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>
          </form>
        </Modal>
      )}

      {eliminacion.objetivo && (
        <ConfirmarEliminacion
          entidad="la categoría"
          nombre={eliminacion.objetivo.nombre}
          consecuencias={[
            `Se eliminarán sus ${eliminacion.objetivo.productos.length} producto(s).`,
            'Dejará de verse en la carta del empleado y del cliente.',
          ]}
          requiereCasilla
          enviando={eliminacion.enviando}
          error={eliminacion.error}
          onConfirmar={eliminacion.confirmar}
          onCancelar={eliminacion.cancelar}
        />
      )}
    </>
  )
}
