import { useState } from 'react'

import Modal from '../../components/ui/Modal'
import { TIPOS_DIA, fechaLegible } from './calendario'

const ID_FORMULARIO = 'formulario-dia'

/**
 * Alta y edición de un día especial del calendario.
 *
 * QUÉ CAMBIA
 * - El motivo no era obligatorio, así que se podían marcar días en rojo sin
 *   decir por qué: el cliente veía el local cerrado sin explicación.
 * - El selector de tipo era un `btn-group` de dos botones `outline` con la
 *   clase `active`; como ninguno es un control de formulario de verdad, no
 *   anunciaba cuál estaba elegido y con el teclado no se distinguía. Ahora son
 *   dos tarjetas con `aria-pressed` y el color del tipo.
 * - No se veía la fecha elegida escrita en palabras, que es lo que evita
 *   equivocarse de día al teclear.
 */
export default function FormularioDiaEspecial({ dia, enviando, onGuardar, onCerrar }) {
  const [valores, setValores] = useState(dia)
  const [errores, setErrores] = useState({})

  const editando = Boolean(valores.id)
  const tipo = TIPOS_DIA[valores.tipo] ?? TIPOS_DIA.cerrado

  const cambiar = (cambios) => {
    setValores((previos) => ({ ...previos, ...cambios }))
    setErrores({})
  }

  const enviar = (evento) => {
    evento.preventDefault()
    const fallos = {}

    if (!valores.fecha) fallos.fecha = 'Indica la fecha del día especial.'
    if (!valores.motivo?.trim()) {
      fallos.motivo = 'Escribe el motivo: es lo que lee el cliente en el calendario.'
    }

    if (Object.keys(fallos).length > 0) {
      setErrores(fallos)
      return
    }

    onGuardar({ ...valores, motivo: valores.motivo.trim() })
  }

  return (
    <Modal
      titulo={editando ? 'Editar día especial' : 'Añadir día especial'}
      icono="fa-calendar-day"
      descripcion="Los días especiales aparecen marcados en el calendario de los tres paneles."
      cerrarAlPulsarFuera={false}
      onClose={onCerrar}
      footer={
        <>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onCerrar}
            disabled={enviando}
          >
            Cancelar
          </button>
          <button className="btn btn-primary" form={ID_FORMULARIO} type="submit" disabled={enviando}>
            {enviando ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Guardando…
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk me-2" />
                {editando ? 'Guardar cambios' : 'Añadir al calendario'}
              </>
            )}
          </button>
        </>
      }
    >
      {/* Vista previa: la fecha en palabras y el tipo con su color. */}
      <div className="modal-resumen d-flex align-items-center gap-3 mb-4">
        <div
          className={`icon-tile d-flex align-items-center justify-content-center flex-shrink-0 bg-${tipo.color}`}
        >
          <i className={`fa-solid ${tipo.icono}`} />
        </div>
        <div className="min-width-0">
          <strong className="d-block">
            {valores.fecha ? fechaLegible(valores.fecha) : 'Sin fecha elegida'}
          </strong>
          <small className="text-secondary">
            {tipo.etiqueta}
            {valores.motivo?.trim() ? ` · ${valores.motivo.trim()}` : ''}
          </small>
        </div>
      </div>

      <form id={ID_FORMULARIO} className="d-grid gap-4" onSubmit={enviar} noValidate>
        <div>
          <label className="form-label" htmlFor="dia-fecha">
            Fecha
          </label>
          <input
            id="dia-fecha"
            type="date"
            className={`form-control ${errores.fecha ? 'is-invalid' : ''}`}
            value={valores.fecha}
            onChange={(evento) => cambiar({ fecha: evento.target.value })}
            aria-invalid={Boolean(errores.fecha)}
            aria-describedby={errores.fecha ? 'dia-fecha-error' : undefined}
            disabled={enviando}
          />
          {errores.fecha && (
            <div className="invalid-feedback d-block" id="dia-fecha-error" role="alert">
              {errores.fecha}
            </div>
          )}
        </div>

        <fieldset disabled={enviando}>
          <legend className="form-label">Tipo de día</legend>
          <div className="row g-2" role="radiogroup" aria-label="Tipo de día especial">
            {Object.entries(TIPOS_DIA).map(([clave, { etiqueta, icono, ayuda }]) => (
              <div className="col-12 col-sm-6" key={clave}>
                <button
                  type="button"
                  className={`btn w-100 h-100 text-start p-3 ${
                    valores.tipo === clave ? 'btn-primary' : 'btn-outline-secondary'
                  }`}
                  onClick={() => cambiar({ tipo: clave })}
                  aria-pressed={valores.tipo === clave}
                >
                  <span className="d-block fw-bold">
                    <i className={`fa-solid ${icono} me-2`} />
                    {etiqueta}
                  </span>
                  <span className="small">{ayuda}</span>
                </button>
              </div>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="form-label" htmlFor="dia-motivo">
            Motivo
          </label>
          <textarea
            id="dia-motivo"
            className={`form-control ${errores.motivo ? 'is-invalid' : ''}`}
            rows="3"
            maxLength={160}
            placeholder={
              valores.tipo === 'cerrado'
                ? 'Ej. Cierre por Nochebuena.'
                : 'Ej. Noche de hamburguesas 2x1.'
            }
            value={valores.motivo}
            onChange={(evento) => cambiar({ motivo: evento.target.value })}
            aria-invalid={Boolean(errores.motivo)}
            aria-describedby={errores.motivo ? 'dia-motivo-error' : 'dia-motivo-ayuda'}
            disabled={enviando}
          />
          {errores.motivo ? (
            <div className="invalid-feedback d-block" id="dia-motivo-error" role="alert">
              {errores.motivo}
            </div>
          ) : (
            <div className="form-text" id="dia-motivo-ayuda">
              Aparece al pasar el cursor sobre el día y en la lista del mes.
            </div>
          )}
        </div>
      </form>
    </Modal>
  )
}
