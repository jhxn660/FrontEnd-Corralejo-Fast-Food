import { useState } from 'react'

import Modal from '../../components/ui/Modal'
import { moneda } from '../../utils/format'
import { precioUnitario } from './servicio'

const ID_FORMULARIO = 'formulario-venta'

export const ESTADOS_VENTA = ['Entregado', 'En Preparación', 'Cancelado']
export const MEDIOS_PAGO = ['Efectivo', 'Tarjeta', 'Nequi', 'Daviplata', 'Transferencia']

/**
 * Modificación real de una venta, dentro de la ventana de minutos permitida.
 *
 * Antes solo se podían cambiar el cliente, el estado y la dirección: si el
 * cliente pedía otra gaseosa o se había cobrado un plato de más, no había
 * forma de corregirlo sin borrar el pedido entero. Ahora se editan las líneas
 * —cantidades, quitar, añadir productos de la carta—, el medio de pago y un
 * descuento, y el total se recalcula con números enteros (R54).
 *
 * Los precios unitarios de las líneas que ya estaban se respetan: si la carta
 * subió de precio después de la venta, editar la cantidad no debe cobrar al
 * cliente el precio nuevo por lo que ya compró.
 */
export default function EditarVenta({ venta, catalogo, minutos, enviando, onGuardar, onCerrar }) {
  const [valores, setValores] = useState({
    client: venta.client ?? 'Consumidor Final',
    status: venta.status ?? 'Entregado',
    deliveryAddress: venta.deliveryAddress ?? 'Local / Mostrador',
    paymentMethod: venta.paymentMethod ?? 'Efectivo',
    discount: venta.discount ?? 0,
    notes: venta.notes ?? '',
  })
  const [lineas, setLineas] = useState(() =>
    (venta.items ?? []).map((item) => ({
      product: item.product,
      quantity: Number(item.quantity) || 1,
      unitPrice: precioUnitario(item),
    }))
  )
  const [nuevo, setNuevo] = useState('')
  const [error, setError] = useState(null)

  const cambiar = (campo) => (evento) => {
    setValores((previos) => ({ ...previos, [campo]: evento.target.value }))
    setError(null)
  }

  const subtotal = lineas.reduce((suma, linea) => suma + linea.unitPrice * linea.quantity, 0)
  const descuento = Math.max(0, Math.trunc(Number(valores.discount) || 0))
  const total = subtotal - descuento

  const productos = catalogo.flatMap((categoria) => categoria.productos)

  const cambiarCantidad = (posicion, delta) =>
    setLineas((previas) =>
      previas.map((linea, indice) =>
        indice === posicion
          ? { ...linea, quantity: Math.max(1, Math.min(99, linea.quantity + delta)) }
          : linea
      )
    )

  const quitar = (posicion) => setLineas((previas) => previas.filter((_, i) => i !== posicion))

  const añadir = () => {
    const producto = productos.find((p) => p.id === nuevo)
    if (!producto) return
    setLineas((previas) => {
      const existente = previas.findIndex((l) => l.product === producto.nombre)
      if (existente >= 0) {
        return previas.map((l, i) => (i === existente ? { ...l, quantity: l.quantity + 1 } : l))
      }
      return [...previas, { product: producto.nombre, quantity: 1, unitPrice: producto.precio }]
    })
    setNuevo('')
    setError(null)
  }

  const enviar = (evento) => {
    evento.preventDefault()
    if (lineas.length === 0) {
      setError('La venta necesita al menos un producto. Para anularla, cambia el estado a Cancelado.')
      return
    }
    if (!valores.client.trim()) {
      setError('Indica el nombre del cliente o deja "Consumidor Final".')
      return
    }
    if (descuento > subtotal) {
      setError('El descuento no puede ser mayor que el subtotal.')
      return
    }

    onGuardar({
      ...venta,
      ...valores,
      client: valores.client.trim(),
      notes: valores.notes.trim(),
      discount: descuento,
      items: lineas.map((linea, indice) => ({
        id: indice + 1,
        product: linea.product,
        quantity: linea.quantity,
        unitPrice: linea.unitPrice,
        price: linea.unitPrice * linea.quantity,
      })),
      subtotal,
      total,
      updatedAt: new Date().toISOString(),
    })
  }

  return (
    <Modal
      titulo={`Modificar venta ${venta.saleId}`}
      icono="fa-pen-to-square"
      descripcion={`Quedan ${minutos} minuto(s) para modificarla. Si la venta viene de un pedido, sus productos también se actualizan allí.`}
      tamano="modal-xl"
      cerrarAlPulsarFuera={false}
      onClose={onCerrar}
      footer={
        <>
          <span className="me-auto small">
            Total anterior {moneda(venta.total)} → nuevo{' '}
            <strong className="text-brand">{moneda(total)}</strong>
          </span>
          <button className="btn btn-outline-secondary" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </button>
          <button className="btn btn-primary" form={ID_FORMULARIO} type="submit" disabled={enviando}>
            {enviando ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Guardando…
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk me-2" />
                Guardar cambios
              </>
            )}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={enviar} noValidate className="row g-4">
        <div className="col-12 col-lg-7">
          <h3 className="h6 fw-bold text-uppercase text-secondary">Productos</h3>

          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="text-center">Cant.</th>
                  <th className="text-end">Und.</th>
                  <th className="text-end">Subtotal</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lineas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-secondary py-3">
                      Sin productos.
                    </td>
                  </tr>
                )}
                {lineas.map((linea, posicion) => (
                  <tr key={`${linea.product}-${posicion}`}>
                    <td className="fw-semibold">{linea.product}</td>
                    <td className="text-center">
                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => cambiarCantidad(posicion, -1)}
                          disabled={linea.quantity <= 1 || enviando}
                          aria-label={`Quitar una unidad de ${linea.product}`}
                        >
                          <i className="fa-solid fa-minus" />
                        </button>
                        <span className="btn btn-outline-secondary disabled" style={{ minWidth: '2.5rem' }}>
                          {linea.quantity}
                        </span>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => cambiarCantidad(posicion, 1)}
                          disabled={enviando}
                          aria-label={`Añadir una unidad de ${linea.product}`}
                        >
                          <i className="fa-solid fa-plus" />
                        </button>
                      </div>
                    </td>
                    <td className="text-end">{moneda(linea.unitPrice)}</td>
                    <td className="text-end fw-semibold">{moneda(linea.unitPrice * linea.quantity)}</td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => quitar(posicion)}
                        disabled={enviando}
                        aria-label={`Quitar ${linea.product}`}
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label className="form-label" htmlFor="venta-nuevo">
            Añadir producto de la carta
          </label>
          <div className="input-group">
            <select
              id="venta-nuevo"
              className="form-select"
              value={nuevo}
              onChange={(evento) => setNuevo(evento.target.value)}
              disabled={enviando}
            >
              <option value="">Elige un producto…</option>
              {catalogo.map((categoria) => (
                <optgroup label={categoria.nombre} key={categoria.id}>
                  {categoria.productos.map((producto) => (
                    <option value={producto.id} key={producto.id}>
                      {producto.nombre} — {moneda(producto.precio)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary"
              onClick={añadir}
              disabled={!nuevo || enviando}
            >
              <i className="fa-solid fa-plus me-2" />
              Añadir
            </button>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <h3 className="h6 fw-bold text-uppercase text-secondary">Datos de la venta</h3>

          <fieldset className="d-grid gap-3" disabled={enviando}>
            <div>
              <label className="form-label" htmlFor="venta-cliente">
                Cliente
              </label>
              <input
                id="venta-cliente"
                className="form-control"
                value={valores.client}
                onChange={cambiar('client')}
                maxLength={60}
              />
            </div>

            <div className="row g-2">
              <div className="col-6">
                <label className="form-label" htmlFor="venta-pago">
                  Medio de pago
                </label>
                <select
                  id="venta-pago"
                  className="form-select"
                  value={valores.paymentMethod}
                  onChange={cambiar('paymentMethod')}
                >
                  {MEDIOS_PAGO.map((medio) => (
                    <option key={medio}>{medio}</option>
                  ))}
                </select>
              </div>
              <div className="col-6">
                <label className="form-label" htmlFor="venta-estado">
                  Estado
                </label>
                <select
                  id="venta-estado"
                  className="form-select"
                  value={valores.status}
                  onChange={cambiar('status')}
                >
                  {ESTADOS_VENTA.map((estado) => (
                    <option key={estado}>{estado}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="venta-direccion">
                Entrega
              </label>
              <input
                id="venta-direccion"
                className="form-control"
                value={valores.deliveryAddress}
                onChange={cambiar('deliveryAddress')}
                placeholder="Local / Mostrador o dirección del domicilio"
              />
            </div>

            <div>
              <label className="form-label" htmlFor="venta-descuento">
                Descuento (COP)
              </label>
              <input
                id="venta-descuento"
                type="number"
                min="0"
                step="100"
                className="form-control"
                value={valores.discount}
                onChange={cambiar('discount')}
              />
            </div>

            <div>
              <label className="form-label" htmlFor="venta-notas">
                Observaciones
              </label>
              <textarea
                id="venta-notas"
                className="form-control"
                rows="2"
                maxLength={200}
                value={valores.notes}
                onChange={cambiar('notes')}
                placeholder="Motivo del cambio, petición del cliente…"
              />
            </div>
          </fieldset>

          <div className="modal-resumen mt-3 small">
            <div className="d-flex justify-content-between">
              <span>Subtotal</span>
              <span>{moneda(subtotal)}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span>Descuento</span>
              <span>− {moneda(descuento)}</span>
            </div>
            <div className="d-flex justify-content-between fw-bold fs-6 border-top mt-1 pt-1">
              <span>Total</span>
              <span className="text-brand">{moneda(total)}</span>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger mt-3 mb-0 py-2" role="alert">
              {error}
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}
