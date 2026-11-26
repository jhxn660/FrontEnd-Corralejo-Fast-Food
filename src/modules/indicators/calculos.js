// Indicadores calculados a partir de las ventas y las valoraciones: SIN React y SIN red.
// Cada venta nueva o corregida cambia las cifras en la siguiente lectura.

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** "2026-11" → "noviembre 2026". */
export const nombreMes = (clave) => {
  const [año, mes] = String(clave).split('-').map(Number)
  return `${MESES[mes - 1] ?? '?'} ${año}`
}

export const claveMes = (fecha = new Date()) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`

/** Mes anterior a una clave "YYYY-MM". */
export const mesAnterior = (clave) => {
  const [año, mes] = clave.split('-').map(Number)
  return mes === 1 ? `${año - 1}-12` : `${año}-${String(mes - 1).padStart(2, '0')}`
}

const mesDe = (venta) => String(venta.date ?? '').slice(0, 7)
const añoDe = (venta) => String(venta.date ?? '').slice(0, 4)

/** Una venta cancelada no es ingreso: no cuenta en ningún indicador. */
export const ventasValidas = (ventas) => ventas.filter((venta) => venta.status !== 'Cancelado')

/** Meses con ventas más el actual, del más reciente al más antiguo. */
export const mesesDisponibles = (ventas, hoy = new Date()) =>
  [...new Set([claveMes(hoy), ...ventas.map(mesDe).filter(Boolean)])].sort().reverse()

const unidadesDe = (venta) =>
  (venta.items ?? []).reduce((suma, item) => suma + (Number(item.quantity) || 0), 0)

const resumen = (ventas) => {
  const total = ventas.reduce((suma, venta) => suma + (Number(venta.total) || 0), 0)
  const cantidad = ventas.length
  return {
    total,
    cantidad,
    unidades: ventas.reduce((suma, venta) => suma + unidadesDe(venta), 0),
    ticketPromedio: cantidad > 0 ? Math.round(total / cantidad) : 0,
  }
}

export const resumenMes = (ventas, clave) => resumen(ventas.filter((v) => mesDe(v) === clave))

/** Variación porcentual de `anterior` a `actual`; null si no hay base. */
export const variacion = (actual, anterior) =>
  anterior > 0 ? Math.round(((actual - anterior) / anterior) * 1000) / 10 : null

/** Ingreso de cada día del mes, para la gráfica de barras. */
export const ventasPorDia = (ventas, clave) => {
  const [año, mes] = clave.split('-').map(Number)
  const dias = new Date(año, mes, 0).getDate()
  const porDia = Array.from({ length: dias }, (_, i) => ({ dia: i + 1, total: 0, cantidad: 0 }))
  ventas
    .filter((venta) => mesDe(venta) === clave)
    .forEach((venta) => {
      const dia = Number(String(venta.date).slice(8, 10))
      if (porDia[dia - 1]) {
        porDia[dia - 1].total += Number(venta.total) || 0
        porDia[dia - 1].cantidad += 1
      }
    })
  return porDia
}

/** Cantidad e ingreso por producto en un conjunto de ventas. */
const agruparProductos = (ventas) => {
  const productos = new Map()
  ventas.forEach((venta) =>
    (venta.items ?? []).forEach((item) => {
      const actual = productos.get(item.product) ?? { cantidad: 0, ingreso: 0 }
      actual.cantidad += Number(item.quantity) || 0
      actual.ingreso += Number(item.price) || 0
      productos.set(item.product, actual)
    })
  )
  return productos
}

const porcentaje = (parte, total) => (total > 0 ? Math.round((parte / total) * 1000) / 10 : 0)

/**
 * Tabla de productos: mes elegido y año de ese mes, con participación sobre el
 * ingreso. Se ordena por el ingreso anual, que es el dato estable; el mensual
 * oscila demasiado en los primeros días del mes.
 */
export const indicadoresPorProducto = (ventas, clave, limite = 10) => {
  const año = clave.slice(0, 4)
  const delMes = agruparProductos(ventas.filter((v) => mesDe(v) === clave))
  const delAño = agruparProductos(ventas.filter((v) => añoDe(v) === año))
  const totalMes = [...delMes.values()].reduce((s, p) => s + p.ingreso, 0)
  const totalAño = [...delAño.values()].reduce((s, p) => s + p.ingreso, 0)

  return [...delAño.entries()]
    .sort((a, b) => b[1].ingreso - a[1].ingreso)
    .slice(0, limite)
    .map(([nombre, anual]) => {
      const mensual = delMes.get(nombre) ?? { cantidad: 0, ingreso: 0 }
      return {
        nombre,
        mensual: { ...mensual, participacion: porcentaje(mensual.ingreso, totalMes) },
        anual: { ...anual, participacion: porcentaje(anual.ingreso, totalAño) },
      }
    })
}

/** Los más vendidos del año por unidades, con su parte del total de unidades. */
export const ranking = (ventas, año, limite = 5) => {
  const productos = agruparProductos(ventas.filter((v) => añoDe(v) === String(año)))
  const totalUnidades = [...productos.values()].reduce((s, p) => s + p.cantidad, 0)
  return [...productos.entries()]
    .sort((a, b) => b[1].cantidad - a[1].cantidad)
    .slice(0, limite)
    .map(([nombre, datos], indice) => ({
      posicion: indice + 1,
      nombre,
      ...datos,
      participacion: porcentaje(datos.cantidad, totalUnidades),
    }))
}

/**
 * VALORACIÓN MEDIA POR PRODUCTO, a partir de los comentarios con QR (cada uno trae la nota del
 * cliente y los productos de esa compra).
 * La nota es del pedido, no del plato: cuenta una vez por cada producto del tiquete, así que
 * `reseñas` es el número de tickets en los que apareció. Los comentarios sin QR no puntúan, y
 * la moderación no interviene (se modera el texto, no la nota).
 */
export const valoracionesPorProducto = (valoraciones, limite = 5) => {
  const productos = new Map()

  valoraciones
    .filter((valoracion) => Boolean(valoracion.qr) && Number(valoracion.estrellas) > 0)
    .forEach((valoracion) =>
      (valoracion.productos ?? []).forEach((item) => {
        const actual = productos.get(item.producto) ?? { suma: 0, reseñas: 0 }
        actual.suma += Number(valoracion.estrellas)
        actual.reseñas += 1
        productos.set(item.producto, actual)
      })
    )

  return [...productos.entries()]
    .map(([nombre, { suma, reseñas }]) => ({
      nombre,
      reseñas,
      puntuacion: Math.round((suma / reseñas) * 10) / 10,
    }))
    .sort((a, b) => b.puntuacion - a.puntuacion || b.reseñas - a.reseñas)
    .slice(0, limite)
}

/** Avance de la meta anual con las ventas de ese año. */
export const avanceMeta = (ventas, año, meta) => {
  const vendido = resumen(ventas.filter((v) => añoDe(v) === String(año))).total
  return {
    vendido,
    meta,
    porcentaje: meta > 0 ? Math.min(100, Math.round((vendido / meta) * 1000) / 10) : 0,
    restante: Math.max(0, meta - vendido),
  }
}

export const MESES_CORTOS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
]

/**
 * Años que se pueden comparar: los que tienen ventas, más el actual y el
 * anterior (para que la comparativa siempre tenga dos opciones).
 */
export const añosDisponibles = (ventas, hoy = new Date()) =>
  [
    ...new Set([
      String(hoy.getFullYear()),
      String(hoy.getFullYear() - 1),
      ...ventas.map(añoDe).filter((año) => /^\d{4}$/.test(año)),
    ]),
  ]
    .sort()
    .reverse()

/** Ingreso de cada uno de los doce meses de un año. */
export const ventasPorMesDelAño = (ventas, año) => {
  const meses = Array.from({ length: 12 }, () => 0)
  ventas
    .filter((venta) => añoDe(venta) === String(año))
    .forEach((venta) => {
      const mes = Number(String(venta.date).slice(5, 7))
      if (mes >= 1 && mes <= 12) meses[mes - 1] += Number(venta.total) || 0
    })
  return meses
}
