import { useState } from 'react'

import Modal from '../../components/ui/Modal'
import {
  ESTADOS,
  NOMBRES_CARGO,
  colorDe,
  horarioTexto,
  horasDeTurno,
  iconoDe,
  inicialesDe,
} from './esquema'

const ID_FORMULARIO = 'formulario-empleado'

/**
 * Alta y edición de un empleado.
 *
 * QUÉ ESTABA ROTO
 * El horario era un campo de texto libre con el formato en el placeholder
 * ("Ej. 08:00 AM - 04:00 PM"). Cualquier cosa que se escribiera se guardaba:
 * "8 a 4", "mañana", un texto a medio escribir. Y el selector de cargo abría
 * con `value=""` sobre una opción `disabled`, así que en Chrome quedaba en
 * blanco y el `required` del formulario bloqueaba el envío sin decir por qué:
 * el modal parecía no funcionar.
 *
 * Ahora el turno son dos `input type="time"` —el navegador garantiza una hora
 * válida—, el cargo se elige entre tarjetas visibles y el formulario calcula y
 * muestra la duración del turno antes de guardar.
 */
export default function FormularioEmpleado({ empleado, enviando, onGuardar, onCerrar }) {
  const [valores, setValores] = useState(empleado)
  const [errores, setErrores] = useState({})

  const editando = Boolean(valores.id)

  const cambiar = (cambios) => {
    setValores((previos) => ({ ...previos, ...cambios }))
    setErrores({})
  }

  const horas = horasDeTurno(valores.inicio, valores.fin)

  const validar = () => {
    const fallos = {}
    const nombre = valores.name.trim()

    if (!nombre) fallos.name = 'Escribe el nombre completo.'
    else if (nombre.length < 3) fallos.name = 'Al menos 3 caracteres.'
    else if (!/^[\p{L}\p{M}\s'.-]+$/u.test(nombre)) {
      fallos.name = 'Solo letras, espacios, apóstrofos y guiones.'
    }

    if (!valores.role) fallos.role = 'Elige el cargo del empleado.'
    if (!valores.inicio || !valores.fin) fallos.turno = 'Indica la hora de entrada y de salida.'
    else if (horas === 0) fallos.turno = 'La entrada y la salida no pueden ser la misma hora.'
    else if (horas > 12) fallos.turno = `Un turno de ${horas} h es demasiado largo; revísalo.`

    return fallos
  }

  const enviar = (evento) => {
    evento.preventDefault()
    const fallos = validar()
    if (Object.keys(fallos).length > 0) {
      setErrores(fallos)
      return
    }
    onGuardar(valores)
  }

  return (
    <Modal
      titulo={editando ? `Editar a ${empleado.name}` : 'Añadir empleado al equipo'}
      icono={editando ? 'fa-user-pen' : 'fa-user-plus'}
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
                Guardando…
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk me-2" />
                {editando ? 'Guardar cambios' : 'Añadir al equipo'}
              </>
            )}
          </button>
        </>
      }
    >
      {/* Vista previa de la ficha que va a quedar en el tablero. */}
      <div className="modal-resumen d-flex align-items-center gap-3 mb-4">
        <div
          className="icon-tile d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
          style={{ background: colorDe(valores.role) }}
        >
          {inicialesDe(valores.name)}
        </div>
        <div className="min-width-0">
          <strong className="d-block text-truncate">
            {valores.name.trim() || 'Nuevo empleado'}
          </strong>
          <small className="text-secondary">
            {valores.role || 'Sin cargo'} · {horarioTexto(valores.inicio, valores.fin)}
            {horas ? ` · ${horas} h` : ''}
          </small>
        </div>
      </div>

      <form id={ID_FORMULARIO} onSubmit={enviar} noValidate>
        <div className="mb-4">
          <label className="form-label" htmlFor="empleado-nombre">
            Nombre completo
          </label>
          <input
            id="empleado-nombre"
            className={`form-control ${errores.name ? 'is-invalid' : ''}`}
            value={valores.name}
            onChange={(evento) => cambiar({ name: evento.target.value })}
            placeholder="Ej. Carlos Ramírez"
            maxLength={60}
            autoComplete="off"
            aria-invalid={Boolean(errores.name)}
            aria-describedby={errores.name ? 'empleado-nombre-error' : undefined}
            disabled={enviando}
          />
          {errores.name && (
            <div className="invalid-feedback d-block" id="empleado-nombre-error" role="alert">
              {errores.name}
            </div>
          )}
        </div>

        <fieldset className="mb-4" disabled={enviando}>
          <legend className="form-label">Cargo</legend>
          <div className="row row-cols-2 row-cols-sm-3 g-2" role="radiogroup" aria-label="Cargo">
            {NOMBRES_CARGO.map((cargo) => (
              <div className="col" key={cargo}>
                <button
                  type="button"
                  className={`btn w-100 h-100 text-start ${
                    valores.role === cargo ? 'btn-primary' : 'btn-outline-secondary'
                  }`}
                  onClick={() => cambiar({ role: cargo })}
                  aria-pressed={valores.role === cargo}
                >
                  <i className={`${iconoDe(cargo)} me-2`} />
                  <span className="small">{cargo}</span>
                </button>
              </div>
            ))}
          </div>
          {errores.role && (
            <div className="invalid-feedback d-block" role="alert">
              {errores.role}
            </div>
          )}
        </fieldset>

        <fieldset className="mb-4" disabled={enviando}>
          <legend className="form-label">Turno</legend>
          <div className="row g-3 align-items-end">
            <div className="col-6 col-sm-4">
              <label className="form-label small" htmlFor="empleado-inicio">
                Entrada
              </label>
              <input
                id="empleado-inicio"
                type="time"
                className={`form-control ${errores.turno ? 'is-invalid' : ''}`}
                value={valores.inicio}
                onChange={(evento) => cambiar({ inicio: evento.target.value })}
              />
            </div>
            <div className="col-6 col-sm-4">
              <label className="form-label small" htmlFor="empleado-fin">
                Salida
              </label>
              <input
                id="empleado-fin"
                type="time"
                className={`form-control ${errores.turno ? 'is-invalid' : ''}`}
                value={valores.fin}
                onChange={(evento) => cambiar({ fin: evento.target.value })}
              />
            </div>
            <div className="col-12 col-sm-4">
              <div className="border rounded p-2 text-center">
                <small className="text-secondary d-block">Duración</small>
                <strong>{horas !== null ? `${horas} h` : '—'}</strong>
              </div>
            </div>
          </div>
          {errores.turno && (
            <div className="invalid-feedback d-block" role="alert">
              {errores.turno}
            </div>
          )}
        </fieldset>

        <fieldset disabled={enviando}>
          <legend className="form-label">Estado actual</legend>
          <div className="d-flex flex-wrap gap-2">
            {Object.entries(ESTADOS).map(([clave, { etiqueta, icono }]) => (
              <button
                key={clave}
                type="button"
                className={`btn ${valores.status === clave ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => cambiar({ status: clave })}
                aria-pressed={valores.status === clave}
              >
                <i className={`fa-solid ${icono} me-2`} />
                {etiqueta}
              </button>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}
