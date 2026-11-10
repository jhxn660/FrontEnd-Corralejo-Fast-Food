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
    // Una lista de pedidos VACÍA casi nunca significa que todas las ventas
    // sean huérfanas: suele ser una base reiniciada o una respuesta a medias.
    // Sin esta guarda, abrir la pantalla borraba todas las ventas de golpe.
    const huerfanas =
      pedidos.length === 0
        ? []
        : ventas.filter((s) => s.pedidoId != null && !idsPedidos.has(String(s.pedidoId)))
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

  // De la más reciente a la más antigua por fecha real, no por número: el
  // número no garantiza el orden cuando hay ventas de otro periodo.
  const momento = (venta) => Date.parse(venta.createdAt ?? venta.date) || 0
  return conQR.sort(
    (a, b) => momento(b) - momento(a) || numeroDeCodigo(b.saleId) - numeroDeCodigo(a.saleId)
  )
}

export default function Ventas() {
  const { datos: ventas, cargando, error, setError, recargar } = useRecurso(
    useCallback(cargarVentas, []),
    []
  )

  const avisos = useAvisos()
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [seleccionada, setSeleccionada] = useState(null)
  const [minutos, setMinutos] = useState(MINUTOS_MODIFICACION)
  const [modalTicket, setModalTicket] = useState(false)
  const [editando, setEditando] = useState(false)
  const [pagina, setPagina] = useState(1)

  // Los productos que se pueden añadir al modificar una venta salen de la
  // carta del administrador, igual que en Pedidos.
  const { datos: catalogo } = useRecurso(
    useCallback(async () => {
      const { categorias } = await menuApi.listarCategorias({ soloDisponibles: true })
      return productosVendibles(categorias)
    }, []),
    []
  )

  /**
   * Guarda la venta y, si viene de un pedido, deja el pedido con las mismas
   * líneas: la gráfica de Pedidos y los indicadores no deben contar cosas
   * distintas.
   */
  const edicion = usePeticion(
    useCallback(async (venta) => {
      const actualizada = await api.update('sales', venta.id, venta)
      if (venta.pedidoId) {
        try {
          const pedido = await api.get('pedidos', venta.pedidoId)
          await api.update('pedidos', pedido.id, {
            ...pedido,
            items: venta.items.map((item) => ({
              name: item.product,
              price: item.unitPrice,
              qty: item.quantity,
            })),
          })
        } catch {
          // El pedido pudo borrarse; la venta ya quedó guardada.
        }
      }
      return actualizada
    }, [])
  )

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

  const filtrar = (campo) => (e) => {
    setFiltros({ ...filtros, [campo]: e.target.value })
    setPagina(1)
  }

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const visibles = filtradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

  const guardarEdicion = async (nueva) => {
    const { ok, datos, error: fallo } = await edicion.ejecutar(nueva)
    if (!ok) {
      setError(fallo?.message ?? 'No se pudo modificar la venta.')
      avisos.fallo('No se pudo modificar la venta', fallo)
      return
    }
    setSeleccionada(datos)
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
                      {visibles.map((venta) => (
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

              <Paginacion
                pagina={paginaActual}
                totalPaginas={totalPaginas}
                onCambiar={setPagina}
                etiqueta="Páginas de ventas"
              />
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
