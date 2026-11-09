import { http } from '../../services/http'
import { aPayloadPedido } from './calculos'

const RUTAS = {
  pedidos: '/pedidos',
  cotizar: '/pedidos/cotizar', // RNF-04: preview autoritativo cuando haga falta
  catalogo: '/catalogo',
}

/**
 * ADAPTADOR. La colección guarda las líneas como `{name, price, qty}` sin id de
 * producto; el contrato trabaja con `productoId`. Hasta que el back lo exponga
 * se usa el nombre como identidad —es lo único estable que hay— y queda
 * marcado con `idProvisional` para que la migración sea un grep, no una
 * cacería.
 */
export const aPedidoUi = (crudo) => ({
  id: crudo.id,
  numero: crudo.numero ?? crudo.id,
  estado: crudo.estado ?? 'pendiente',
  hora: crudo.hora ?? null,
  version: crudo.version ?? null,
  total: crudo.total ?? null, // null = lo calcula el front hasta que el back lo mande
  items: (crudo.items ?? []).map((item) => ({
    productoId: item.productoId ?? item.name,
    idProvisional: item.productoId === undefined,
    nombre: item.name ?? item.nombre,
    precioUnitario: Number(item.price ?? item.precioUnitario) || 0,
    cantidad: Number(item.qty ?? item.cantidad) || 0,
  })),
})

/**
 * Forma heredada que json-server todavía espera. Se mantiene aparte de
 * `aPayloadPedido()` a propósito: ese es el payload del CONTRATO (solo
 * productoId y cantidad) y es el que debe sobrevivir. Esta función es el
 * puente temporal, y es la única que conoce `name/price/qty`.
 */
const aItemsHeredados = (lineas = []) =>
  lineas.map((l) => ({ name: l.nombre, price: l.precioUnitario, qty: l.cantidad }))

export const aProductosUi = (catalogoCrudo) =>
  Object.entries(catalogoCrudo ?? {})
    .filter(([, valor]) => Array.isArray(valor))
    .flatMap(([categoria, productos]) =>
      productos.map((p) => ({
        productoId: p.id ?? p.name,
        categoria,
        nombre: p.name ?? p.nombre,
        descripcion: p.desc ?? p.descripcion ?? '',
        precioUnitario: Number(p.price ?? p.precio) || 0,
        emoji: p.emoji ?? null,
      }))
    )

export const pedidosApi = {
  listar: async ({ estado, senal } = {}) => {
    const { datos, total } = await http.lista(RUTAS.pedidos, { query: { estado }, senal })
    return { pedidos: datos.map(aPedidoUi), total }
  },

  catalogo: async ({ senal } = {}) => aProductosUi(await http.get(RUTAS.catalogo, { senal })),

  /**
   * Crear. Se envían las dos formas mientras conviven los dos backends: el
   * payload del contrato (`items: [{productoId, cantidad}]`) y los campos
   * heredados que json-server necesita para que la pantalla siga mostrando
   * nombres y precios. Cuando el back real entre, se borra la segunda línea.
   */
  crear: async (lineas) => {
    const payload = aPayloadPedido(lineas)
    return aPedidoUi(
      await http.post(RUTAS.pedidos, {
        ...payload,
        items: aItemsHeredados(lineas), // TEMPORAL: forma de json-server
      })
    )
  },

  /** Guardar una edición. `version` habilita el bloqueo optimista (RNF-12). */
  actualizar: async (id, lineas, { version } = {}) =>
    aPedidoUi(
      await http.put(`${RUTAS.pedidos}/${id}`, {
        ...aPayloadPedido(lineas),
        items: aItemsHeredados(lineas), // TEMPORAL
        ...(version ? { version } : {}),
      })
    ),

  /**
   * Cambio de estado. Pasar a `resuelto` debe generar la venta en la MISMA
   * transacción del servidor: hoy la pantalla hace tres llamadas sueltas
   * (buscar venta, crearla, marcar el pedido) y si falla la segunda el pedido
   * queda resuelto sin venta.
   */
  cambiarEstado: async (id, estado, { version } = {}) =>
    aPedidoUi(
      await http.patch(`${RUTAS.pedidos}/${id}/estado`, {
        estado,
        ...(version ? { version } : {}),
      })
    ),

  eliminar: (id) => http.delete(`${RUTAS.pedidos}/${id}`),

  /** Total autoritativo sin crear el pedido, para confirmar el preview local. */
  cotizar: async (lineas, { senal } = {}) =>
    http.post(RUTAS.cotizar, aPayloadPedido(lineas), { senal }),
}
