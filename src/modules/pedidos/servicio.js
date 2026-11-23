// LÓGICA DE NEGOCIO DEL MÓDULO DE PEDIDOS.
//
// La pantalla (Pedidos.jsx) decide QUÉ se ve y qué pasa al pulsar un botón. CÓMO se crea,
// se factura o se cancela un pedido —qué rutas se llaman y en qué orden— vive aquí.
//
// Flujo de datos:  Pedidos.jsx ─▶ servicio.js ─▶ services/http.js ─▶ backend (/api/orders)
//
// Reglas que ahora aplica el BACKEND:
// - Los precios salen del catálogo, nunca de la pantalla (se envía productId y cantidad).
// - Facturar = registrar la venta (POST /api/sales { orderId }). Eso marca el pedido como
//   "Finalizado" y DESCUENTA los insumos de la receta de cada plato.
// - Eliminar esa venta devuelve los insumos al stock y deja el pedido en "Listo".

import { http } from '../../services/http'
import { COLOR_SIN_CATEGORIA, PALETA_CATEGORIAS } from '../../data/graficas'
import { fechaISO, hora12 } from '../../utils/format'
import { menuApi, productosVendibles } from '../menu/api'
import { inventarioApi } from '../inventario/api'
import { aVentaUi, eliminarVentasDePedido } from '../ventas/servicio'

const RUTA = '/orders'
const RUTA_VENTAS = '/sales'

/**
 * Estados: la pantalla usa tres claves; el backend tiene los suyos.
 *   pendiente  ↔ 'En preparación'  (recién creado; el backend lo pone por defecto)
 *   preparacion ↔ 'Listo'
 *   resuelto   ↔ 'Finalizado'      (solo se llega registrando la venta)
 * 'Entregado' se muestra como "Listo"; los 'Cancelado' no aparecen en la lista.
 */
const ESTADO_UI = {
  'En preparación': 'pendiente',
  Listo: 'preparacion',
  Entregado: 'preparacion',
  Finalizado: 'resuelto',
}
const ESTADO_API = { pendiente: 'En preparación', preparacion: 'Listo' }

/** Pedido del backend → forma de la pantalla. */
const aPedidoUi = (pedido) => {
  const creado = new Date(pedido.createdAt ?? Date.now())
  return {
    id: pedido._id,
    numero: pedido.orderNumber,
    estado: ESTADO_UI[pedido.estado] ?? 'pendiente',
    fecha: fechaISO(creado),
    hora: hora12(creado),
    // Cada línea guarda el _id del plato y si es combo: es lo que el backend necesita
    items: (pedido.detalles ?? []).map((detalle) => ({
      name: detalle.producto,
      price: detalle.precio_unitario,
      qty: detalle.cantidad,
      productoId: detalle.productId ? String(detalle.productId) : null,
      combo: Boolean(detalle.combo),
    })),
  }
}

/** Línea de la pantalla → la que espera el backend. */
const aItemApi = (item) => ({ productId: item.productoId, quantity: Number(item.qty), combo: Boolean(item.combo) })

/** Número visible del pedido. */
export const numeroDe = (pedido) => pedido?.numero ?? pedido?.id

/**
 * Lo que la pantalla necesita para pintarse: los pedidos (del más nuevo al más antiguo), el
 * catálogo de productos que se pueden añadir y cuántas unidades de cada uno permite el
 * inventario AHORA. Si la disponibilidad falla, la pantalla sigue sin límites visibles.
 */
export const cargarPedidos = async () => {
  const [pedidos, { categorias }, disponibilidad] = await Promise.all([
    http.get(RUTA),
    menuApi.listarCategorias({ soloDisponibles: true }),
    inventarioApi.disponibilidad().catch((err) => ({ error: err.message })),
  ])
  return {
    pedidos: pedidos
      .filter((pedido) => pedido.estado !== 'Cancelado')
      .map(aPedidoUi)
      .sort((a, b) => Number(b.numero) - Number(a.numero)),
    catalogo: productosVendibles(categorias),
    disponibilidad: disponibilidad?.error ? null : disponibilidad,
    errorInventario: disponibilidad?.error ?? '',
  }
}

/** El backend asigna el número al crear el pedido; aquí solo se estima para la interfaz. */
export const siguienteNumero = (pedidos) => {
  const numeros = pedidos.map(numeroDe).filter((n) => Number.isFinite(Number(n))).map(Number)
  return numeros.length > 0 ? Math.max(...numeros) + 1 : 1
}

/** Crea un pedido vacío. El número, la fecha y la hora los pone el backend. */
export const crearPedido = async () => aPedidoUi(await http.post(RUTA, {}))

/** Reemplaza las líneas del pedido (añadir, quitar o cambiar cantidades). */
export const guardarItems = async (pedido, items) =>
  aPedidoUi(await http.put(`${RUTA}/${pedido.id}/items`, { items: items.map(aItemApi) }))

/**
 * Une al pedido los productos elegidos en el catálogo: si el producto ya estaba (mismo plato
 * y mismo combo), suma la cantidad; si no, añade una línea nueva. No modifica `items`.
 */
export const combinarItems = (items, elegidos) => {
  const nuevos = items.map((item) => ({ ...item }))
  elegidos.forEach((elegido) => {
    const existente = nuevos.find((item) => item.name === elegido.name)
    if (existente) existente.qty += elegido.qty
    else nuevos.push({ ...elegido })
  })
  return nuevos
}

/**
 * Factura el pedido: registra su venta. El backend descuenta el inventario (400 con el detalle
 * de lo que falta si no alcanza) y marca el pedido como "Finalizado". Devuelve la venta lista
 * para el tiquete. `responsable` ya no se envía: el backend usa el usuario de la sesión.
 */
export const facturarPedido = async (pedido) => aVentaUi(await http.post(RUTA_VENTAS, { orderId: pedido.id }))

/**
 * Cambia el estado del pedido. Reabrir un pedido resuelto invalida su venta: con `borrarVenta`
 * se elimina antes (el backend devuelve los insumos y deja el pedido en "Listo").
 */
export const cambiarEstado = async (pedido, estado, { borrarVenta = false } = {}) => {
  if (borrarVenta) await eliminarVentasDePedido(pedido)
  await http.patch(`${RUTA}/${pedido.id}`, { estado: ESTADO_API[estado] ?? estado })
}

/**
 * Quita el pedido de la lista.
 * - Sin venta: se CANCELA (cualquier persona del personal puede hacerlo).
 * - Con venta: se elimina la venta (devuelve los insumos) y luego el pedido. El backend solo
 *   se lo permite a administración.
 */
export const eliminarPedido = async (pedido) => {
  if (pedido.estado !== 'resuelto') {
    await http.patch(`${RUTA}/${pedido.id}`, { estado: 'Cancelado' })
    return
  }
  await eliminarVentasDePedido(pedido)
  await http.delete(`${RUTA}/${pedido.id}`)
}

/**
 * Reparte el total de unidades vendidas por categoría para el gráfico de torta.
 * Un producto vendido que ya no está en la carta cae en "Otros".
 */
export function calcularVentasPorCategoria(pedidos, categorias) {
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

  // De mayor a menor: la torta se lee de un vistazo y el primer tramo es el que importa.
  const tramos = Object.entries(totales)
    .sort((a, b) => b[1] - a[1])
    .map(([nombre, cantidad], posicion) => {
      const inicio = acumulado
      acumulado += (cantidad / total) * 100
      return {
        nombre,
        cantidad,
        // Color por posición y no por nombre: dos categorías parecidas tendrían el mismo tono.
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
