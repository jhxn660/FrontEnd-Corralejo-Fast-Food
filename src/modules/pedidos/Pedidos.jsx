import { useCallback, useMemo, useRef, useState } from 'react'
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
import { COLOR_SIN_CATEGORIA, PALETA_CATEGORIAS } from '../../data/graficas'
import { menuApi, productosVendibles } from '../menu/api'
import CatalogoModal from './CatalogoModal'
import ConfirmarAccion from './ConfirmarAccion'
import GraficaCategorias from './GraficaCategorias'

const ESTADOS = {
  pendiente: { etiqueta: 'Pendiente', color: 'warning', icono: 'fa-hourglass-start' },
  preparacion: { etiqueta: 'En preparación', color: 'info', icono: 'fa-fire-burner' },
  resuelto: { etiqueta: 'Resuelto', color: 'success', icono: 'fa-circle-check' },
}

const numeroDe = (pedido) => pedido?.numero ?? pedido?.id

/**
 * Reparte el total de unidades vendidas por categoría para el gráfico de torta.
 * Las categorías son las de la carta del administrador: un producto vendido
 * que ya no está en la carta cae en "Otros".
 */
function calcularVentasPorCategoria(pedidos, categorias) {
  const categoriaDe = {}
  categorias.forEach((categoria) =>
    categoria.productos.forEach((producto) => {
      categoriaDe[producto.nombre] = categoria.nombre
    })
  )

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

  let acumulado = 0

  // De mayor a menor: la torta se lee de un vistazo y el primer tramo es el que
  // importa.
  const tramos = Object.entries(totales)
    .sort((a, b) => b[1] - a[1])
    .map(([nombre, cantidad], posicion) => {
      const inicio = acumulado
      acumulado += (cantidad / total) * 100
      return {
        nombre,
        cantidad,
        // Color por posición y no por nombre: las dos categorías de
        // hamburguesas tendrían el mismo tono y la torta no las distinguiría.
        color:
          nombre === 'Otros'
            ? COLOR_SIN_CATEGORIA
            : PALETA_CATEGORIAS[posicion % PALETA_CATEGORIAS.length],
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
    // El catálogo es la carta del administrador (R25: una sola fuente).
    const [pedidos, { categorias }] = await Promise.all([
      api.list('pedidos'),
      menuApi.listarCategorias({ soloDisponibles: true }),
    ])
    return {
      pedidos: [...pedidos].sort((a, b) => Number(numeroDe(b)) - Number(numeroDe(a))),
      catalogo: productosVendibles(categorias),
    }
  }, [])

  const { datos, cargando, error, setError, recargar } = useRecurso(cargar, {
    pedidos: [],
    catalogo: [],
  })

  const { pedidos, catalogo } = datos
  const cargadoUnaVez = useRef(false)
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
        avisos.exito('Productos agregados', `${añadidas} und en el pedido #${numeroDe(activo)}.`)
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

  // El spinner de pantalla completa solo en la PRIMERA carga. Cada cambio de
  // cantidad recarga los pedidos; si en esa recarga se sustituía toda la
  // pantalla por el spinner, la página se encogía, el navegador perdía la
  // posición del scroll y al volver había que bajar otra vez hasta la línea.
  if (cargando && !cargadoUnaVez.current) return <Cargando texto="Cargando pedidos…" />
  if (!cargando) cargadoUnaVez.current = true

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
          {/* Sin h-100: la tarjeta mide lo que su lista. Con h-100 se estiraba
              hasta la altura de la columna derecha y, al filtrar, quedaba un
              hueco enorme bajo los pedidos. */}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white d-flex justify-content-between align-items-center gap-2">
              <h2 className="h6 fw-bold mb-0">Pedidos solicitados</h2>
              <small className="text-secondary">{new Date().toLocaleDateString('es-CO')}</small>
            </div>

            {/* Cuatro filtros en una sola fila de columnas iguales. Antes eran
                pastillas con texto largo que se partían en 3 + 1. */}
            <div className="card-body p-2 border-bottom">
              <div className="row row-cols-4 g-1" role="group" aria-label="Filtrar por estado">
                {[
                  { clave: 'todos', etiqueta: 'Todos', cantidad: pedidos.length, color: 'secondary' },
                  ...Object.entries(ESTADOS).map(([clave, { etiqueta, color }]) => ({
                    clave,
                    etiqueta: clave === 'preparacion' ? 'Preparando' : etiqueta,
                    cantidad: porEstado[clave] ?? 0,
                    color,
                  })),
                ].map(({ clave, etiqueta, cantidad, color }) => (
                  <div className="col" key={clave}>
                    <button
                      className={`btn btn-sm w-100 px-1 ${
                        filtroEstado === clave ? 'btn-primary' : 'btn-outline-secondary'
                      }`}
                      onClick={() => setFiltroEstado(clave)}
                      aria-pressed={filtroEstado === clave}
                    >
                      <span className="d-block text-truncate small">{etiqueta}</span>
                      <span className={`badge bg-${filtroEstado === clave ? 'light text-dark' : color}`}>
                        {cantidad}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {visibles.length === 0 ? (
              <p className="text-secondary small text-center my-4 mb-4">
                No hay pedidos con ese estado.
              </p>
            ) : (
              <ul
                className="list-group list-group-flush overflow-auto"
                style={{ maxHeight: 'calc(100vh - 16rem)' }}
              >
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
                  {numero(unidades)} und · {items.length} línea(s)
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
          categorias={catalogo}
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
