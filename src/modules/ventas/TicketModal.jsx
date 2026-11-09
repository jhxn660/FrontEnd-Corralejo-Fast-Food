import { useEffect } from 'react'

import Modal from '../../components/ui/Modal'
import { moneda } from '../../utils/format'
import { CONTACTO } from '../../data/local'
import { precioUnitario, urlQR } from './servicio'

/**
 * Ticket de una venta, en pantalla y en papel.
 *
 * QUÉ ESTABA MAL
 * - `window.print()` imprime el documento entero. Salía toda la aplicación
 *   —cabecera, menú lateral, tabla de ventas— y el ticket encajado arriba,
 *   porque no había ninguna hoja de estilos de impresión.
 * - Los botones "Cerrar" e "Imprimir" quedaban dentro del papel: formaban parte
 *   del mismo bloque que se imprimía.
 * - La estructura era una lista de definiciones y una tabla sueltas, sin la
 *   forma de un recibo: ni ancho de rollo, ni separadores, ni totales
 *   destacados.
 *
 * CÓMO SE ARREGLA
 * Mientras el modal está abierto se marca `body.imprimiendo-ticket`, y
 * theme.css usa esa marca para que al imprimir solo salga el cuerpo del modal,
 * centrado, a 76 mm y sin cabecera ni pie. La clase se quita al desmontar: si
 * se quedara puesta, cualquier impresión posterior saldría recortada.
 */
export default function TicketModal({ venta, onCerrar }) {
  useEffect(() => {
    document.body.classList.add('imprimiendo-ticket')
    return () => document.body.classList.remove('imprimiendo-ticket')
  }, [])

  const items = venta.items ?? []
  const unidades = items.reduce((suma, item) => suma + (Number(item.quantity) || 0), 0)
  const direccion = CONTACTO.find((dato) => dato.id === 'direccion')?.texto ?? ''
  const telefono = CONTACTO.find((dato) => dato.id === 'telefono')?.texto ?? ''

  return (
    <Modal
      titulo={`Ticket ${venta.ticketId}`}
      icono="fa-receipt"
      onClose={onCerrar}
      footer={
        <>
          <button className="btn btn-outline-secondary me-auto" onClick={onCerrar}>
            Cerrar
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <i className="fa-solid fa-print me-2" />
            Imprimir ticket
          </button>
        </>
      }
    >
      {/* Este bloque —y solo este— es lo que sale en el papel. */}
      <div className="ticket-impresion">
        <header className="text-center">
          <p className="ticket-marca mb-0">CORRALEJO FAST FOOD</p>
          <p className="mb-0" style={{ fontSize: '0.72rem' }}>
            {direccion}
          </p>
          <p className="mb-0" style={{ fontSize: '0.72rem' }}>
            Tel. {telefono}
          </p>
        </header>

        <hr className="ticket-separador" />

        <table>
          <tbody>
            <tr>
              <td>Ticket</td>
              <td className="text-end fw-bold">{venta.ticketId}</td>
            </tr>
            <tr>
              <td>Venta</td>
              <td className="text-end">{venta.saleId}</td>
            </tr>
            <tr>
              <td>Pedido</td>
              <td className="text-end">{venta.orderId}</td>
            </tr>
            <tr>
              <td>Fecha</td>
              <td className="text-end">
                {venta.date} {venta.time}
              </td>
            </tr>
            <tr>
              <td>Cliente</td>
              <td className="text-end">{venta.client}</td>
            </tr>
            <tr>
              <td>Atendió</td>
              <td className="text-end">{venta.employeeId}</td>
            </tr>
            <tr>
              <td>Entrega</td>
              <td className="text-end">{venta.deliveryAddress}</td>
            </tr>
          </tbody>
        </table>

        <hr className="ticket-separador" />

        <table>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td style={{ width: '12%' }}>{item.quantity}×</td>
                <td>
                  {item.product}
                  <br />
                  <span style={{ fontSize: '0.7rem' }}>
                    {moneda(precioUnitario(item))} c/u
                  </span>
                </td>
                <td className="text-end" style={{ width: '32%' }}>
                  {moneda(item.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr className="ticket-separador" />

        <table>
          <tbody>
            <tr>
              <td>Artículos</td>
              <td className="text-end">{unidades}</td>
            </tr>
            <tr className="ticket-total">
              <td>TOTAL</td>
              <td className="text-end">{moneda(venta.total)}</td>
            </tr>
          </tbody>
        </table>

        <div className="text-center mt-3">
          <img
            src={urlQR(venta, 110)}
            alt={`Código QR del ticket ${venta.ticketId}`}
            width="110"
            height="110"
          />
          <p className="mb-0" style={{ fontSize: '0.68rem' }}>
            {venta.qrCode}
          </p>
        </div>

        <hr className="ticket-separador" />

        <p className="text-center mb-0" style={{ fontSize: '0.72rem' }}>
          ¡Gracias por tu compra!
          <br />
          Conserva este ticket para cualquier reclamación.
        </p>
      </div>

      {/* Fuera del bloque imprimible: ayuda en pantalla, no va en el papel. */}
      <p className="no-imprimir text-secondary small text-center mt-3 mb-0">
        <i className="fa-solid fa-circle-info me-1" />
        Al imprimir solo sale el ticket, centrado en la hoja y sin estos botones.
      </p>
    </Modal>
  )
}
