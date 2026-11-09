import { useState } from 'react'

import { moneda } from '../../utils/format'
import Modal from '../../components/ui/Modal'

const ICONOS = {
  perros: '🌭',
  salchipapas: '🍟',
  hamburguesas: '🍔',
  bebidas: '🥤',
  acompañamientos: '🍿',
  combos: '⭐',
}

const titulo = (clave) => clave.charAt(0).toUpperCase() + clave.slice(1)

/**
 * Selector de productos del catálogo. Una entrada con isCategory abre su
 * subcategoría (subKey) y deja rastro para poder volver.
 */
export default function CatalogoModal({ catalogo, onAgregar, onCerrar }) {
  const categorias = Object.keys(catalogo)
  const [pestana, setPestana] = useState(categorias[0])
  const [historial, setHistorial] = useState([])
  const [seleccion, setSeleccion] = useState({}) // { [id]: { name, price, qty } }

  const cambiarCantidad = (id, name, price, delta) =>
    setSeleccion((previo) => {
      const qty = Math.max(0, (previo[id]?.qty ?? 0) + delta)
      const copia = { ...previo }
      if (qty === 0) delete copia[id]
      else copia[id] = { name, price, qty }
      return copia
    })

  const elegidos = Object.values(seleccion)
  const total = elegidos.reduce((suma, item) => suma + item.price * item.qty, 0)

  return (
    <Modal
      titulo="Agregar producto al pedido"
      icono="fa-cart-plus"
      tamano="modal-lg"
      onClose={onCerrar}
      footer={
        <div className="d-flex flex-wrap justify-content-between align-items-center w-100 gap-2">
          <span className="small">
            Subtotal a agregar: <strong>{moneda(total)}</strong>
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
              Agregar al pedido
            </button>
          </span>
        </div>
      }
    >
      <ul className="nav nav-pills flex-wrap gap-1 mb-3">
        {categorias.map((clave) => (
          <li className="nav-item" key={clave}>
            <button
              className={`nav-link ${pestana === clave ? 'active' : ''}`}
              onClick={() => {
                setPestana(clave)
                setHistorial([])
              }}
            >
              <span className="me-1">{ICONOS[clave] ?? '🏷️'}</span>
              {titulo(clave)}
            </button>
          </li>
        ))}
      </ul>

      {historial.length > 0 && (
        <button
          className="btn btn-sm btn-outline-secondary mb-3"
          onClick={() => {
            const copia = [...historial]
            setPestana(copia.pop())
            setHistorial(copia)
          }}
        >
          <i className="fa-solid fa-arrow-left me-2" />
          Volver
        </button>
      )}

      <div className="row g-2">
        {(catalogo[pestana] ?? []).map((producto) => {
          const id = producto.id ?? producto.name
          const qty = seleccion[id]?.qty ?? 0

          return (
            <div className="col-12 col-md-6" key={id}>
              <div className={`card h-100 ${qty > 0 ? 'border-primary' : ''}`}>
                <div className="card-body d-flex gap-3 align-items-center">
                  <span className="fs-3">{producto.emoji}</span>
                  <div className="flex-grow-1 min-width-0">
                    <p className="fw-semibold mb-0">{producto.name}</p>
                    <small className="text-secondary">{producto.desc}</small>
                  </div>

                  {producto.isCategory ? (
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => {
                        setHistorial([...historial, pestana])
                        setPestana(producto.subKey)
                      }}
                    >
                      Ver
                    </button>
                  ) : (
                    <div className="text-end">
                      <div className="fw-semibold mb-1">{moneda(producto.price)}</div>
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => cambiarCantidad(id, producto.name, producto.price, -1)}
                        >
                          −
                        </button>
                        <span className="btn btn-outline-secondary disabled">{qty}</span>
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => cambiarCantidad(id, producto.name, producto.price, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
