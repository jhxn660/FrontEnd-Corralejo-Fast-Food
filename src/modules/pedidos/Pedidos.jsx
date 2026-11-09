import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api } from '../../services/api'
import { useRecurso } from '../../hooks/useRecurso'
import { useAvisos } from '../../context/AvisosContext'
import { fechaISO, hora12, moneda, numero } from '../../utils/format'
import {
  CLAVE_VENTA_RECIENTE,
  construirVenta,
  eliminarVentasDePedido,
} from '../ventas/servicio'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'
import { CATEGORIAS, COLOR_SIN_CATEGORIA } from '../../data/graficas'
import CatalogoModal from './CatalogoModal'
import ConfirmarAccion from './ConfirmarAccion'
import GraficaCategorias from './GraficaCategorias'

const ESTADOS = {
  pendiente: { etiqueta: 'Pendiente', color: 'warning', icono: 'fa-hourglass-start' },
  preparacion: { etiqueta: 'En preparación', color: 'info', icono: 'fa-fire-burner' },
  resuelto: { etiqueta: 'Resuelto', color: 'success', icono: 'fa-circle-check' },
}

// "categoria" era un duplicado de Perros Calientes: se ignora en el catálogo.
const CLAVES_OCULTAS = ['categoria']

const numeroDe = (pedido) => pedido?.numero ?? pedido?.id

const normalizarCatalogo = (datos) =>
  Object.fromEntries(
    Object.entries(datos ?? {}).filter(
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
        totales[nombre] = (totales[nombre] ?? 0) + (Number(item.qty) || 0)
      })
    )

  const total = Object.values(totales).reduce((suma, valor) => suma + valor, 0)
  if (total === 0) return { total: 0, tramos: [] }

  const colores = Object.fromEntries(
    Object.values(CATEGORIAS).map(({ titulo, color }) => [titulo, color])
  )
  let acumulado = 0

  // De mayor a menor: la torta se lee de un vistazo y el primer tramo es el que
  // importa.
  const tramos = Object.entries(totales)
    .sort((a, b) => b[1] - a[1])
    .map(([nombre, cantidad]) => {
      const inicio = acumulado
      acumulado += (cantidad / total) * 100
      return {
        nombre,
        cantidad,
        color: colores[nombre] ?? COLOR_SIN_CATEGORIA,
        porcentaje: (cantidad / total) * 100,
        desde: inicio,
        hasta: acumulado,
      }
    })

  return { total, tramos }
}

export default function Pedidos() {
  const navegar = useNavigate()
  const avisos = useAvisos()

  const cargar = useCallback(async () => {
    // `pedidos` es una colección y `catalogo` un objeto con una clave por
    // categoría: cada uno se pide con el verbo que le corresponde.
    const [pedidos, catalogo] = await Promise.all([
      api.list('pedidos'),
      api.obtener('catalogo'),
    ])
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
  const [filtroEstado, setFiltroEstado] = useState('todos')

  const visibles = useMemo(
    () =>
      filtroEstado === 'todos'
        ? pedidos
        : pedidos.filter((pedido) => pedido.estado === filtroEstado),
    [pedidos, filtroEstado]
  )

  const activo = pedidos.find((pedido) => pedido.id === activoId) ?? visibles[0] ?? pedidos[0]
  const resuelto = activo?.estado === 'resuelto'
  const items = activo?.items ?? []
  const unidades = items.reduce((suma, item) => suma + (Number(item.qty) || 0), 0)
  const total = items.reduce((suma, item) => suma + item.price * item.qty, 0)
  const reparto = useMemo(() => calcularVentasPorCategoria(pedidos, catalogo), [pedidos, catalogo])

  const porEstado = useMemo(
    () =>
      Object.keys(ESTADOS).reduce(
        (cuenta, clave) => ({
          ...cuenta,
          [clave]: pedidos.filter((pedido) => pedido.estado === clave).length,
        }),
        {}
      ),
    [pedidos]
  )

  /**
   * Envuelve una escritura: marca el proceso en curso, deja el error en
   * pantalla y DEVUELVE si funcionó. Lo último es lo que permite que el modal
   * de confirmación se quede abierto cuando algo falla, en vez de cerrarse como
   * si el borrado hubiera salido bien.
   */
  const conError = (accion) => async (...args) => {
    setError('')
    setProcesando(true)
    try {
      await accion(...args)
      return true
    } catch (err) {
      setError(err.message)
      avisos.fallo('La operación no se completó', err)
      return false
    } finally {
      setProcesando(false)
    }
  }

  const guardarItems = conError(async (nuevosItems) => {
    await api.update('pedidos', activo.id, { ...activo, items: nuevosItems })
    await recargar()
  })

  const crearPedido = conError(async () => {
    const ahora = new Date()
    const numeros = pedidos
      .map(numeroDe)
      .filter((n) => /^\d+$/.test(String(n)))
      .map(Number)
    const siguiente = numeros.length > 0 ? Math.max(...numeros) + 1 : 1

    const creado = await api.create('pedidos', {
      numero: siguiente,
      estado: 'pendiente',
      fecha: fechaISO(ahora),
      hora: hora12(ahora),
      items: [],
    })

    setActivoId(creado.id)
    setFiltroEstado('todos')
    await recargar()
    avisos.exito('Pedido creado', `El pedido #${siguiente} está listo para recibir productos.`)
  })

  const eliminarPedido = conError(async (pedido) => {
    const numeroPedido = numeroDe(pedido)
    // Primero la venta: si falla, el pedido no se borra y nada queda inconsistente.
    await eliminarVentasDePedido(pedido, numeroPedido)
    await api.remove('pedidos', pedido.id).catch(() => null)

    setActivoId(null)
    await recargar()
    avisos.error(
      pedido.estado === 'resuelto' ? 'Pedido eliminado' : 'Pedido cancelado',
      `El pedido #${numeroPedido} fue retirado de la lista.`
    )
  })

  /** Marca el pedido como resuelto, genera su venta y lleva a Gestión de Ventas. */
  const finalizarPedido = conError(async (pedido) => {
    if (!pedido?.items?.length) {
      // No es un fallo de red: es el empleado avisando de que falta algo, así
      // que se dice y no se lanza.
      setError('Agrega al menos un producto antes de finalizar el pedido.')
      avisos.error('Pedido vacío', 'Agrega al menos un producto antes de generar la venta.')
      return
    }

    const ventas = await api.list('sales')
    const numeroPedido = numeroDe(pedido)

    // Si el pedido ya tenía venta no se duplica: se reutiliza la existente.
    let venta = ventas.find((s) => s.pedidoId === pedido.id || s.orderId === `#P-${numeroPedido}`)
    if (!venta) venta = await api.create('sales', construirVenta(pedido, ventas, numeroPedido))

    await api.update('pedidos', pedido.id, { ...pedido, estado: 'resuelto' })
    sessionStorage.setItem(CLAVE_VENTA_RECIENTE, String(venta.id))

    avisos.exito(
      'Venta generada',
      `El pedido #${numeroPedido} se facturó por ${moneda(venta.total)}.`
    )
    navegar('/empleado/ventas')
  })

  const cambiarEstado = (nuevoEstado) => {
    if (nuevoEstado === 'resuelto') return finalizarPedido(activo)

    const aplicar = conError(async (borrarVenta) => {
      if (borrarVenta) await eliminarVentasDePedido(activo, numeroDe(activo))
      await api.update('pedidos', activo.id, { ...activo, estado: nuevoEstado })
      await recargar()
      avisos.exito(
        'Estado actualizado',
        `El pedido #${numeroDe(activo)} pasó a "${ESTADOS[nuevoEstado].etiqueta}".`
      )
    })

    // Reabrir un pedido resuelto invalida su venta, así que se confirma.
    if (resuelto) {
      setConfirmacion({
        tipo: 'reabrir',
        titulo: '¿Reabrir este pedido?',
        mensaje: `El pedido volverá a "${ESTADOS[nuevoEstado].etiqueta}" y su venta se eliminará.`,
        avisoVenta: true,
        requiereCheck: false,
        textoConfirmar: 'Sí, reabrir',
        onConfirmar: () => aplicar(true),
      })
      return undefined
    }

    return aplicar(false)
  }

  const pedirConfirmacionBorrado = () =>
    setConfirmacion({
      tipo: 'eliminar',
      titulo: resuelto ? '¿Eliminar este pedido?' : '¿Cancelar este pedido?',
      mensaje: resuelto
        ? 'El pedido se eliminará de forma permanente junto con su venta.'
        : 'El pedido se cancelará y desaparecerá de la lista.',
      avisoVenta: resuelto,
      requiereCheck: resuelto,
      textoConfirmar: resuelto ? 'Sí, eliminar' : 'Sí, cancelar pedido',
      onConfirmar: () => eliminarPedido(activo),
    })

  const agregarDelCatalogo = (elegidos) => {
    const nuevos = items.map((item) => ({ ...item }))
    elegidos.forEach((elegido) => {
      const existente = nuevos.find((item) => item.name === elegido.name)
      if (existente) existente.qty += elegido.qty
      else nuevos.push({ name: elegido.name, price: elegido.price, qty: elegido.qty })
    })

    setCatalogoAbierto(false)
    guardarItems(nuevos).then((ok) => {
      if (ok) {
        const añadidas = elegidos.reduce((suma, item) => suma + item.qty, 0)
        avisos.exito('Productos agregados', `${añadidas} unidad(es) en el pedido #${numeroDe(activo)}.`)
      }
    })
  }

  const cambiarCantidad = (nombre, delta) =>
    guardarItems(
      items.map((item) =>
        item.name === nombre ? { ...item, qty: Math.max(1, item.qty + delta) } : item
      )
    )

  const quitarItem = (nombre) =>
    guardarItems(items.filter((item) => item.name !== nombre)).then((ok) => {
      if (ok) avisos.error('Producto quitado', `${nombre} salió del pedido.`)
    })

  if (cargando) return <Cargando texto="Cargando pedidos…" />

  return (
    <>
      <EncabezadoPagina
        titulo="Gestión de Pedidos"
        descripcion="Toma pedidos, cámbialos de estado y conviértelos en venta."
      >
        <button className="btn btn-outline-secondary" onClick={recargar} disabled={procesando}>
          <i className="fa-solid fa-rotate me-2" />
          Actualizar
        </button>
        <button className="btn btn-primary" onClick={crearPedido} disabled={procesando}>
          <i className="fa-solid fa-circle-plus me-2" />
          Nuevo pedido
        </button>
      </EncabezadoPagina>

      <MensajeError texto={error} onReintentar={recargar} />

      <div className="row g-3">
        <div className="col-12 col-xl-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center gap-2">
              <h2 className="h6 fw-bold mb-0">Pedidos solicitados</h2>
              <small className="text-secondary">{new Date().toLocaleDateString('es-CO')}</small>
            </div>

            <div className="card-body pb-0">
              <ul className="nav nav-pills flex-wrap gap-1" aria-label="Filtrar por estado">
                <li className="nav-item">
                  <button
                    className={`nav-link ${filtroEstado === 'todos' ? 'active' : ''}`}
                    onClick={() => setFiltroEstado('todos')}
                  >
                    Todos <span className="badge bg-secondary ms-1">{pedidos.length}</span>
                  </button>
                </li>
                {Object.entries(ESTADOS).map(([clave, { etiqueta, color }]) => (
                  <li className="nav-item" key={clave}>
                    <button
                      className={`nav-link ${filtroEstado === clave ? 'active' : ''}`}
                      onClick={() => setFiltroEstado(clave)}
                    >
                      {etiqueta}{' '}
                      <span className={`badge bg-${color} ms-1`}>{porEstado[clave] ?? 0}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {visibles.length === 0 ? (
              <Vacio texto="No hay pedidos con ese estado." icono="fa-receipt" />
            ) : (
              <ul className="list-group list-group-flush mt-3">
                {visibles.map((pedido) => {
                  const estado = ESTADOS[pedido.estado] ?? {}
                  const lineas = (pedido.items ?? []).length
                  const importe = (pedido.items ?? []).reduce(
                    (suma, item) => suma + item.price * item.qty,
                    0
                  )

                  return (
                    <li key={pedido.id} className="list-group-item p-0">
                      <button
                        className={`btn w-100 text-start rounded-0 border-0 py-3 ${
                          activo?.id === pedido.id ? 'bg-body-tertiary' : ''
                        }`}
                        onClick={() => setActivoId(pedido.id)}
                        aria-current={activo?.id === pedido.id ? 'true' : undefined}
                      >
                        <span className="d-flex align-items-center gap-2">
                          <i
                            className={`fa-solid ${estado.icono ?? 'fa-receipt'} text-${
                              estado.color ?? 'secondary'
                            }`}
                          />
                          <span className="fw-semibold flex-grow-1">
                            Pedido #{numeroDe(pedido)}
                          </span>
                          <span className={`badge bg-${estado.color ?? 'secondary'}`}>
                            {estado.etiqueta ?? pedido.estado}
                          </span>
                        </span>
                        <span className="d-flex gap-3 small text-secondary mt-1 ps-4">
                          <span>{pedido.hora}</span>
                          <span>{lineas} línea(s)</span>
                          <span className="ms-auto fw-semibold text-brand">{moneda(importe)}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="col-12 col-xl-7">
          <div className="card border-0 shadow-sm mb-3">
            <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
              <h2 className="h6 fw-bold mb-0">
                Detalle del pedido {activo ? `#${numeroDe(activo)}` : ''}
              </h2>
              {activo && (
                <span className="badge bg-secondary">
                  {numero(unidades)} unidad(es) · {items.length} línea(s)
                </span>
              )}
            </div>

            <div className="card-body">
              {!activo ? (
                <Vacio texto="Crea un pedido para empezar." icono="fa-cart-plus">
                  <button className="btn btn-primary" onClick={crearPedido} disabled={procesando}>
                    <i className="fa-solid fa-circle-plus me-2" />
                    Nuevo pedido
                  </button>
                </Vacio>
              ) : (
                <>
                  <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                    <label className="form-label mb-0 small" htmlFor="estado-pedido">
                      Estado
                    </label>
                    <select
                      id="estado-pedido"
                      className="form-select"
                      style={{ width: 'auto' }}
                      value={activo.estado}
                      disabled={procesando}
                      onChange={(evento) => cambiarEstado(evento.target.value)}
                    >
                      {Object.entries(ESTADOS).map(([clave, { etiqueta }]) => (
                        <option key={clave} value={clave}>
                          {etiqueta}
                        </option>
                      ))}
                    </select>

                    <button
                      className="btn btn-primary ms-auto"
                      disabled={resuelto || procesando}
                      onClick={() => setCatalogoAbierto(true)}
                    >
                      <i className="fa-solid fa-plus me-2" />
                      Agregar productos
                    </button>
                  </div>

                  {resuelto && (
                    <div className="alert alert-success py-2 small">
                      <i className="fa-solid fa-circle-check me-2" />
                      Este pedido ya está facturado. Para modificarlo hay que reabrirlo, lo que
                      elimina su venta.
                    </div>
                  )}

                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th className="text-center">Cantidad</th>
                          <th className="text-end">Precio und.</th>
                          <th className="text-end">Subtotal</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center text-secondary py-4">
                              Sin productos todavía. Pulsa <strong>Agregar productos</strong>.
                            </td>
                          </tr>
                        ) : (
                          items.map((item) => (
                            <tr key={item.name}>
                              <td className="fw-semibold">{item.name}</td>
                              <td className="text-center">
                                <div className="btn-group btn-group-sm">
                                  <button
                                    className="btn btn-outline-secondary"
                                    disabled={resuelto || procesando || item.qty <= 1}
                                    onClick={() => cambiarCantidad(item.name, -1)}
                                    aria-label={`Quitar una unidad de ${item.name}`}
                                  >
                                    <i className="fa-solid fa-minus" />
                                  </button>
                                  <span
                                    className="btn btn-outline-secondary disabled"
                                    style={{ minWidth: '2.5rem' }}
                                  >
                                    {item.qty}
                                  </span>
                                  <button
                                    className="btn btn-outline-secondary"
                                    disabled={resuelto || procesando}
                                    onClick={() => cambiarCantidad(item.name, 1)}
                                    aria-label={`Añadir una unidad de ${item.name}`}
                                  >
                                    <i className="fa-solid fa-plus" />
                                  </button>
                                </div>
                              </td>
                              <td className="text-end">{moneda(item.price)}</td>
                              <td className="text-end fw-semibold">
                                {moneda(item.price * item.qty)}
                              </td>
                              <td className="text-end">
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  disabled={resuelto || procesando}
                                  onClick={() => quitarItem(item.name)}
                                  aria-label={`Quitar ${item.name} del pedido`}
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

                  <div className="modal-resumen d-flex justify-content-between align-items-center mb-3">
                    <strong className="text-uppercase small">Total del pedido</strong>
                    <span className="h4 fw-bold text-brand mb-0">{moneda(total)}</span>
                  </div>

                  <div className="d-flex flex-wrap gap-2 justify-content-end">
                    <button
                      className="btn btn-outline-danger"
                      disabled={procesando}
                      onClick={pedirConfirmacionBorrado}
                    >
                      <i className="fa-solid fa-trash-can me-2" />
                      {resuelto ? 'Eliminar pedido y su venta' : 'Cancelar pedido'}
                    </button>
                    {!resuelto && (
                      <button
                        className="btn btn-primary"
                        disabled={procesando || items.length === 0}
                        onClick={() => finalizarPedido(activo)}
                      >
                        <i className="fa-solid fa-receipt me-2" />
                        {procesando ? 'Generando venta…' : 'Finalizar y generar venta'}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white d-flex justify-content-between align-items-center gap-2">
              <h2 className="h6 fw-bold mb-0">Productos vendidos por categoría</h2>
              <span className="badge bg-secondary">Pedidos resueltos</span>
            </div>
            <div className="card-body d-flex flex-wrap align-items-center gap-4">
              <GraficaCategorias reparto={reparto} />
            </div>
          </div>
        </div>
      </div>

      {catalogoAbierto && activo && (
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
    </>
  )
}
