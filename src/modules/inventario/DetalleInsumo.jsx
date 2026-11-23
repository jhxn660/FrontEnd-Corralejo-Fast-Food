import { moneda } from '../../utils/format'
import Modal from '../../components/ui/Modal'
import {
  abreviatura,
  colorDe,
  diasParaVencer,
  fechaLegible,
  iconoDe,
  nivelDe,
  porcentajeStock,
} from './esquema'

/**
 * Ficha completa de un insumo. Es la contrapartida de la tarjeta compacta: lo
 * que allí no cabe, aquí se muestra entero, y desde aquí se edita o se elimina.
 *
 * El valor inmovilizado (stock × costo) se calcula aquí porque es el dato que
 * una ficha de almacén necesita y la API no manda; es una multiplicación de dos
 * campos que ya están en pantalla, no un dato inventado (R49).
 */
export default function DetalleInsumo({ insumo, onEditar, onEliminar, onCerrar }) {
  const nivel = nivelDe(insumo)
  const unidad = abreviatura(insumo.unidad)
  const dias = diasParaVencer(insumo.vencimiento)

  const inventario = [
    { etiqueta: 'Stock actual', valor: `${insumo.stockActual} ${unidad}`, icono: 'fa-boxes-stacked' },
    { etiqueta: 'Stock mínimo', valor: `${insumo.stockMinimo} ${unidad}`, icono: 'fa-arrow-down-short-wide' },
    { etiqueta: 'Unidad de medida', valor: insumo.unidad, icono: 'fa-ruler' },
    { etiqueta: 'Costo unitario', valor: `${moneda(insumo.costo)} / ${unidad}`, icono: 'fa-tag' },
    {
      etiqueta: 'Valor inmovilizado',
      valor: moneda((Number(insumo.stockActual) || 0) * (Number(insumo.costo) || 0)),
      icono: 'fa-coins',
    },
    { etiqueta: 'Estado', valor: insumo.estado, icono: 'fa-circle-check' },
  ]

  const ficha = [
    { etiqueta: 'Categoría', valor: insumo.categoria, icono: 'fa-layer-group' },
    { etiqueta: 'Proveedor', valor: insumo.proveedor || 'Sin registrar', icono: 'fa-truck' },
    { etiqueta: 'Vencimiento', valor: fechaLegible(insumo.vencimiento), icono: 'fa-calendar-day' },
    { etiqueta: 'Peso por unidad', valor: insumo.pesoUnidad || '---', icono: 'fa-weight-hanging' },
    { etiqueta: 'Calorías / 100 g', valor: insumo.calorias || '---', icono: 'fa-fire' },
  ]

  return (
    <Modal
      titulo={insumo.nombre}
      icono="fa-box-open"
      tamano="modal-lg"
      onClose={onCerrar}
      footer={
        <>
          <button className="btn btn-outline-secondary me-auto" onClick={onCerrar}>
            Cerrar
          </button>
          <button className="btn btn-outline-danger" onClick={() => onEliminar(insumo)}>
            <i className="fa-solid fa-trash-can me-2" />
            Eliminar
          </button>
          <button className="btn btn-primary" onClick={() => onEditar(insumo)}>
            <i className="fa-solid fa-pen me-2" />
            Editar insumo
          </button>
        </>
      }
    >
      <div className="d-flex align-items-start gap-3 mb-3">
        <div
          className="icon-tile d-flex align-items-center justify-content-center flex-shrink-0"
          style={{ background: colorDe(insumo.categoria) }}
        >
          <i className={iconoDe(insumo.categoria)} />
        </div>
        <div className="min-width-0">
          <div className="d-flex flex-wrap gap-2 mb-2">
            <span className={`badge bg-${nivel.color}`}>{nivel.etiqueta}</span>
            <span className="badge bg-secondary">{insumo.categoria}</span>
            {dias !== null && (
              <span className={`badge bg-${dias < 0 ? 'danger' : dias <= 30 ? 'warning text-dark' : 'success'}`}>
                {dias < 0 ? `Vencido hace ${Math.abs(dias)} días` : `Vence en ${dias} días`}
              </span>
            )}
          </div>
          <p className="text-secondary mb-0">{insumo.descripcion || 'Sin descripción.'}</p>
        </div>
      </div>

      <div className="modal-resumen mb-4">
        <div className="d-flex justify-content-between align-items-baseline mb-2">
          <strong className="small text-uppercase">Nivel de existencias</strong>
          <span className="fw-bold">
            {insumo.stockActual} {unidad}
          </span>
        </div>
        <div className="progress" style={{ height: 12 }}>
          <div
            className={`progress-bar bg-${nivel.color}`}
            style={{ width: `${porcentajeStock(insumo)}%` }}
          />
        </div>
        <p className="small text-secondary mb-0 mt-2">
          La barra se llena al alcanzar el doble del mínimo ({Number(insumo.stockMinimo) * 2}{' '}
          {unidad}), que es cuando ya no hace falta reponer.
        </p>
      </div>

      {[
        { titulo: 'Existencias y costo', campos: inventario },
        { titulo: 'Ficha del producto', campos: ficha },
      ].map(({ titulo, campos }) => (
        <section className="mb-4" key={titulo}>
          <h3 className="h6 fw-bold text-uppercase text-secondary mb-3">{titulo}</h3>
          <div className="row g-3">
            {campos.map(({ etiqueta, valor, icono }) => (
              <div className="col-6 col-md-4" key={etiqueta}>
                <div className="border rounded p-2 h-100">
                  <div className="text-secondary small">
                    <i className={`fa-solid ${icono} me-1`} />
                    {etiqueta}
                  </div>
                  <div className="fw-semibold">{valor}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </Modal>
  )
}
