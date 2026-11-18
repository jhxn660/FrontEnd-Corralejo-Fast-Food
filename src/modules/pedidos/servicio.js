// LÓGICA DE NEGOCIO DEL MÓDULO DE PEDIDOS.
//
// Por qué existe este archivo: la pantalla (Pedidos.jsx) solo debe decidir QUÉ
// se ve y qué pasa al pulsar un botón. CÓMO se crea, se factura o se elimina un
// pedido —qué colecciones se tocan y en qué orden— es una regla del negocio, y
// vive aquí. Así la regla se lee y se cambia sin recorrer 500 líneas de JSX.
//
// Flujo de datos:  Pedidos.jsx ─▶ servicio.js ─▶ services/api.js ─▶ json-server
//
// Dos colecciones entran en juego: `pedidos` y `sales`. Un pedido "resuelto"
// SIEMPRE tiene una venta, y una venta solo existe mientras su pedido siga
// resuelto; las funciones de abajo son las que mantienen esa regla.

import { api } from '../../services/api'
import { COLOR_SIN_CATEGORIA, PALETA_CATEGORIAS } from '../../data/graficas'
import { fechaISO, hora12 } from '../../utils/format'
import { menuApi, productosVendibles } from '../menu/api'
import { construirVenta, eliminarVentasDePedido } from '../ventas/servicio'

/** Número visible del pedido. Los pedidos antiguos no tienen `numero`: se usa su id. */
export const numeroDe = (pedido) => pedido?.numero ?? pedido?.id

/**
 * Lo que la pantalla necesita para pintarse: los pedidos (del más nuevo al más
 * antiguo) y el catálogo de productos que se pueden añadir.
 * El catálogo es la carta del administrador (R25: una sola fuente).
 */
export const cargarPedidos = async () => {
  const [pedidos, { categorias }] = await Promise.all([
    api.list('pedidos'),
    menuApi.listarCategorias({ soloDisponibles: true }),
  ])
  return {
    pedidos: [...pedidos].sort((a, b) => Number(numeroDe(b)) - Number(numeroDe(a))),
    catalogo: productosVendibles(categorias),
  }
}

/** Siguiente consecutivo: el mayor número existente + 1 (1 si no hay ninguno). */
export const siguienteNumero = (pedidos) => {
  const numeros = pedidos
    .map(numeroDe)
    .filter((n) => /^\d+$/.test(String(n)))
    .map(Number)
  return numeros.length > 0 ? Math.max(...numeros) + 1 : 1
}

/** Crea un pedido vacío con la fecha y la hora del momento. */
export const crearPedido = (numero) => {
  const ahora = new Date()
  return api.create('pedidos', {
    numero,
    estado: 'pendiente',
    fecha: fechaISO(ahora),
    hora: hora12(ahora),
    items: [],
  })
}

/** Reemplaza las líneas del pedido (añadir, quitar o cambiar cantidades). */
export const guardarItems = (pedido, items) =>
  api.update('pedidos', pedido.id, { ...pedido, items })

/**
 * Une al pedido los productos elegidos en el catálogo: si el producto ya
 * estaba, suma la cantidad; si no, añade una línea nueva. No modifica `items`.
 */
export const combinarItems = (items, elegidos) => {
  const nuevos = items.map((item) => ({ ...item }))
  elegidos.forEach((elegido) => {
    const existente = nuevos.find((item) => item.name === elegido.name)
    if (existente) existente.qty += elegido.qty
    else nuevos.push({ name: elegido.name, price: elegido.price, qty: elegido.qty })
  })
  return nuevos
}

/**
 * Factura el pedido: genera su venta y lo marca como resuelto. Devuelve la venta.
 * `responsable` es quien factura (queda en la venta y sale en el ticket).
 */
export const facturarPedido = async (pedido, responsable) => {
  const ventas = await api.list('sales')
  const numeroPedido = numeroDe(pedido)

  // Si el pedido ya tenía venta no se duplica: se reutiliza la existente.
  let venta = ventas.find((s) => s.pedidoId === pedido.id || s.orderId === `#P-${numeroPedido}`)
  if (!venta) {
    venta = await api.create('sales', construirVenta(pedido, ventas, numeroPedido, responsable))
  }

  await api.update('pedidos', pedido.id, { ...pedido, estado: 'resuelto' })
  return venta
}

/**
 * Cambia el estado del pedido. Reabrir un pedido resuelto invalida su venta:
 * con `borrarVenta` se elimina antes de guardar el estado nuevo.
 */
export const cambiarEstado = async (pedido, estado, { borrarVenta = false } = {}) => {
  if (borrarVenta) await eliminarVentasDePedido(pedido, numeroDe(pedido))
  await api.update('pedidos', pedido.id, { ...pedido, estado })
}

/** Elimina el pedido y, si la tenía, su venta. */
export const eliminarPedido = async (pedido) => {
  // Primero la venta: si falla, el pedido no se borra y nada queda inconsistente.
  await eliminarVentasDePedido(pedido, numeroDe(pedido))
  await api.remove('pedidos', pedido.id).catch(() => null)
}

/**
 * Reparte el total de unidades vendidas por categoría para el gráfico de torta.
 * Las categorías son las de la carta del administrador: un producto vendido
 * que ya no está en la carta cae en "Otros".
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
