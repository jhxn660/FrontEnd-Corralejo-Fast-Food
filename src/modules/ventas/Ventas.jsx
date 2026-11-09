import { useCallback, useEffect, useMemo, useState } from 'react'

import { api } from '../../services/api'
import { useRecurso } from '../../hooks/useRecurso'
import { moneda } from '../../utils/format'
import {
  CLAVE_VENTA_RECIENTE,
  MINUTOS_MODIFICACION,
  generarCodigoQR,
  minutosRestantes,
  numeroDeCodigo,
  precioUnitario,
  urlQR,
} from './servicio'
import Modal from '../../components/ui/Modal'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, Error, Vacio } from '../../components/ui/Estado'

const ESTADOS_VENTA = ['Entregado', 'En Preparación', 'Cancelado']
const FILTROS_VACIOS = { fecha: '', cliente: '', rango: '' }

/** Compara el total contra un filtro tipo ">20000", "<5000" o "20000". */
const cumpleRango = (total, rango) => {
  const limpio = rango.replace(/[^\d><]/g, '')
  if (!limpio) return true

  const valor = parseFloat(limpio.replace(/[><]/, ''))
  if (Number.isNaN(valor)) return true

  if (limpio.startsWith('>')) return total > valor
  if (limpio.startsWith('<')) return total < valor
  return total >= valor
}

/**
 * Las ventas dependen de los pedidos: si el pedido ya no existe, la venta es
 * huérfana y se borra. Las ventas antiguas sin qrCode reciben uno y se guarda.
 */
async function cargarVentas() {
  const ventas = await api.list('sales')

  let vigentes = ventas
  try {
    const pedidos = await api.list('pedidos')
    const idsPedidos = new Set(pedidos.map((p) => String(p.id)))
    const huerfanas = ventas.filter(
      (s) => s.pedidoId != null && !idsPedidos.has(String(s.pedidoId))
    )
    await Promise.all(huerfanas.map((s) => api.remove('sales', s.id).catch(() => null)))
    const idsHuerfanas = new Set(huerfanas.map((s) => s.id))
    vigentes = ventas.filter((s) => !idsHuerfanas.has(s.id))
  } catch {
    // Si /pedidos no responde se muestran todas las ventas sin tocar nada.
  }

  const usados = new Set(vigentes.map((s) => s.qrCode).filter(Boolean))
  const conQR = await Promise.all(
    vigentes.map(async (venta) => {
      if (venta.qrCode) return venta
      const qrCode = generarCodigoQR(numeroDeCodigo(venta.saleId), usados)
      usados.add(qrCode)
      return api.patch('sales', venta.id, { qrCode }).catch(() => ({ ...venta, qrCode }))
    })
  )

  return conQR.sort((a, b) => numeroDeCodigo(b.saleId) - numeroDeCodigo(a.saleId))
}

export default function Ventas() {
  const { datos: ventas, cargando, error, setError, recargar } = useRecurso(
    useCallback(cargarVentas, []),
    []
  )

  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [seleccionada, setSeleccionada] = useState(null)
  const [minutos, setMinutos] = useState(MINUTOS_MODIFICACION)
  const [modalTicket, setModalTicket] = useState(false)
  const [formEdicion, setFormEdicion] = useState(null)

  // Al volver de finalizar un pedido, se abre directamente la venta recién creada.
  useEffect(() => {
    const reciente = sessionStorage.getItem(CLAVE_VENTA_RECIENTE)
    if (!reciente || ventas.length === 0) return
    sessionStorage.removeItem(CLAVE_VENTA_RECIENTE)
    const venta = ventas.find((s) => String(s.id) === reciente)
    if (venta) setSeleccionada(venta)
  }, [ventas])

  // Cuenta regresiva para poder modificar la venta seleccionada.
  useEffect(() => {
    if (!seleccionada) return
    setMinutos(minutosRestantes(seleccionada))
    const intervalo = setInterval(() => setMinutos((m) => Math.max(0, m - 1)), 60000)
    return () => clearInterval(intervalo)
  }, [seleccionada])

  const filtradas = useMemo(
    () =>
      ventas.filter((venta) => {
        const texto = filtros.cliente.toLowerCase()
        const coincideCliente =
          !texto ||
          String(venta.client ?? '').toLowerCase().includes(texto) ||
          String(venta.saleId ?? '').toLowerCase().includes(texto)

        return (
          (!filtros.fecha || venta.date === filtros.fecha) &&
          coincideCliente &&
          cumpleRango(venta.total, filtros.rango)
        )
      }),
    [ventas, filtros]
  )

  const filtrar = (campo) => (e) => setFiltros({ ...filtros, [campo]: e.target.value })

  const guardarEdicion = async (e) => {
    e.preventDefault()
    try {
      const actualizada = await api.update('sales', seleccionada.id, {
        ...seleccionada,
        ...formEdicion,
      })
      setSeleccionada(actualizada)
      setFormEdicion(null)
      recargar()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <EncabezadoPagina titulo="Panel de Operaciones · Ventas" />
      <Error texto={error} onReintentar={recargar} />

      <div className="row g-3">
        <div className="col-12 col-xxl-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white">
              <h2 className="h6 fw-bold mb-0">Ventas registradas</h2>
            </div>
            <div className="card-body">
              <div className="row g-2 mb-3">
                <div className="col-12 col-sm-4">
                  <label className="form-label small">Fecha</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={filtros.fecha}
                    onChange={filtrar('fecha')}
                  />
                </div>
                <div className="col-12 col-sm-4">
                  <label className="form-label small">Cliente / ID</label>
                  <input
                    className="form-control form-control-sm"
                    placeholder="Buscar…"
                    value={filtros.cliente}
                    onChange={filtrar('cliente')}
                  />
                </div>
                <div className="col-12 col-sm-4">
                  <label className="form-label small">Rango de valor</label>
                  <input
                    className="form-control form-control-sm"
                    placeholder="Ej. &gt;20000"
                    value={filtros.rango}
                    onChange={filtrar('rango')}
                  />
                </div>
              </div>

              {cargando && <Cargando texto="Cargando ventas…" />}
              {!cargando && filtradas.length === 0 && (
                <Vacio texto="No se encontraron ventas." icono="fa-receipt" />
              )}

              {!cargando && filtradas.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-sm table-hover align-middle mb-0">
                    <thead>
                      <tr className="small text-secondary">
                        <th>ID</th>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Total</th>
                        <th>Ticket</th>
                        <th>Empleado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtradas.map((venta) => (
                        <tr
                          key={venta.id}
                          className={seleccionada?.id === venta.id ? 'table-active' : ''}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSeleccionada(venta)}
                        >
                          <td className="fw-semibold">{venta.saleId}</td>
                          <td>
                            {venta.dateFormatted} {venta.time}
                          </td>
                          <td>{venta.client}</td>
                          <td>{moneda(venta.total)}</td>
                          <td>{venta.ticketId}</td>
                          <td>{venta.employeeId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-xxl-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white">
              <h2 className="h6 fw-bold mb-0">Detalle del pedido facturado</h2>
            </div>
            <div className="card-body">
              {!seleccionada ? (
                <Vacio
                  texto="Selecciona una venta de la tabla para ver su detalle."
                  icono="fa-file-invoice-dollar"
                />
              ) : (
                <>
                  <dl className="row small mb-3">
                    {[
                      ['ID venta', seleccionada.saleId],
                      ['Pedido asociado', seleccionada.orderId],
                      ['ID ticket', seleccionada.ticketId],
                      ['Estado', seleccionada.status],
                      ['Dirección de entrega', seleccionada.deliveryAddress],
                      ['Empleado responsable', seleccionada.employeeId],
                    ].map(([etiqueta, valor]) => (
                      <div className="col-6 mb-2" key={etiqueta}>
                        <dt className="text-secondary fw-normal">{etiqueta}</dt>
                        <dd className="fw-semibold mb-0">{valor}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="table-responsive mb-3">
                    <table className="table table-sm mb-0">
                      <thead>
                        <tr className="small text-secondary">
                          <th>Producto</th>
                          <th>Cant.</th>
                          <th>Precio und.</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(seleccionada.items ?? []).map((item) => (
                          <tr key={item.id}>
                            <td>{item.product}</td>
                            <td>{item.quantity}</td>
                            <td>{moneda(precioUnitario(item))}</td>
                            <td>{moneda(item.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-end fw-bold mb-3">
                    Total pagado: <span className="text-brand">{moneda(seleccionada.total)}</span>
                  </p>

                  <div className="d-flex flex-wrap justify-content-between align-items-end gap-3">
                    <div className="text-center">
                      <img
                        key={seleccionada.qrCode}
                        src={urlQR(seleccionada, 80)}
                        alt={`QR de la venta ${seleccionada.saleId}`}
                        className="rounded"
                      />
                      <div className="small fw-semibold">{seleccionada.ticketId}</div>
                      <code className="small text-secondary">{seleccionada.qrCode}</code>
                    </div>

                    <div className="d-flex flex-column gap-2">
                      <button className="btn btn-primary" onClick={() => setModalTicket(true)}>
                        <i className="fa-solid fa-print me-2" />
                        Emitir ticket
                      </button>
                      <button
                        className="btn btn-outline-primary"
                        disabled={minutos === 0}
                        onClick={() =>
                          setFormEdicion({
                            client: seleccionada.client,
                            status: seleccionada.status,
                            deliveryAddress: seleccionada.deliveryAddress,
                          })
                        }
                      >
                        <i className="fa-solid fa-pen me-2" />
                        Modificar venta
                      </button>
                      <small className={minutos === 0 ? 'text-danger' : 'text-secondary'}>
                        <i className="fa-regular fa-clock me-1" />
                        {minutos === 0 ? 'Plazo vencido' : `Restan ${minutos} min`}
                      </small>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {modalTicket && seleccionada && (
        <Modal
          titulo={`Ticket ${seleccionada.ticketId}`}
          icono="fa-receipt"
          onClose={() => setModalTicket(false)}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={() => setModalTicket(false)}>
                Cerrar
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <i className="fa-solid fa-print me-2" />
                Imprimir
              </button>
            </>
          }
        >
          <div className="text-center mb-3">
            <strong>Corralejo Fast Food</strong>
          </div>

          <dl className="row small">
            {[
              ['Cliente', seleccionada.client],
              ['Fecha', `${seleccionada.date} ${seleccionada.time}`],
              ['Pedido', seleccionada.orderId],
              ['Atendido por', seleccionada.employeeId],
            ].map(([etiqueta, valor]) => (
              <div className="col-6 mb-1" key={etiqueta}>
                <dt className="text-secondary fw-normal d-inline">{etiqueta}: </dt>
                <dd className="d-inline fw-semibold">{valor}</dd>
              </div>
            ))}
          </dl>

          <table className="table table-sm small">
            <tbody>
              {(seleccionada.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td>{item.quantity}×</td>
                  <td>{item.product}</td>
                  <td className="text-end">{moneda(item.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-end fw-bold">Total: {moneda(seleccionada.total)}</p>

          <div className="text-center">
            <img src={urlQR(seleccionada, 100)} alt={`QR del ticket ${seleccionada.ticketId}`} />
            <div>
              <code className="small text-secondary">{seleccionada.qrCode}</code>
            </div>
          </div>
        </Modal>
      )}

      {formEdicion && (
        <Modal
          titulo={`Modificar venta ${seleccionada.saleId}`}
          icono="fa-pen"
          onClose={() => setFormEdicion(null)}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={() => setFormEdicion(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" form="form-venta" type="submit">
                Guardar cambios
              </button>
            </>
          }
        >
          <form id="form-venta" onSubmit={guardarEdicion} className="d-grid gap-3">
            <div>
              <label className="form-label">Cliente</label>
              <input
                className="form-control"
                value={formEdicion.client}
                onChange={(e) => setFormEdicion({ ...formEdicion, client: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">Estado del pedido</label>
              <select
                className="form-select"
                value={formEdicion.status}
                onChange={(e) => setFormEdicion({ ...formEdicion, status: e.target.value })}
              >
                {ESTADOS_VENTA.map((estado) => (
                  <option key={estado}>{estado}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Dirección de entrega</label>
              <input
                className="form-control"
                value={formEdicion.deliveryAddress}
                onChange={(e) =>
                  setFormEdicion({ ...formEdicion, deliveryAddress: e.target.value })
                }
                required
              />
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
