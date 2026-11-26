import { useMemo, useState } from 'react'

import { moneda } from '../../utils/format'
import { Vacio } from '../../components/ui/Estado'
import Modal from '../../components/ui/Modal'
import { imagenDe, tieneImagen, tonoDe } from '../products/esquema'

const TODAS = '__todas__'

/**
 * Selector de productos para añadir al pedido.
 *
 * - Las categorías son las de la carta (`productosVendibles()`), sin las ocultas ni los agotados.
 * - Toda la tarjeta suma una unidad por clic; el botón «−» resta sin propagar el clic.
 * - Cada producto con receta muestra cuántas unidades MÁS caben con el stock, descontando lo
 *   que ya lleva el pedido y lo elegido aquí. En 0, la tarjeta deja de sumar.
 */
export default function CatalogoModal({ categorias, simulador, itemsPedido = [], onAgregar, onCerrar }) {
  const [pestana, setPestana] = useState(TODAS)
  const [busqueda, setBusqueda] = useState('')
  const [seleccion, setSeleccion] = useState({}) // { [id]: { name, price, qty } }

  const productos = useMemo(() => {
    const texto = busqueda.toLowerCase().trim()
    return categorias
      .filter((categoria) => pestana === TODAS || categoria.id === pestana)
      .flatMap((categoria) =>
        categoria.productos
          .filter(
            (producto) =>
              !texto ||
              `${producto.nombre} ${producto.descripcion ?? ''}`.toLowerCase().includes(texto)
          )
          .map((producto) => ({ ...producto, categoria: categoria.nombre }))
      )
  }, [categorias, pestana, busqueda])

  const lineasEnCurso = useMemo(
    () => [...itemsPedido, ...Object.values(seleccion)],
    [itemsPedido, seleccion]
  )

  /** Unidades que aún caben de un producto; null = sin receta (sin límite). */
  const quedan = (producto) => simulador.cuantasMas(producto.nombre, lineasEnCurso)

  const cambiarCantidad = (producto, delta) => {
    if (delta > 0 && quedan(producto) === 0) return
    setSeleccion((previo) => {
      const cantidad = Math.max(0, Math.min(99, (previo[producto.id]?.qty ?? 0) + delta))
      const copia = { ...previo }
      if (cantidad === 0) delete copia[producto.id]
      // productoId y combo viajan con la línea: el backend arma el pedido con ellos
      else copia[producto.id] = {
        name: producto.nombre,
        price: producto.precio,
        qty: cantidad,
        productoId: producto.productoId,
        combo: producto.combo,
      }
      return copia
    })
  }

  const elegidos = Object.values(seleccion)
  const unidades = elegidos.reduce((suma, item) => suma + item.qty, 0)
  const total = elegidos.reduce((suma, item) => suma + item.price * item.qty, 0)

  return (
    <Modal
      titulo="Agregar productos al pedido"
      icono="fa-cart-plus"
      tamano="modal-xl"
      cerrarAlPulsarFuera={false}
      onClose={onCerrar}
      footer={
        <div className="d-flex flex-wrap justify-content-between align-items-center w-100 gap-2">
          <span className="small">
            {unidades > 0 ? (
              <>
                <strong>{unidades}</strong> und · subtotal{' '}
                <strong className="text-brand">{moneda(total)}</strong>
              </>
            ) : (
              <span className="text-secondary">Toca un producto para añadirlo.</span>
            )}
          </span>
          <span className="d-flex gap-2">
            {elegidos.length > 0 && (
              <button className="btn btn-outline-secondary" onClick={() => setSeleccion({})}>
                Vaciar
              </button>
            )}
            <button className="btn btn-outline-secondary" onClick={onCerrar}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              disabled={elegidos.length === 0}
              onClick={() => onAgregar(elegidos)}
            >
              <i className="fa-solid fa-plus me-2" />
              Agregar al pedido
            </button>
          </span>
        </div>
      }
    >
      <div className="input-group mb-3">
        <span className="input-group-text">
          <i className="fa-solid fa-magnifying-glass text-secondary" />
        </span>
        <input
          className="form-control"
          placeholder="Buscar producto…"
          aria-label="Buscar producto de la carta"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          autoFocus
        />
        {busqueda && (
          <button
            className="btn btn-outline-secondary"
            onClick={() => setBusqueda('')}
            aria-label="Limpiar búsqueda"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        )}
      </div>

      {/* Categorías como botones grandes en rejilla: fáciles de tocar en una pantalla táctil. */}
      <div
        className="row row-cols-2 row-cols-sm-3 row-cols-lg-4 row-cols-xl-6 g-2 mb-3"
        role="group"
        aria-label="Categorías de la carta"
      >
        {[{ id: TODAS, nombre: 'Todas', icono: 'fa-solid fa-border-all' }, ...categorias].map((categoria) => {
          const activa = pestana === categoria.id
          return (
            <div className="col" key={categoria.id}>
              <button
                type="button"
                className={`btn w-100 h-100 py-2 px-2 fw-semibold sin-seleccion ${
                  activa ? 'btn-primary' : 'btn-outline-secondary'
                }`}
                style={{ minHeight: '3rem' }}
                onClick={() => setPestana(categoria.id)}
                aria-pressed={activa}
              >
                <i
                  className={`${categoria.icono ?? 'fa-solid fa-utensils'} me-2`}
                  style={activa ? undefined : { color: tonoDe(categoria.nombre, categoria.nombre) }}
                  aria-hidden="true"
                />
                <span className="small">{categoria.nombre}</span>
              </button>
            </div>
          )
        })}
      </div>

      {categorias.length === 0 && (
        <Vacio
          texto="La carta no tiene productos disponibles. Revisa Gestión de Menú o que la API esté en marcha."
          icono="fa-plug-circle-xmark"
        />
      )}

      {categorias.length > 0 && productos.length === 0 && (
        <Vacio texto="Ningún producto coincide con la búsqueda." icono="fa-magnifying-glass" />
      )}

      <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-2">
        {productos.map((producto) => {
          const cantidad = seleccion[producto.id]?.qty ?? 0
          const restantes = quedan(producto)
          const sinStock = restantes === 0
          // Agotado de verdad: no cabe ninguna y no hay ninguna elegida ni en el pedido.
          const agotado = sinStock && cantidad === 0
          const limitante = sinStock ? simulador.limitante(producto.nombre) : null

          return (
            <div className="col" key={producto.id}>
              <div
                className={`card h-100 sin-seleccion ${agotado ? 'opacity-50' : 'card-clickable'} ${
                  cantidad > 0 ? 'border-2' : ''
                }`}
                style={cantidad > 0 ? { borderColor: 'var(--cff-naranja)' } : undefined}
                role="button"
                tabIndex={agotado ? -1 : 0}
                aria-disabled={sinStock}
                aria-label={
                  sinStock
                    ? `${producto.nombre}: sin insumos para preparar más${cantidad > 0 ? `, llevas ${cantidad}` : ''}`
                    : `Añadir una unidad de ${producto.nombre}${cantidad > 0 ? `, llevas ${cantidad}` : ''}`
                }
                onClick={() => cambiarCantidad(producto, 1)}
                onKeyDown={(evento) => {
                  if (evento.key === 'Enter' || evento.key === ' ') {
                    evento.preventDefault()
                    cambiarCantidad(producto, 1)
                  }
                }}
              >
                <div className="card-body p-3">
                  <div className="d-flex gap-2 align-items-start mb-2">
                    <img
                      className={`miniatura-plato ${
                        tieneImagen(producto) ? '' : 'miniatura-respaldo'
                      }`}
                      src={imagenDe(producto)}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                    />
                    <div className="flex-grow-1 min-width-0">
                      <p className="fw-semibold mb-0">
                        {producto.nombre}
                        {producto.combo && <span className="badge bg-dark ms-2">Combo</span>}
                      </p>
                      <small className="text-secondary recorte-2 d-block">
                        {producto.descripcion}
                      </small>
                    </div>
                    {cantidad > 0 && (
                      <span className="badge bg-brand fs-6 flex-shrink-0">×{cantidad}</span>
                    )}
                  </div>

                  {restantes !== null && (
                    <p className="small mb-2">
                      {sinStock ? (
                        <span className="badge bg-danger" title={limitante ? `Falta: ${limitante.nombre}` : undefined}>
                          <i className="fa-solid fa-ban me-1" />
                          {agotado ? 'Agotado' : 'Sin stock para más'}
                          {limitante && ` · ${limitante.nombre}`}
                        </span>
                      ) : (
                        <span className={`badge ${restantes <= 5 ? 'bg-warning text-dark' : 'bg-success'}`}>
                          <i className="fa-solid fa-box-open me-1" />
                          {restantes} disponible{restantes === 1 ? '' : 's'}
                        </span>
                      )}
                    </p>
                  )}

                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <span className="fw-bold text-brand">{moneda(producto.precio)}</span>
                    {cantidad > 0 ? (
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={(evento) => {
                          evento.stopPropagation()
                          cambiarCantidad(producto, -1)
                        }}
                        aria-label={`Quitar una unidad de ${producto.nombre}`}
                      >
                        <i className="fa-solid fa-minus me-1" />
                        Quitar
                      </button>
                    ) : (
                      !agotado && (
                        <small className="text-secondary">
                          <i className="fa-solid fa-hand-pointer me-1" />
                          Toca para añadir
                        </small>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {elegidos.length > 0 && (
        <div className="modal-resumen mt-3">
          <strong className="small text-uppercase d-block mb-2">Se agregará al pedido</strong>
          <ul className="list-unstyled small mb-0">
            {elegidos.map((item) => (
              <li className="d-flex justify-content-between" key={item.name}>
                <span>
                  {item.qty} und × {item.name}
                </span>
                <span className="fw-semibold">{moneda(item.price * item.qty)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}
