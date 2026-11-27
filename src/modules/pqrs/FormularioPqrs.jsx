import { useState } from 'react'

import Modal from '../../components/ui/Modal'

import { LARGO_MAXIMO_TEXTO, ayudaDe, colorDe, hayFallos, iconoDe, validarPqrs } from './esquema'

const ID_FORMULARIO = 'formulario-pqrs'

/**
 * Formulario para que el CLIENTE envíe una PQRS nueva (POST /pqrs).
 *
 * - El tipo (Petición, Queja, Reclamo o Sugerencia) ya lo eligió con el botón que abrió el
 *   formulario: aquí solo se muestra, no se cambia.
 * - Se valida antes de enviar (asunto y descripción con un mínimo de caracteres) para
 *   señalar el campo exacto; el backend vuelve a validar al recibirla.
 * - Una PQRS enviada no se edita: es el registro de lo que pidió el cliente.
 */
export default function FormularioPqrs({ pqrs, enviando, onGuardar, onCerrar }) {
  const [valores, setValores] = useState(pqrs)
  const [errores, setErrores] = useState({})

  const cambiar = (cambios) => {
    setValores((previos) => ({ ...previos, ...cambios }))
    setErrores({})
  }

  const enviar = (evento) => {
    evento.preventDefault()
    const fallos = validarPqrs(valores)
    if (hayFallos(fallos)) {
      setErrores(fallos)
      return
    }
    onGuardar(valores)
  }

  const restantes = LARGO_MAXIMO_TEXTO - (valores.texto?.length ?? 0)

  return (
    <Modal
      titulo={`Nueva ${valores.tipo.toLowerCase()}`}
      icono={iconoDe(valores.tipo)}
      tamano="modal-lg"
      cerrarAlPulsarFuera={false}
      onClose={onCerrar}
      footer={
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onCerrar} disabled={enviando}>
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
                Enviar solicitud
              </>
            )}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={enviar} noValidate>
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

        <div className="mb-0">
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
      </form>
    </Modal>
  )
}
