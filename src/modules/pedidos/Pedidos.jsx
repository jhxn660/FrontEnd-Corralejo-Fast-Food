import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api } from '../../services/api'
import { useRecurso } from '../../hooks/useRecurso'
import { fechaISO, hora12, moneda } from '../../utils/format'
import { construirVenta, eliminarVentasDePedido } from '../ventas/servicio'
import { CLAVE_VENTA_RECIENTE } from '../ventas/servicio'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, Error, Vacio } from '../../components/ui/Estado'
import Toast from '../../components/ui/Toast'
import { CATEGORIAS, COLOR_SIN_CATEGORIA } from '../../data/graficas'
import CatalogoModal from './CatalogoModal'
import ConfirmarAccion from './ConfirmarAccion'

const DURACION_TOAST = 5000

const ESTADOS = {
  pendiente: { etiqueta: 'Pendiente', color: 'warning' },
  preparacion: { etiqueta: 'En preparación', color: 'info' },
  resuelto: { etiqueta: 'Resuelto', color: 'success' },
}

// "categoria" era un duplicado de Perros Calientes: se ignora en el catálogo.
const CLAVES_OCULTAS = ['categoria']

const numeroDe = (pedido) => pedido?.numero ?? pedido?.id

const normalizarCatalogo = (data) =>
  Object.fromEntries(
    Object.entries(data ?? {}).filter(
      ([clave, valor]) => Array.isArray(valor) && !CLAVES_OCULTAS.includes(clave)
    )
  )

/** Reparte el total de unidades vendidas por categoría para el gráfico de torta. */
function calcularVentasPorCategoria(pedidos, catalogo) {
  const categoriaDe = {}
  Object.entries(CATEGORIAS).forEach(([clave, { titulo }]) => {
    ;(catalogo[clave] ?? []).forEach((producto) => {
      categoriaDe[producto.name] = titulo
    })
  })

  const totales = {}
  pedidos
    .filter((pedido) => pedido.estado === 'resuelto')
    .forEach((pedido) =>
      (pedido.items ?? []).forEach((item) => {
        const nombre = categoriaDe[item.name] ?? 'Otros'
        totales[nombre] = (totales[nombre] ?? 0) + item.qty
      })
    )

  const total = Object.values(totales).reduce((suma, valor) => suma + valor, 0)
  if (total === 0) return { total: 0, tramos: [] }

  const colores = Object.fromEntries(
    Object.values(CATEGORIAS).map(({ titulo, color }) => [titulo, color])
  )
  let acumulado = 0

  const tramos = Object.entries(totales).map(([nombre, cantidad]) => {
    const inicio = acumulado
    acumulado += (cantidad / total) * 100
    return {
      nombre,
      color: colores[nombre] ?? COLOR_SIN_CATEGORIA,
      porcentaje: (cantidad / total) * 100,
      desde: inicio,
      hasta: acumulado,
    }
  })

  return { total, tramos }
}

export default function Pedidos() {
  const navigate = useNavigate()

  const cargar = useCallback(async () => {
    const [pedidos, catalogo] = await Promise.all([api.list('pedidos'), api.list('catalogo')])
    return {
      pedidos: [...pedidos].sort((a, b) => Number(numeroDe(b)) - Number(numeroDe(a))),
      catalogo: normalizarCatalogo(catalogo),
    }
  }, [])

  const { datos, cargando, error, setError, recargar } = useRecurso(cargar, {
    pedidos: [],
    catalogo: {},
  })

  const { pedidos, catalogo } = datos
  const [activoId, setActivoId] = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [catalogoAbierto, setCatalogoAbierto] = useState(false)
  const [confirmacion, setConfirmacion] = useState(null)
  const [toast, setToast] = useState(null)
  const temporizador = useRef(null)

  const activo = pedidos.find((p) => p.id === activoId) ?? pedidos[0]
  const resuelto = activo?.estado === 'resuelto'
  const total = (activo?.items ?? []).reduce((suma, item) => suma + item.price * item.qty, 0)
  const grafica = calcularVentasPorCategoria(pedidos, catalogo)

  useEffect(() => () => clearTimeout(temporizador.current), [])

  const avisar = (tipo, titulo, mensaje) => {
    clearTimeout(temporizador.current)
    setToast({ tipo, titulo, mensaje })
    temporizador.current = setTimeout(() => setToast(null), DURACION_TOAST)
  }

  const conError = (accion) => async (...args) => {
    setError('')
    setProcesando(true)
    try {
      await accion(...args)
    } catch (err) {
      setError(err.message)
    } finally {
      setProcesando(false)
    }
  }

  const guardarItems = conError(async (items) => {
    await api.update('pedidos', activo.id, { ...activo, items })
    recargar()
  })

  const crearPedido = conError(async () => {
    const ahora = new Date()
    const numeros = pedidos.map(numeroDe).filter((n) => /^\d+$/.test(String(n))).map(Number)
    const numero = numeros.length > 0 ? Math.max(...numeros) + 1 : 1

    const creado = await api.create('pedidos', {
      numero,
      estado: 'pendiente',
      fecha: fechaISO(ahora),
      hora: hora12(ahora),
      items: [],
    })

    setActivoId(creado.id)
    recargar()
    avisar('success', 'Pedido creado', `El pedido #${numero} está listo para recibir productos.`)
  })

  const eliminarPedido = conError(async (pedido) => {
    const numero = numeroDe(pedido)
    // Primero la venta: si falla, el pedido no se borra y nada queda inconsistente.
    await eliminarVentasDePedido(pedido, numero)
    await api.remove('pedidos', pedido.id).catch(() => null)

    setActivoId(null)
    recargar()
    avisar(
      'danger',
      pedido.estado === 'resuelto' ? 'Pedido eliminado' : 'Pedido cancelado',
      `El pedido #${numero} fue retirado de la lista.`
    )
  })

  /** Marca el pedido como resuelto, genera su venta y lleva a Gestión de Ventas. */
  const finalizarPedido = conError(async (pedido) => {
    if (!pedido?.items?.length) {
      setError('Agrega al menos un producto antes de finalizar el pedido.')
      return
    }

    const ventas = await api.list('sales')
    const numero = numeroDe(pedido)

    // Si el pedido ya tenía venta no se duplica: se reutiliza la existente.
    let venta = ventas.find((s) => s.pedidoId === pedido.id || s.orderId === `#P-${numero}`)
    if (!venta) venta = await api.create('sales', construirVenta(pedido, ventas, numero))

    await api.update('pedidos', pedido.id, { ...pedido, estado: 'resuelto' })
    sessionStorage.setItem(CLAVE_VENTA_RECIENTE, String(venta.id))
    navigate('/empleado/ventas')
  })

  const cambiarEstado = (nuevoEstado) => {
    if (nuevoEstado === 'resuelto') return finalizarPedido(activo)

    const aplicar = conError(async (borrarVenta) => {
      if (borrarVenta) await eliminarVentasDePedido(activo, numeroDe(activo))
      await api.update('pedidos', activo.id, { ...activo, estado: nuevoEstado })
      recargar()
    })

    // Reabrir un pedido resuelto invalida su venta, así que se confirma.
    if (resuelto) {
      setConfirmacion({
        tipo: 'reabrir',
        titulo: '¿Reabrir este pedido?',
        mensaje: `El pedido pasará a "${ESTADOS[nuevoEstado].etiqueta}".`,
        avisoVenta: true,
        requiereCheck: false,
        textoConfirmar: 'Sí, reabrir',
        onConfirmar: () => aplicar(true),
      })
      return
    }

    aplicar(false)
  }

  const pedirConfirmacionBorrado = () =>
    setConfirmacion({
      tipo: 'eliminar',
      titulo: resuelto ? '¿Eliminar este pedido?' : '¿Cancelar este pedido?',
      mensaje: resuelto
        ? 'El pedido se eliminará de forma permanente.'
        : 'El pedido se cancelará y desaparecerá de la lista.',
      avisoVenta: resuelto,
      requiereCheck: resuelto,
      textoConfirmar: resuelto ? 'Sí, eliminar' : 'Sí, cancelar pedido',
      onConfirmar: () => eliminarPedido(activo),
    })

  const agregarDelCatalogo = (elegidos) => {
    const items = (activo.items ?? []).map((item) => ({ ...item }))
    elegidos.forEach((elegido) => {
      const existente = items.find((item) => item.name === elegido.name)
      if (existente) existente.qty += elegido.qty
      else items.push({ name: elegido.name, price: elegido.price, qty: elegido.qty })
    })
    setCatalogoAbierto(false)
    guardarItems(items)
  }

  const cambiarCantidad = (nombre, delta) =>
    guardarItems(
      activo.items.map((item) =>
        item.name === nombre ? { ...item, qty: Math.max(1, item.qty + delta) } : item
      )
    )

  const quitarItem = (nombre) =>
    guardarItems(activo.items.filter((item) => item.name !== nombre))

  if (cargando) return <Cargando texto="Cargando pedidos…" />

  return (
    <>
      <EncabezadoPagina titulo="Panel de Operaciones">
        <button className="btn btn-primary" onClick={crearPedido} disabled={procesando}>
          <i className="fa-solid fa-circle-plus me-2" />
          Nuevo pedido
        </button>
      </EncabezadoPagina>

      <Error texto={error} onReintentar={recargar} />

      <div className="row g-3">
        <div className="col-12 col-xl-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <h2 className="h6 fw-bold mb-0">Pedidos solicitados</h2>
              <small className="text-secondary">{new Date().toLocaleDateString('es-CO')}</small>
            </div>

            {pedidos.length === 0 ? (
              <Vacio texto="No hay pedidos registrados." icono="fa-receipt" />
            ) : (
              <ul className="list-group list-group-flush">
                {pedidos.map((pedido) => (
                  <li
                    key={pedido.id}
                    className={`list-group-item d-flex align-items-center gap-2 ${
                      activo?.id === pedido.id ? 'list-group-item-warning' : ''
                    }`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setActivoId(pedido.id)}
                  >
                    <i className="fa-solid fa-user-circle text-secondary" />
                    <span className="fw-semibold flex-grow-1">Pedido #{numeroDe(pedido)}</span>
                    <small className="text-secondary">{pedido.hora}</small>
                    <span className={`badge bg-${ESTADOS[pedido.estado]?.color ?? 'secondary'}`}>
                      {ESTADOS[pedido.estado]?.etiqueta ?? pedido.estado}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="col-12 col-xl-7">
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header bg-white">
              <h2 className="h6 fw-bold mb-0">
                Detalle del pedido {activo ? `#${numeroDe(activo)}` : ''}
              </h2>
            </div>
            <div className="card-body">
              {!activo ? (
                <Vacio texto="Crea un pedido para empezar." icono="fa-cart-plus" />
              ) : (
                <>
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    <select
                      className="form-select"
                      style={{ width: 'auto' }}
                      value={activo.estado}
                      disabled={procesando}
                      onChange={(e) => cambiarEstado(e.target.value)}
                    >
                      {Object.entries(ESTADOS).map(([clave, { etiqueta }]) => (
                        <option key={clave} value={clave}>
                          {etiqueta}
                        </option>
                      ))}
                    </select>

                    <button
                      className="btn btn-outline-primary ms-auto"
                      disabled={resuelto || procesando}
                      onClick={() => setCatalogoAbierto(true)}
                    >
                      <i className="fa-solid fa-plus me-2" />
                      Nuevo producto
                    </button>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead>
                        <tr className="small text-secondary">
                          <th>Producto</th>
                          <th>Cantidad</th>
                          <th>Precio und.</th>
                          <th>Precio</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {(activo.items ?? []).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center text-secondary py-3">
                              Sin productos todavía.
                            </td>
                          </tr>
                        ) : (
                          activo.items.map((item) => (
                            <tr key={item.name}>
                              <td>{item.name}</td>
                              <td>
                                <div className="btn-group btn-group-sm">
                                  <button
                                    className="btn btn-outline-secondary"
                                    disabled={resuelto}
                                    onClick={() => cambiarCantidad(item.name, -1)}
                                  >
                                    −
                                  </button>
                                  <span className="btn btn-outline-secondary disabled">
                                    {item.qty}
                                  </span>
                                  <button
                                    className="btn btn-outline-secondary"
                                    disabled={resuelto}
                                    onClick={() => cambiarCantidad(item.name, 1)}
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td>{moneda(item.price)}</td>
                              <td>{moneda(item.price * item.qty)}</td>
                              <td>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  disabled={resuelto}
                                  onClick={() => quitarItem(item.name)}
                                >
                                  <i className="fa-solid fa-xmark" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-end fw-bold">
                    TOTAL <span className="text-brand">{moneda(total)}</span>
                  </p>

                  <div className="d-flex flex-wrap gap-2 justify-content-end">
                    <button
                      className="btn btn-outline-danger"
                      disabled={procesando}
                      onClick={pedirConfirmacionBorrado}
                    >
                      {resuelto ? 'Eliminar pedido y su venta' : 'Cancelar pedido'}
                    </button>
                    {!resuelto && (
                      <button
                        className="btn btn-primary"
                        disabled={procesando}
                        onClick={() => finalizarPedido(activo)}
                      >
                        {procesando ? 'Generando venta…' : 'Finalizar y generar venta'}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white">
              <h2 className="h6 fw-bold mb-0">Ventas por categoría</h2>
            </div>
            <div className="card-body d-flex flex-wrap align-items-center gap-4">
              {grafica.total === 0 ? (
                <Vacio texto="Aún no hay ventas registradas." icono="fa-chart-pie" />
              ) : (
                <>
                  <div
                    className="pie-chart flex-shrink-0"
                    role="img"
                    aria-label="Distribución de ventas por categoría"
                    style={{
                      background: `conic-gradient(${grafica.tramos
                        .map((t) => `${t.color} ${t.desde}% ${t.hasta}%`)
                        .join(', ')})`,
                    }}
                  />
                  <ul className="list-unstyled small mb-0 flex-grow-1">
                    {grafica.tramos.map((tramo) => (
                      <li className="d-flex align-items-center gap-2 mb-1" key={tramo.nombre}>
                        <span
                          className="d-inline-block rounded-circle"
                          style={{ width: 10, height: 10, background: tramo.color }}
                        />
                        <span className="flex-grow-1">{tramo.nombre}</span>
                        <strong>{tramo.porcentaje.toFixed(1)}%</strong>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {catalogoAbierto && (
        <CatalogoModal
          catalogo={catalogo}
          onAgregar={agregarDelCatalogo}
          onCerrar={() => setCatalogoAbierto(false)}
        />
      )}

      {confirmacion && activo && (
        <ConfirmarAccion
          config={confirmacion}
          pedido={activo}
          numeroPedido={numeroDe(activo)}
          onCancelar={() => setConfirmacion(null)}
        />
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </>
  )
}
