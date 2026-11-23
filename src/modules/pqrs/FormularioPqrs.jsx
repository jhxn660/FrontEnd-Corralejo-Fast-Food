import { useState } from 'react'

import Modal from '../../components/ui/Modal'
import {
  ESTADOS,
  LARGO_MAXIMO_TEXTO,
  NOMBRES_TIPO,
  ayudaDe,
  colorDe,
  hayFallos,
  iconoDe,
  validarPqrs,
} from './esquema'

const ID_FORMULARIO = 'formulario-pqrs'

/**
 * Alta y edición de una PQRS. Un solo formulario para los dos paneles: el del
 * empleado añade los campos de gestión —de parte de quién viene y en qué estado
 * está— y el del cliente no los necesita, porque el solicitante es él mismo
 * (R44).
 *
 * QUÉ ESTABA ROTO
 * - No validaba nada: se podían enviar un asunto y una descripción vacíos
 *   —`required` del navegador aparte—, o un texto de dos letras imposible de
 *   atender.
 * - El panel del cliente reutilizaba el mismo modal para "ver" y para "editar",
 *   pasando los campos a `readOnly`: un formulario gris que parecía editable y
 *   no lo era. Ver una solicitud ahora es otra pieza, `DetallePqrs`.
 * - El título se construía concatenando cadenas y en modo lectura empezaba por
 *   un espacio, así que el encabezado decía " Petición".
 */
/**
 * `tipoFijo` (panel del cliente): el tipo lo decide el botón que abrió el
 * formulario y no se puede cambiar aquí. Sin selector no hay forma de empezar
 * una queja y enviarla como sugerencia a mitad del proceso.
 */
export default function FormularioPqrs({
  pqrs,
  gestion = false,
  tipoFijo = false,
  enviando,
  onGuardar,
  onCerrar,
}) {
  const [valores, setValores] = useState(pqrs)
  const [errores, setErrores] = useState({})

  const editando = Boolean(valores.id)

  const cambiar = (cambios) => {
    setValores((previos) => ({ ...previos, ...cambios }))
    setErrores({})
  }

  const enviar = (evento) => {
    evento.preventDefault()
    const fallos = validarPqrs(valores, { conSolicitante: gestion })
    if (hayFallos(fallos)) {
      setErrores(fallos)
      return
    }
    onGuardar(valores)
  }

  const restantes = LARGO_MAXIMO_TEXTO - (valores.texto?.length ?? 0)

  return (
    <Modal
      titulo={editando ? `Editar ${valores.tipo.toLowerCase()}` : `Nueva ${valores.tipo.toLowerCase()}`}
      icono={iconoDe(valores.tipo)}
      tamano="modal-lg"
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
                Enviando…
              </>
            ) : (
              <>
                <i className="fa-solid fa-paper-plane me-2" />
                {editando ? 'Guardar cambios' : 'Enviar solicitud'}
              </>
            )}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={enviar} noValidate>
        {tipoFijo ? (
          <div className="modal-resumen d-flex align-items-center gap-3 mb-4">
            <div
              className="icon-tile d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ background: colorDe(valores.tipo) }}
            >
              <i className={`fa-solid ${iconoDe(valores.tipo)}`} />
            </div>
            <div className="min-width-0">
              <strong className="d-block">{valores.tipo}</strong>
              <small className="text-secondary">{ayudaDe(valores.tipo)}</small>
            </div>
          </div>
        ) : (
          <fieldset className="mb-4" disabled={enviando}>
            <legend className="form-label">Tipo de solicitud</legend>
            <div className="row row-cols-2 row-cols-sm-4 g-2" role="radiogroup" aria-label="Tipo">
              {NOMBRES_TIPO.map((tipo) => (
                <div className="col" key={tipo}>
                  <button
                    type="button"
                    className={`btn w-100 h-100 py-3 ${
                      valores.tipo === tipo ? 'btn-primary' : 'btn-outline-secondary'
                    }`}
                    onClick={() => cambiar({ tipo })}
                    aria-pressed={valores.tipo === tipo}
                  >
                    <i className={`fa-solid ${iconoDe(tipo)} fs-4 d-block mb-1`} />
                    <span className="small">{tipo}</span>
                  </button>
                </div>
              ))}
            </div>
            <div className="form-text">
              <i className="fa-solid fa-circle-info me-1" style={{ color: colorDe(valores.tipo) }} />
              {ayudaDe(valores.tipo)}
            </div>
          </fieldset>
        )}

        {gestion && (
          <div className="mb-3">
            <label className="form-label" htmlFor="pqrs-nombre">
              Nombre del solicitante
            </label>
            <input
              id="pqrs-nombre"
              className={`form-control ${errores.nombre ? 'is-invalid' : ''}`}
              value={valores.nombre ?? ''}
              onChange={(evento) => cambiar({ nombre: evento.target.value })}
              placeholder="Quién presenta la solicitud"
              maxLength={60}
              aria-invalid={Boolean(errores.nombre)}
              aria-describedby={errores.nombre ? 'pqrs-nombre-error' : undefined}
              disabled={enviando}
            />
            {errores.nombre && (
              <div className="invalid-feedback d-block" id="pqrs-nombre-error" role="alert">
                {errores.nombre}
              </div>
            )}
          </div>
        )}

        <div className="mb-3">
          <label className="form-label" htmlFor="pqrs-asunto">
            Asunto
          </label>
          <input
            id="pqrs-asunto"
            className={`form-control ${errores.asunto ? 'is-invalid' : ''}`}
            value={valores.asunto}
            onChange={(evento) => cambiar({ asunto: evento.target.value })}
            placeholder="Resume en una línea de qué se trata"
            maxLength={120}
            aria-invalid={Boolean(errores.asunto)}
            aria-describedby={errores.asunto ? 'pqrs-asunto-error' : undefined}
            disabled={enviando}
          />
          {errores.asunto && (
            <div className="invalid-feedback d-block" id="pqrs-asunto-error" role="alert">
              {errores.asunto}
            </div>
          )}
        </div>

        <div className={gestion ? 'mb-3' : 'mb-0'}>
          <label className="form-label" htmlFor="pqrs-texto">
            Descripción
          </label>
          <textarea
            id="pqrs-texto"
            className={`form-control ${errores.texto ? 'is-invalid' : ''}`}
            rows="5"
            value={valores.texto}
            onChange={(evento) => cambiar({ texto: evento.target.value })}
            placeholder="Cuéntanos qué pasó, cuándo y con qué pedido. Cuanto más concreto, más rápido lo resolvemos."
            maxLength={LARGO_MAXIMO_TEXTO}
            aria-invalid={Boolean(errores.texto)}
            aria-describedby={errores.texto ? 'pqrs-texto-error' : 'pqrs-texto-ayuda'}
            disabled={enviando}
          />
          {errores.texto ? (
            <div className="invalid-feedback d-block" id="pqrs-texto-error" role="alert">
              {errores.texto}
            </div>
          ) : (
            <div className="form-text" id="pqrs-texto-ayuda">
              {restantes} caracteres disponibles.
            </div>
          )}
        </div>

        {gestion && (
          <div>
            <label className="form-label" htmlFor="pqrs-estado">
              Estado de la gestión
            </label>
            <select
              id="pqrs-estado"
              className="form-select"
              value={valores.estado}
              onChange={(evento) => cambiar({ estado: evento.target.value })}
              disabled={enviando}
            >
              {ESTADOS.map((estado) => (
                <option key={estado}>{estado}</option>
              ))}
            </select>
          </div>
        )}
      </form>
    </Modal>
  )
}
