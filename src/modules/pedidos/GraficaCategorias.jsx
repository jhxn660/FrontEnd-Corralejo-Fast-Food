import { numero } from '../../utils/format'
import { Vacio } from '../../components/ui/Estado'

/**
 * Reparto de unidades vendidas por categoría.
 *
 * POR QUÉ MARCABA 100%
 * El reparto se calcula cruzando el nombre de cada producto vendido con el
 * catálogo, para saber a qué categoría pertenece. El catálogo llegaba vacío
 * —`api.list('catalogo')` devolvía `[]` sobre un objeto que no es una
 * colección—, así que NINGÚN producto encontraba su categoría y todos caían en
 * el cajón "Otros": un único tramo gris al 100%. La gráfica estaba bien; el
 * dato de entrada no.
 *
 * Con el catálogo cargado hay un tramo por categoría. La torta lleva el total
 * de unidades en el centro y cada tramo su porcentaje y su cantidad, porque un
 * porcentaje sin la cifra que lo produce no se puede verificar.
 */
export default function GraficaCategorias({ reparto }) {
  if (reparto.total === 0) {
    return (
      <Vacio
        texto="Aún no hay pedidos resueltos: el reparto aparece al finalizar el primero."
        icono="fa-chart-pie"
      />
    )
  }

  const degradado = `conic-gradient(${reparto.tramos
    .map((tramo) => `${tramo.color} ${tramo.desde}% ${tramo.hasta}%`)
    .join(', ')})`

  return (
    <div className="d-flex flex-wrap align-items-center gap-4 w-100">
      <div
        className="pie-chart flex-shrink-0"
        role="img"
        aria-label={`Reparto de ventas por categoría: ${reparto.tramos
          .map((tramo) => `${tramo.nombre}, ${tramo.porcentaje.toFixed(1)}%`)
          .join('; ')}`}
        style={{ background: degradado }}
      >
        <div className="pie-centro">
          <span className="d-block fw-bold fs-4">{numero(reparto.total)}</span>
          <span className="d-block text-secondary" style={{ fontSize: '0.7rem' }}>
            unidades
          </span>
        </div>
      </div>

      <ul className="list-unstyled small mb-0 flex-grow-1 min-width-0">
        {reparto.tramos.map((tramo) => (
          <li className="mb-2" key={tramo.nombre}>
            <div className="d-flex align-items-center gap-2 mb-1">
              <span
                className="d-inline-block rounded-circle flex-shrink-0"
                style={{ width: 12, height: 12, background: tramo.color }}
                aria-hidden="true"
              />
              <span className="flex-grow-1 min-width-0 text-truncate">{tramo.nombre}</span>
              <span className="text-secondary">{numero(tramo.cantidad)} u</span>
              <strong style={{ minWidth: '3.2rem', textAlign: 'right' }}>
                {tramo.porcentaje.toFixed(1)}%
              </strong>
            </div>
            <div className="progress" style={{ height: 4 }}>
              <div
                className="progress-bar"
                style={{ width: `${tramo.porcentaje}%`, background: tramo.color }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
