import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { PERMISO } from '../../config/roles.config'
import { useAuth } from '../../context/AuthContext'
import { useAvisos } from '../../context/AvisosContext'
import { useRecurso } from '../../hooks/useRecurso'
import { moneda, numero } from '../../utils/format'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'
import { describirFaltante } from '../recipes/calculos'

import CatalogoModal from './CatalogoModal'
import ConfirmarAccion from './ConfirmarAccion'
import { crearSimulador } from './disponibilidad'
import GraficaCategorias from './GraficaCategorias'
import {
  calcularVentasPorCategoria,
  cambiarEstado as cambiarEstadoDePedido,
  cargarPedidos,
  combinarItems,
  diaDeHoy,
  diasConPedidos,
  etiquetaDia,
  fechaCortaDe,
  TODOS_LOS_DIAS,
  crearPedido as crearPedidoVacio,
  eliminarPedido as eliminarPedidoConVenta,
  facturarPedido,
  guardarItems as guardarItemsDePedido,
  numeroDe,
  siguienteNumero,
} from './servicio'

// Etiquetas con los nombres de estado del backend (ver ESTADO_UI en servicio.js)
const ESTADOS = {
  pendiente: { etiqueta: 'En preparación', color: 'warning', icono: 'fa-hourglass-start' },
  preparacion: { etiqueta: 'Listo', color: 'info', icono: 'fa-fire-burner' },
  resuelto: { etiqueta: 'Finalizado', color: 'success', icono: 'fa-circle-check' },
}

// Mientras `datos` sea este mismo objeto no ha llegado ninguna respuesta: es lo
// que distingue la primera carga de las recargas tras cada cambio.
const INICIAL = { pedidos: [], catalogo: [], disponibilidad: null, errorInventario: '' }

// Mismo arreglo vacío en cada render: un `[]` nuevo rompería los useMemo que
// dependen de las líneas del pedido.
const SIN_ITEMS = []

/**
 * Pantalla de Gestión de Pedidos.
 *
 * Reparto de responsabilidades: este componente guarda el estado de la
 * INTERFAZ (pedido seleccionado, filtro, modales abiertos) y avisa del
 * resultado; las reglas del negocio —crear, facturar, reabrir, eliminar— están
 * en ./servicio.js. Cada manejador de abajo sigue los mismos tres pasos:
 * llamar al servicio → recargar los datos → avisar al usuario.
 */
export default function Pedidos() {
  const navegar = useNavigate()
  const avisos = useAvisos()
  const { puede } = useAuth()
  // Reabrir o eliminar un pedido FACTURADO borra su venta: en el backend eso es
  // DELETE /api/sales y DELETE /api/orders, solo ADMIN_ROLES. El empleado no ve esos botones.
  const gestionaVentas = puede(PERMISO.GESTIONAR_VENTAS)

  const { datos, cargando, error, setError, recargar } = useRecurso(cargarPedidos, INICIAL)

  const { pedidos, catalogo, disponibilidad, errorInventario } = datos
  const [activoId, setActivoId] = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [catalogoAbierto, setCatalogoAbierto] = useState(false)
  const [confirmacion, setConfirmacion] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('todos')

  // DÍA QUE SE MIRA: por defecto solo los pedidos de hoy; el desplegable lleva a cualquier
  // otro día con pedidos o a «Todos los días». La lista, los contadores y la gráfica lo siguen.
  const hoy = diaDeHoy()
  const [dia, setDia] = useState(hoy)
  const dias = useMemo(() => diasConPedidos(pedidos, hoy), [pedidos, hoy])
  const delDia = useMemo(
    () => (dia === TODOS_LOS_DIAS ? pedidos : pedidos.filter((pedido) => pedido.fecha === dia)),
    [pedidos, dia]
  )
  const verDia = (nuevoDia) => {
    setDia(nuevoDia)
    setActivoId(null)
  }

  const visibles = useMemo(
    () =>
      filtroEstado === 'todos'
        ? delDia
        : delDia.filter((pedido) => pedido.estado === filtroEstado),
    [delDia, filtroEstado]
  )

  const activo = delDia.find((pedido) => pedido.id === activoId) ?? visibles[0] ?? delDia[0]
  const resuelto = activo?.estado === 'resuelto'
  const items = activo?.items ?? SIN_ITEMS
  const unidades = items.reduce((suma, item) => suma + (Number(item.qty) || 0), 0)
  const total = items.reduce((suma, item) => suma + item.price * item.qty, 0)
  const reparto = useMemo(() => calcularVentasPorCategoria(delDia, catalogo), [delDia, catalogo])

  // Inventario: qué cabe todavía y qué falta para facturar ESTE pedido. Se
  // recalcula cada vez que llega disponibilidad nueva (otra caja facturó,
  // alguien repuso stock o cambió una receta).
  const simulador = useMemo(() => crearSimulador(disponibilidad), [disponibilidad])
  const faltantes = useMemo(
    () => (activo && !resuelto ? simulador.faltantes(items) : []),
    [simulador, activo, resuelto, items]
  )

  const porEstado = useMemo(
    () =>
      Object.keys(ESTADOS).reduce(
        (cuenta, clave) => ({
          ...cuenta,
          [clave]: delDia.filter((pedido) => pedido.estado === clave).length,
        }),
        {}
      ),
    [delDia]
  )

  /**
   * Envuelve una escritura: marca el proceso en curso, deja el error en pantalla y DEVUELVE
   * si funcionó, para que el modal de confirmación siga abierto cuando algo falla.
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
    const guardado = await guardarItemsDePedido(activo, nuevosItems)
    // Un borrador se guarda en el backend con un id nuevo: la selección pasa a ese pedido
    if (guardado?.id && guardado.id !== activo.id) setActivoId(guardado.id)
    await recargar()
  })

  const crearPedido = conError(async () => {
    const siguiente = siguienteNumero(pedidos)
    const creado = await crearPedidoVacio(siguiente)

    // Un pedido nuevo es de hoy: la lista vuelve a hoy para mostrarlo
    setDia(diaDeHoy())
    setActivoId(creado.id)
    setFiltroEstado('todos')
    await recargar()
    avisos.exito('Pedido creado', `El pedido #${siguiente} está listo para recibir productos.`)
  })

  const eliminarPedido = conError(async (pedido) => {
    const numeroPedido = numeroDe(pedido)
    await eliminarPedidoConVenta(pedido)

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

    // Quien factura queda en la venta: el backend lo toma del token de la sesión
    const venta = await facturarPedido(pedido)

    avisos.exito(
      'Venta generada',
      `El pedido #${numeroDe(pedido)} se facturó por ${moneda(venta.total)}.`
    )
    // Ventas abre directamente la venta recién creada.
    navegar('/empleado/ventas', { state: { ventaReciente: venta.id } })
  })

  const cambiarEstado = (nuevoEstado) => {
    if (nuevoEstado === 'resuelto') return finalizarPedido(activo)

    const aplicar = conError(async (borrarVenta) => {
      await cambiarEstadoDePedido(activo, nuevoEstado, { borrarVenta })
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
    const nuevos = combinarItems(items, elegidos)

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

  // El spinner de pantalla completa solo en la PRIMERA carga: en cada recarga se perdería la
  // posición del scroll.
  if (cargando && datos === INICIAL) return <Cargando texto="Cargando pedidos…" />

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

      {errorInventario && (
        <div className="alert alert-warning small d-flex gap-2 align-items-start" role="status">
          <i className="fa-solid fa-plug-circle-xmark mt-1" />
          <span>
            Sin datos de inventario: no se muestran las unidades disponibles y no se podrá
            facturar. {errorInventario}
          </span>
        </div>
      )}

      <div className="row g-3">
        <div className="col-12 col-xl-aureo-menor">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white d-flex justify-content-between align-items-center gap-2">
              <h2 className="h6 fw-bold mb-0">Pedidos solicitados</h2>
              <small className="text-secondary">{new Date().toLocaleDateString('es-CO')}</small>
            </div>

            {/* Día que se mira: hoy por defecto; el desplegable muestra cualquier otro día */}
            <div className="card-body p-2 border-bottom d-flex align-items-center gap-2">
              <label className="small text-secondary mb-0 flex-shrink-0" htmlFor="dia-pedidos">
                <i className="fa-solid fa-calendar-day text-brand me-1" />
                Día
              </label>
              <select
                id="dia-pedidos"
                className="form-select form-select-sm"
                value={dia}
                onChange={(evento) => verDia(evento.target.value)}
              >
                {dias.map(({ fecha, cantidad }) => (
                  <option key={fecha} value={fecha}>
                    {etiquetaDia(fecha, hoy)} · {cantidad} pedido{cantidad === 1 ? '' : 's'}
                  </option>
                ))}
                <option value={TODOS_LOS_DIAS}>Todos los días · {pedidos.length} pedidos</option>
              </select>
              {dia !== hoy && (
                <button className="btn btn-sm btn-outline-primary flex-shrink-0" onClick={() => verDia(hoy)}>
                  Hoy
                </button>
              )}
            </div>

            <div className="card-body p-2 border-bottom">
              <div className="row row-cols-4 g-1" role="group" aria-label="Filtrar por estado">
                {[
                  { clave: 'todos', etiqueta: 'Todos', cantidad: delDia.length, color: 'secondary' },
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
                {delDia.length === 0 && dia === hoy && 'Hoy todavía no hay pedidos. Pulsa «Nuevo pedido».'}
                {delDia.length === 0 && dia !== hoy && 'Ese día no tiene pedidos.'}
                {delDia.length > 0 && 'No hay pedidos con ese estado.'}
              </p>
            ) : (
              <ul
                className="list-group list-group-flush overflow-auto"
                style={{ maxHeight: 'calc(var(--vh-pantalla) - 16rem)' }}
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
                          <span>
                            {dia === TODOS_LOS_DIAS && `${fechaCortaDe(pedido.fecha)} · `}
                            {pedido.hora}
                          </span>
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

        <div className="col-12 col-xl-aureo-mayor">
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
                      disabled={procesando || (resuelto && !gestionaVentas)}
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
                      {gestionaVentas
                        ? 'Este pedido ya está facturado. Para modificarlo hay que reabrirlo, lo que elimina su venta.'
                        : 'Este pedido ya está facturado. Solo la administración puede reabrirlo o eliminarlo.'}
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
                                    disabled={
                                      resuelto ||
                                      procesando ||
                                      simulador.cuantasMas(item.name, items) === 0
                                    }
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

                  {faltantes.length > 0 && (
                    <div className="alert alert-danger small" role="alert">
                      <strong className="d-block mb-1">
                        <i className="fa-solid fa-triangle-exclamation me-2" />
                        No alcanza el inventario para facturar este pedido
                      </strong>
                      <ul className="mb-0 ps-3">
                        {faltantes.map((faltante) => (
                          <li key={faltante.insumo_id}>{describirFaltante(faltante)}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="modal-resumen d-flex justify-content-between align-items-center mb-3">
                    <strong className="text-uppercase small">Total del pedido</strong>
                    <span className="h4 fw-bold text-brand mb-0">{moneda(total)}</span>
                  </div>

                  <div className="d-flex flex-wrap gap-2 justify-content-end">
                    {(!resuelto || gestionaVentas) && (
                      <button
                        className="btn btn-outline-danger"
                        disabled={procesando}
                        onClick={pedirConfirmacionBorrado}
                      >
                        <i className="fa-solid fa-trash-can me-2" />
                        {resuelto ? 'Eliminar pedido y su venta' : 'Cancelar pedido'}
                      </button>
                    )}
                    {!resuelto && (
                      <button
                        className="btn btn-primary"
                        disabled={procesando || items.length === 0 || faltantes.length > 0}
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
              <span className="badge bg-secondary">
                Pedidos resueltos · {dia === TODOS_LOS_DIAS ? 'todos los días' : etiquetaDia(dia, hoy).toLowerCase()}
              </span>
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
          simulador={simulador}
          itemsPedido={items}
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
