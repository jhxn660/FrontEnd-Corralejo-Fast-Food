import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import { useRecurso } from '../../hooks/useRecurso'
import { moneda } from '../../utils/format'
import {
  cargarVentas,
  cumpleRango,
  guardarVentaEditada,
  minutosRestantes,
  precioUnitario,
  urlQR,
} from './servicio'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'
import { useAvisos } from '../../context/AvisosContext'
import { usePeticion } from '../../hooks/usePeticion'
import Paginacion from '../../components/ui/Paginacion'
import { menuApi, productosVendibles } from '../menu/api'
import TicketModal from './TicketModal'
import EditarVenta from './EditarVenta'

const POR_PAGINA = 15
const FILTROS_VACIOS = { fecha: '', cliente: '', rango: '' }

/**
 * Pantalla de Gestión de Ventas. Aquí solo vive el estado de la interfaz
 * (filtros, página, venta seleccionada, modales); cómo se cargan, sanean y
 * guardan las ventas está en ./servicio.js.
 */
export default function Ventas() {
  const { datos: ventas, cargando, error, setError, recargar } = useRecurso(cargarVentas, [])

  const avisos = useAvisos()
  // Pedidos llega aquí con la venta que acaba de generar en el estado de la
  // navegación (router), sin pasar por el almacenamiento del navegador.
  const { state: navegacion } = useLocation()
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  // Se guarda el id, no la venta: la venta se busca en cada render entre las
  // recién cargadas, así una modificación hecha desde otro rol o pestaña se ve
  // en el detalle sin volver a seleccionarla.
  const [seleccionadaId, setSeleccionadaId] = useState(() => navegacion?.ventaReciente ?? null)
  const [ahora, setAhora] = useState(() => Date.now())
  const [modalTicket, setModalTicket] = useState(false)
  const [editando, setEditando] = useState(false)
  const [pagina, setPagina] = useState(1)

  const seleccionada = ventas.find((venta) => venta.id === seleccionadaId) ?? null
  const minutos = seleccionada ? minutosRestantes(seleccionada, ahora) : 0

  const seleccionar = (venta) => {
    setSeleccionadaId(venta.id)
    setAhora(Date.now())
  }

  // Los productos que se pueden añadir al modificar una venta salen de la
  // carta del administrador, igual que en Pedidos.
  const { datos: catalogo } = useRecurso(
    useCallback(async () => {
      const { categorias } = await menuApi.listarCategorias({ soloDisponibles: true })
      return productosVendibles(categorias)
    }, []),
    []
  )

  // usePeticion añade a la escritura el estado `enviando` y el bloqueo del
  // doble clic; la escritura en sí (venta + su pedido) está en el servicio.
  const edicion = usePeticion(guardarVentaEditada)

  // Cuenta regresiva del plazo para modificar: los minutos se derivan del reloj,
  // no se descuentan a mano, así no se desfasan si la pestaña estuvo dormida.
  const haySeleccion = seleccionada !== null
  useEffect(() => {
    if (!haySeleccion) return undefined
    const intervalo = setInterval(() => setAhora(Date.now()), 15000)
    return () => clearInterval(intervalo)
  }, [haySeleccion])

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

  const filtrar = (campo) => (e) => {
    setFiltros({ ...filtros, [campo]: e.target.value })
    setPagina(1)
  }

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const visibles = filtradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

  const guardarEdicion = async (nueva) => {
    const { ok, error: fallo } = await edicion.ejecutar(nueva)
    if (!ok) {
      setError(fallo?.message ?? 'No se pudo modificar la venta.')
      avisos.fallo('No se pudo modificar la venta', fallo)
      return
    }
    setEditando(false)
    recargar()
    avisos.exito('Venta modificada', `${nueva.saleId} quedó en ${moneda(nueva.total)}.`)
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Gestión de Ventas"
        descripcion="Consulta las ventas del día, emite su ticket y corrígelas dentro del plazo."
      >
        <button className="btn btn-outline-secondary" onClick={recargar} disabled={cargando}>
          <i className="fa-solid fa-rotate me-2" />
          Actualizar
        </button>
      </EncabezadoPagina>

      <MensajeError texto={error} onReintentar={recargar} />

      <div className="row g-3">
        <div className="col-12 col-xxl-aureo-mayor">
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
                      {visibles.map((venta) => (
                        <tr
                          key={venta.id}
                          className={seleccionada?.id === venta.id ? 'table-active' : ''}
                          style={{ cursor: 'pointer' }}
                          onClick={() => seleccionar(venta)}
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

              <Paginacion
                pagina={paginaActual}
                totalPaginas={totalPaginas}
                onCambiar={setPagina}
                etiqueta="Páginas de ventas"
              />
            </div>
          </div>
        </div>

        <div className="col-12 col-xxl-aureo-menor">
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
                      ['Medio de pago', seleccionada.paymentMethod ?? 'Efectivo'],
                      ['Descuento', moneda(seleccionada.discount ?? 0)],
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

                  {seleccionada.notes && (
                    <p className="small mb-2">
                      <i className="fa-regular fa-note-sticky text-brand me-2" />
                      {seleccionada.notes}
                    </p>
                  )}

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
                        onClick={() => setEditando(true)}
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
        <TicketModal venta={seleccionada} onCerrar={() => setModalTicket(false)} />
      )}

      {editando && seleccionada && (
        <EditarVenta
          venta={seleccionada}
          catalogo={catalogo}
          minutos={minutos}
          enviando={edicion.enviando}
          onGuardar={guardarEdicion}
          onCerrar={() => setEditando(false)}
        />
      )}
    </>
  )
}
