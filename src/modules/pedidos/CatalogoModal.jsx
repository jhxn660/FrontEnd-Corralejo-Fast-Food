import { useMemo, useState } from 'react'

import { moneda } from '../../utils/format'
import Modal from '../../components/ui/Modal'
import { Vacio } from '../../components/ui/Estado'
import { CATEGORIAS, COLOR_SIN_CATEGORIA } from '../../data/graficas'

const TODAS = '__todas__'

/**
 * Selector de productos del catálogo para añadirlos al pedido.
 *
 * POR QUÉ ANTES NO FUNCIONABA
 * La pantalla pedía el catálogo con `api.list('catalogo')`, pero `catalogo` no
 * es una colección: es un objeto con una clave por categoría. `http.lista()`
 * normaliza toda respuesta a forma de lista y ante ese objeto devolvía `[]`, así
 * que este modal se abría con cero categorías y cero productos. No era un
 * problema del modal: no le llegaba nada que mostrar.
 *
 * Aprovechando el arreglo se quitó la navegación por subcategorías
 * (`isCategory`/`subKey`): ningún producto del catálogo la usa, así que era
 * código que no se podía alcanzar (R38). En su lugar hay un buscador, que es lo
 * que de verdad hace falta cuando hay veintinueve productos.
 */
export default function CatalogoModal({ catalogo, onAgregar, onCerrar }) {
  const categorias = Object.keys(catalogo)
  const [pestana, setPestana] = useState(TODAS)
  const [busqueda, setBusqueda] = useState('')
  const [seleccion, setSeleccion] = useState({}) // { [id]: { name, price, qty } }

  const tituloDe = (clave) => CATEGORIAS[clave]?.titulo ?? clave
  const colorDe = (clave) => CATEGORIAS[clave]?.color ?? COLOR_SIN_CATEGORIA

  const productos = useMemo(() => {
    const texto = busqueda.toLowerCase().trim()
    const claves = pestana === TODAS ? categorias : [pestana]

    return claves.flatMap((clave) =>
      (catalogo[clave] ?? [])
        .filter(
          (producto) =>
            !texto ||
            `${producto.name} ${producto.desc ?? ''}`.toLowerCase().includes(texto)
        )
        .map((producto) => ({ ...producto, categoria: clave }))
    )
  }, [catalogo, categorias, pestana, busqueda])

  const cambiarCantidad = (producto, delta) =>
    setSeleccion((previo) => {
      const id = producto.id ?? producto.name
      const cantidad = Math.max(0, Math.min(99, (previo[id]?.qty ?? 0) + delta))
      const copia = { ...previo }
      if (cantidad === 0) delete copia[id]
      else copia[id] = { name: producto.name, price: producto.price, qty: cantidad }
      return copia
    })

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
                <strong>{unidades}</strong> unidad(es) · subtotal{' '}
                <strong className="text-brand">{moneda(total)}</strong>
              </>
            ) : (
              <span className="text-secondary">Todavía no has elegido nada.</span>
            )}
          </span>
          <span className="d-flex gap-2">
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
      <div className="mb-3">
        <div className="input-group mb-3">
          <span className="input-group-text bg-white">
            <i className="fa-solid fa-magnifying-glass text-secondary" />
          </span>
          <input
            className="form-control"
            placeholder="Buscar producto…"
            aria-label="Buscar producto del catálogo"
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

        <ul className="nav nav-pills flex-wrap gap-1">
          <li className="nav-item">
            <button
              className={`nav-link ${pestana === TODAS ? 'active' : ''}`}
              onClick={() => setPestana(TODAS)}
            >
              Todas
            </button>
          </li>
          {categorias.map((clave) => (
            <li className="nav-item" key={clave}>
              <button
                className={`nav-link ${pestana === clave ? 'active' : ''}`}
                onClick={() => setPestana(clave)}
              >
                <span
                  className="d-inline-block rounded-circle me-2"
                  style={{ width: 9, height: 9, background: colorDe(clave) }}
                  aria-hidden="true"
                />
                {tituloDe(clave)}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {categorias.length === 0 && (
        <Vacio
          texto="El catálogo llegó vacío. Comprueba que la API esté en marcha."
          icono="fa-plug-circle-xmark"
        />
      )}

      {categorias.length > 0 && productos.length === 0 && (
        <Vacio texto="Ningún producto coincide con la búsqueda." icono="fa-magnifying-glass" />
      )}

      <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-2">
        {productos.map((producto) => {
          const id = producto.id ?? producto.name
          const cantidad = seleccion[id]?.qty ?? 0

          return (
            <div className="col" key={id}>
              <div
                className={`card h-100 ${cantidad > 0 ? 'border-2' : ''}`}
                style={cantidad > 0 ? { borderColor: 'var(--cff-naranja)' } : undefined}
              >
                <div className="card-body p-3">
                  <div className="d-flex gap-2 align-items-start mb-2">
                    <span className="fs-3 flex-shrink-0" aria-hidden="true">
                      {producto.emoji}
                    </span>
                    <div className="flex-grow-1 min-width-0">
                      <p className="fw-semibold mb-0">{producto.name}</p>
                      <small className="text-secondary recorte-2 d-block">{producto.desc}</small>
                    </div>
                  </div>

                  <div className="d-flex align-items-center justify-content-between gap-2">
                    <span className="fw-bold text-brand">{moneda(producto.price)}</span>

                    <div className="btn-group btn-group-sm">
                      <button
                        className="btn btn-outline-secondary"
                        onClick={() => cambiarCantidad(producto, -1)}
                        disabled={cantidad === 0}
                        aria-label={`Quitar una unidad de ${producto.name}`}
                      >
                        <i className="fa-solid fa-minus" />
                      </button>
                      <span
                        className="btn btn-outline-secondary disabled"
                        style={{ minWidth: '2.5rem' }}
                      >
                        {cantidad}
                      </span>
                      <button
                        className="btn btn-outline-primary"
                        onClick={() => cambiarCantidad(producto, 1)}
                        aria-label={`Añadir una unidad de ${producto.name}`}
                      >
                        <i className="fa-solid fa-plus" />
                      </button>
                    </div>
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
                  {item.qty} × {item.name}
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
