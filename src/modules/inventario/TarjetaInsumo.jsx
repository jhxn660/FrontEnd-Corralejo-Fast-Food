import { moneda } from '../../utils/format'
import { abreviatura, colorDe, diasParaVencer, iconoDe, nivelDe, porcentajeStock } from './esquema'

/**
 * Tarjeta compacta de un insumo: cuatro caben a lo ancho en escritorio.
 *
 * QUÉ ENTRA Y QUÉ NO
 * Antes cada insumo ocupaba una fila entera con sus ocho campos desplegados, y
 * cuatro insumos llenaban la pantalla. Aquí solo se muestra lo que se mira de
 * un vistazo al recorrer el almacén —qué es, cuánto queda y si hay que
 * reponer—; el resto (costo, vencimiento, peso, calorías, proveedor) vive en el
 * detalle, a un clic.
 *
 * La barra de stock es el dato principal: dice en un gesto lo que tres líneas
 * de texto decían leyendo.
 */
export default function TarjetaInsumo({ insumo, onAbrir, onEditar, onEliminar }) {
  const nivel = nivelDe(insumo)
  const porcentaje = porcentajeStock(insumo)
  const unidad = abreviatura(insumo.unidad)
  const dias = diasParaVencer(insumo.vencimiento)
  const porVencer = dias !== null && dias <= 30

  return (
    <div className="col">
      <article
        className="card h-100 border-0 shadow-sm card-clickable cinta-superior"
        style={{ '--color-cinta': colorDe(insumo.categoria) }}
        role="button"
        tabIndex={0}
        aria-label={`Ver detalle de ${insumo.nombre}`}
        onClick={() => onAbrir(insumo)}
        onKeyDown={(evento) => {
          if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault()
            onAbrir(insumo)
          }
        }}
      >
        <div className="card-body p-3 d-flex flex-column">
          <div className="d-flex align-items-start gap-2 mb-2">
            <div
              className="icon-tile icon-tile-sm d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ background: colorDe(insumo.categoria) }}
            >
              <i className={iconoDe(insumo.categoria)} />
            </div>
            <div className="min-width-0 flex-grow-1">
              <h3 className="fw-bold mb-0 recorte-2" style={{ fontSize: '0.95rem' }}>
                {insumo.nombre}
              </h3>
              <small className="text-secondary">{insumo.categoria}</small>
            </div>
          </div>

          <div className="mt-auto">
            <div className="d-flex justify-content-between align-items-baseline mb-1">
              <span className="fw-bold">
                {insumo.stockActual} <small className="text-secondary fw-normal">{unidad}</small>
              </span>
              <small className="text-secondary">mín. {insumo.stockMinimo}</small>
            </div>

            <div
              className="progress mb-2"
              style={{ height: 6 }}
              role="img"
              aria-label={`${nivel.etiqueta}: ${insumo.stockActual} de un mínimo de ${insumo.stockMinimo} ${unidad}`}
            >
              <div className={`progress-bar bg-${nivel.color}`} style={{ width: `${porcentaje}%` }} />
            </div>

            <div className="d-flex flex-wrap align-items-center gap-1">
              <span className={`badge bg-${nivel.color}`} style={{ fontSize: '0.68rem' }}>
                {nivel.etiqueta}
              </span>
              {porVencer && (
                <span className="badge bg-warning text-dark" style={{ fontSize: '0.68rem' }}>
                  <i className="fa-solid fa-hourglass-half me-1" />
                  {dias < 0 ? 'Vencido' : `${dias} d`}
                </span>
              )}
              <span className="ms-auto small fw-semibold text-brand">
                {moneda(insumo.costo)}
              </span>
            </div>
          </div>
        </div>

        {/* Los botones no deben disparar el clic de la tarjeta: cada uno detiene
            la propagación para que editar no abra también el detalle. */}
        <div className="card-footer bg-transparent p-2 d-flex gap-1">
          <button
            className="btn btn-sm btn-outline-secondary flex-grow-1"
            onClick={(evento) => {
              evento.stopPropagation()
              onAbrir(insumo)
            }}
          >
            <i className="fa-solid fa-eye me-1" />
            Detalle
          </button>
          <button
            className="btn btn-sm btn-outline-primary"
            aria-label={`Editar ${insumo.nombre}`}
            onClick={(evento) => {
              evento.stopPropagation()
              onEditar(insumo)
            }}
          >
            <i className="fa-solid fa-pen" />
          </button>
          <button
            className="btn btn-sm btn-outline-danger"
            aria-label={`Eliminar ${insumo.nombre}`}
            onClick={(evento) => {
              evento.stopPropagation()
              onEliminar(insumo)
            }}
          >
            <i className="fa-solid fa-trash-can" />
          </button>
        </div>
      </article>
    </div>
  )
}
