import { useState } from 'react'

import { moneda } from '../../utils/format'
import Modal from '../../components/ui/Modal'

import { precioUnitario } from './servicio'

const ID_FORMULARIO = 'formulario-venta'

/**
 * Corrección de una venta registrada (administración), dentro de la ventana de minutos.
 *
 * QUÉ SE PUEDE CAMBIAR: lo mismo que acepta el backend (PATCH /sales/:id): el cliente y la
 * dirección de entrega. Los productos, el total y el estado de una venta registrada NO se
 * editan aquí: son el registro de lo que se cobró y de los insumos que se descontaron.
 *
 * PARA CAMBIAR PRODUCTOS: en Gestión de Pedidos se reabre el pedido de esta venta. Reabrirlo
 * elimina la venta y devuelve sus insumos al inventario; luego se corrigen los productos
 * (se pueden quitar, añadir y cambiar cantidades) y se factura otra vez.
 */
export default function EditarVenta({ venta, minutos, enviando, onGuardar, onCerrar }) {
  const [valores, setValores] = useState({
    client: venta.client ?? 'Consumidor Final',
    deliveryAddress: venta.deliveryAddress ?? 'Local',
  })
  const [error, setError] = useState(null)

  const cambiar = (campo) => (evento) => {
    setValores((previos) => ({ ...previos, [campo]: evento.target.value }))
    setError(null)
  }

  const enviar = (evento) => {
    evento.preventDefault()
    if (!valores.client.trim()) {
      setError('Indica el nombre del cliente o deja "Consumidor Final".')
      return
    }
    onGuardar({
      ...venta,
      client: valores.client.trim(),
      deliveryAddress: valores.deliveryAddress.trim() || 'Local',
    })
  }

  return (
    <Modal
      titulo={`Modificar venta ${venta.saleId}`}
      icono="fa-pen-to-square"
      descripcion={`Quedan ${minutos} minuto(s) para modificarla.`}
      tamano="modal-lg"
      cerrarAlPulsarFuera={false}
      onClose={onCerrar}
      footer={
        <>
          <button className="btn btn-outline-secondary" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </button>
          <button className="btn btn-primary" form={ID_FORMULARIO} type="submit" disabled={enviando}>
            <i className="fa-solid fa-floppy-disk me-2" />
            {enviando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} className="row g-3" onSubmit={enviar} noValidate>
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="venta-cliente">
            Cliente
          </label>
          <input
            id="venta-cliente"
            className="form-control"
            value={valores.client}
            onChange={cambiar('client')}
            disabled={enviando}
          />
        </div>

        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="venta-direccion">
            Dirección de entrega
          </label>
          <input
            id="venta-direccion"
            className="form-control"
            placeholder="Local"
            value={valores.deliveryAddress}
            onChange={cambiar('deliveryAddress')}
            disabled={enviando}
          />
        </div>

        {error && (
          <div className="col-12">
            <div className="alert alert-danger py-2 small mb-0" role="alert">
              {error}
            </div>
          </div>
        )}

        <div className="col-12">
          <span className="form-label d-block">Productos de la venta</span>
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-2">
              <tbody>
                {(venta.items ?? []).map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.quantity}× {item.product}
                    </td>
                    <td className="text-end text-secondary small">{moneda(precioUnitario(item))} c/u</td>
                    <td className="text-end fw-semibold">{moneda(item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-uppercase small fw-semibold">Total cobrado</span>
            <strong className="text-brand">{moneda(venta.total)}</strong>
          </div>
          <div className="alert alert-info small mt-3 mb-0">
            <i className="fa-solid fa-circle-info me-2" />
            Para cambiar productos: en <strong>Gestión de Pedidos</strong> reabre el pedido{' '}
            {venta.orderId || 'de esta venta'}. Se elimina esta venta y sus insumos vuelven al
            inventario; corrige los productos y factura de nuevo.
          </div>
        </div>
      </form>
    </Modal>
  )
}
