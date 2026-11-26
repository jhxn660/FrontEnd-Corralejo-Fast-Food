// Disponibilidad dentro de un pedido que se está armando.
//
// recetasApi.disponibilidad() dice qué gasta cada producto y cuánto hay de cada insumo. Al
// armar un pedido eso no basta: 3 hamburguesas y 2 perros comparten pan o salsa. Aquí se
// descuenta del stock lo que ya lleva el pedido (y lo elegido en el catálogo) y se recalcula
// con las fórmulas de recipes/calculos.js, las mismas que aplica el backend al vender.

import { consumoDe, faltantesDe, redondear, unidadesPosibles } from '../recipes/calculos'

/** Sin datos de inventario (no se pudieron leer): nada se limita en pantalla. */
const SIN_DATOS = {
  conDatos: false,
  controlado: () => false,
  cuantasMas: () => null,
  faltantes: () => [],
  limitante: () => null,
}

/**
 * @param {{ productos: Array, insumos: Object } | null} disponibilidad  ver recetasApi.disponibilidad
 * @returns funciones para consultar el pedido en curso
 */
export function crearSimulador(disponibilidad) {
  if (!disponibilidad?.productos) return SIN_DATOS

  const porNombre = new Map(disponibilidad.productos.map((producto) => [producto.nombre, producto]))
  const recetaDe = (nombre) => porNombre.get(nombre)?.receta ?? []
  const insumoDe = (id) => disponibilidad.insumos?.[id]

  const consumoDeLineas = (lineas) =>
    consumoDe(lineas.map((linea) => ({ receta: recetaDe(linea.name), cantidad: linea.qty })))

  return {
    conDatos: true,

    /** ¿Lo limita el inventario? Un plato sin receta, no. */
    controlado: (nombre) => recetaDe(nombre).length > 0,

    /**
     * Cuántas unidades MÁS de `nombre` caben, además de `lineas`.
     * null = sin receta (no se limita).
     */
    cuantasMas: (nombre, lineas = []) => {
      const consumo = consumoDeLineas(lineas)
      return unidadesPosibles(recetaDe(nombre), (id) =>
        redondear((insumoDe(id)?.stockActual ?? 0) - (consumo.get(id) ?? 0))
      )
    },

    /** Insumos que no alcanzan para todo el pedido. Vacío = se puede facturar. */
    faltantes: (lineas) => faltantesDe(consumoDeLineas(lineas), insumoDe),

    /** El insumo que pone el techo de un plato (para explicar un "Agotado"). */
    limitante: (nombre) => porNombre.get(nombre)?.limitante ?? null,
  }
}
