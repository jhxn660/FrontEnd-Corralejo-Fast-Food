// Disponibilidad dentro de un pedido que se está armando.
//
// El servidor dice cuántas unidades caben de cada plato POR SEPARADO. Al armar
// un pedido eso no basta: 3 hamburguesas y 2 perros comparten pan, papa o
// salsa, así que añadir unas reduce lo que queda para los otros. Aquí se
// descuenta del stock lo que ya lleva el pedido (y lo elegido en el catálogo)
// y se recalcula con la MISMA fórmula que usa el servidor al facturar.

import {
  consumoDe,
  faltantesDe,
  nombreBase,
  redondear,
  unidadesPosibles,
} from '../inventario/recetas'

/** Sin datos de inventario (servidor apagado): nada se limita en pantalla. */
const SIN_DATOS = {
  conDatos: false,
  controlado: () => false,
  cuantasMas: () => null,
  faltantes: () => [],
  limitante: () => null,
}

/**
 * @param {{ productos: Array, insumos: Object } | null} disponibilidad  respuesta del servidor
 * @returns funciones para consultar el pedido en curso
 */
export function crearSimulador(disponibilidad) {
  if (!disponibilidad?.productos) return SIN_DATOS

  const porNombre = new Map(disponibilidad.productos.map((producto) => [producto.nombre, producto]))
  const recetaDe = (nombre) => porNombre.get(nombreBase(nombre))?.receta ?? []
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
    limitante: (nombre) => porNombre.get(nombreBase(nombre))?.limitante ?? null,
  }
}
