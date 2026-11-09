// Lógica matemática del pedido. SIN React, SIN store, SIN fetch: funciones
// puras que reciben datos y devuelven datos.
//
// Por qué vive aquí y no en el componente:
// - RNF-04 exige recalcular en <500ms. Eso se consigue calculando en memoria,
//   no pidiéndolo al servidor; pero si el cálculo está dentro del JSX se
//   reejecuta en cada render y no se puede probar sin montar la pantalla.
// - El mismo total lo necesitan el modal del catálogo, la fila del pedido y la
//   venta. Tres copias del cálculo son tres oportunidades de divergir.
//
// Dinero en enteros: el peso colombiano no usa centavos en la práctica y los
// precios llegan como enteros (8000, 12000). Nunca se usan flotantes para
// dinero: 0.1 + 0.2 !== 0.3, y un redondeo distinto entre front y back es una
// diferencia en el ticket que el cliente ve.

export const LIMITE_CANTIDAD = 99

const entero = (valor) => {
  const n = Math.trunc(Number(valor))
  return Number.isFinite(n) ? n : 0
}

export const normalizarCantidad = (cantidad) =>
  Math.min(LIMITE_CANTIDAD, Math.max(0, entero(cantidad)))

/** Subtotal de una línea: precio unitario × cantidad. */
export const subtotalLinea = (linea) =>
  entero(linea?.precioUnitario) * normalizarCantidad(linea?.cantidad)

/**
 * Totales del pedido. Devuelve también `unidades` porque el encabezado los
 * muestra y recorrer el array dos veces no aporta nada.
 *
 * `descuento` se acepta como cantidad fija en pesos, no como porcentaje: un
 * porcentaje obliga a decidir un redondeo, y esa decisión es del back (es la
 * que acaba en la factura).
 */
export const calcularTotales = (lineas = [], { descuento = 0 } = {}) => {
  const resumen = lineas.reduce(
    (acumulado, linea) => {
      const cantidad = normalizarCantidad(linea.cantidad)
      return {
        subtotal: acumulado.subtotal + subtotalLinea(linea),
        unidades: acumulado.unidades + cantidad,
        lineas: acumulado.lineas + (cantidad > 0 ? 1 : 0),
      }
    },
    { subtotal: 0, unidades: 0, lineas: 0 }
  )

  const descuentoAplicado = Math.min(entero(descuento), resumen.subtotal)

  return {
    ...resumen,
    descuento: descuentoAplicado,
    total: resumen.subtotal - descuentoAplicado,
  }
}

/** Añade o acumula una línea. Devuelve un array nuevo: nunca muta la entrada. */
export const agregarLinea = (lineas, producto, cantidad = 1) => {
  const suma = normalizarCantidad(cantidad)
  if (suma === 0) return lineas

  const existente = lineas.find((l) => l.productoId === producto.productoId)
  if (!existente) return [...lineas, { ...producto, cantidad: suma }]

  return lineas.map((l) =>
    l.productoId === producto.productoId
      ? { ...l, cantidad: normalizarCantidad(l.cantidad + suma) }
      : l
  )
}

/** Cambiar a 0 elimina la línea: deja el carrito sin filas fantasma. */
export const cambiarCantidadLinea = (lineas, productoId, cantidad) => {
  const nueva = normalizarCantidad(cantidad)
  if (nueva === 0) return lineas.filter((l) => l.productoId !== productoId)
  return lineas.map((l) => (l.productoId === productoId ? { ...l, cantidad: nueva } : l))
}

export const quitarLinea = (lineas, productoId) =>
  lineas.filter((l) => l.productoId !== productoId)

/**
 * PAYLOAD PARA EL BACKEND. Solo viajan `productoId` y `cantidad`.
 *
 * Deliberadamente NO se envían precios ni totales: si el cliente los manda, el
 * cliente fija lo que se cobra. El back resuelve el precio vigente de cada
 * producto y devuelve el total autoritativo, que la UI repinta encima del
 * calculado localmente. El cálculo local es para que el usuario vea la cifra al
 * instante (RNF-04), no para decidir cuánto se cobra.
 */
export const aPayloadPedido = (lineas = []) => ({
  items: lineas
    .filter((l) => normalizarCantidad(l.cantidad) > 0)
    .map((l) => ({ productoId: l.productoId, cantidad: normalizarCantidad(l.cantidad) })),
})

/**
 * Compara el total calculado en el navegador con el que devolvió el servidor.
 * Si difieren, manda el del servidor y se avisa: significa que un precio
 * cambió mientras el pedido estaba abierto. Silenciar esto es cómo se cobran
 * importes distintos a los que el cliente vio en pantalla.
 */
export const conciliarTotal = (totalLocal, totalServidor) => ({
  total: entero(totalServidor),
  divergente: entero(totalLocal) !== entero(totalServidor),
  diferencia: entero(totalServidor) - entero(totalLocal),
})
