import { useState } from 'react'

import Modal from '../../components/ui/Modal'

const ID_FORMULARIO = 'formulario-horario'

/** Días que acepta el backend (enum `dia` del modelo Horario), en orden de la semana. */
export const DIAS_HORARIO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

/** Horario nuevo: el primer día que todavía no tiene horario, de 2:00 p. m. a 9:30 p. m. */
export const horarioVacio = (ocupados = []) => ({
  dia: DIAS_HORARIO.find((dia) => !ocupados.includes(dia)) ?? DIAS_HORARIO[0],
  horaApertura: '14:00',
  horaCierre: '21:30',
  estaAbierto: true,
  estadoNota: '',
})

/**
 * Alta y edición del horario de UN día de la semana (lo que antes eran los "días especiales").
 * En el backend cada día es un registro de /api/horarios:
 *   { dia, horaApertura, horaCierre, estaAbierto, estadoNota }
 * `estadoNota` es el texto que lee el cliente (p. ej. "Cerrado por inventario").
 *
 * @param {{ horario, diasOcupados: string[], enviando, onGuardar, onCerrar }} props
 *   `diasOcupados` evita crear dos horarios para el mismo día.
 */
export default function FormularioHorario({ horario, diasOcupados = [], enviando, onGuardar, onCerrar }) {
  const [valores, setValores] = useState(horario)
  const [errores, setErrores] = useState({})

  const editando = Boolean(valores.id)

  const cambiar = (cambios) => {
    setValores((previos) => ({ ...previos, ...cambios }))
    setErrores({})
  }

  const enviar = (evento) => {
    evento.preventDefault()
    const fallos = {}

    if (!editando && diasOcupados.includes(valores.dia)) {
      fallos.dia = `${valores.dia} ya tiene horario: edítalo en la lista.`
    }
    if (valores.estaAbierto && (!valores.horaApertura || !valores.horaCierre)) {
      fallos.horas = 'Indica la hora de apertura y la de cierre.'
    }

    if (Object.keys(fallos).length > 0) {
      setErrores(fallos)
      return
    }

    onGuardar({ ...valores, estadoNota: valores.estadoNota.trim() })
  }

  return (
    <Modal
      titulo={editando ? `Editar horario del ${valores.dia}` : 'Añadir horario'}
      icono="fa-clock"
      descripcion="El horario de cada día aparece en el calendario de atención de clientes y visitantes."
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
                Guardando…
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk me-2" />
                {editando ? 'Guardar cambios' : 'Añadir horario'}
              </>
            )}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} className="d-grid gap-4" onSubmit={enviar} noValidate>
        <div>
          <label className="form-label" htmlFor="horario-dia">
            Día de la semana
          </label>
          <select
            id="horario-dia"
            className={`form-select ${errores.dia ? 'is-invalid' : ''}`}
            value={valores.dia}
            onChange={(evento) => cambiar({ dia: evento.target.value })}
            disabled={enviando || editando}
          >
            {DIAS_HORARIO.map((dia) => (
              <option key={dia} value={dia}>
                {dia}
              </option>
            ))}
          </select>
          {errores.dia && (
            <div className="invalid-feedback d-block" role="alert">
              {errores.dia}
            </div>
          )}
        </div>

        <div className="form-check form-switch">
          <input
            id="horario-abierto"
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={valores.estaAbierto}
            onChange={(evento) => cambiar({ estaAbierto: evento.target.checked })}
            disabled={enviando}
          />
          <label className="form-check-label" htmlFor="horario-abierto">
            {valores.estaAbierto ? 'Abierto ese día' : 'Cerrado ese día'}
          </label>
        </div>

        {valores.estaAbierto && (
          <div className="row g-3">
            <div className="col-6">
              <label className="form-label" htmlFor="horario-apertura">
                Abre
              </label>
              <input
                id="horario-apertura"
                type="time"
                className={`form-control ${errores.horas ? 'is-invalid' : ''}`}
                value={valores.horaApertura}
                onChange={(evento) => cambiar({ horaApertura: evento.target.value })}
                disabled={enviando}
              />
            </div>
            <div className="col-6">
              <label className="form-label" htmlFor="horario-cierre">
                Cierra
              </label>
              <input
                id="horario-cierre"
                type="time"
                className={`form-control ${errores.horas ? 'is-invalid' : ''}`}
                value={valores.horaCierre}
                onChange={(evento) => cambiar({ horaCierre: evento.target.value })}
                disabled={enviando}
              />
            </div>
            {errores.horas && (
              <div className="col-12 invalid-feedback d-block" role="alert">
                {errores.horas}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="form-label" htmlFor="horario-nota">
            Nota para el cliente (opcional)
          </label>
          <input
            id="horario-nota"
            className="form-control"
            maxLength={120}
            placeholder="Ej. Cerrado por inventario."
            value={valores.estadoNota}
            onChange={(evento) => cambiar({ estadoNota: evento.target.value })}
            disabled={enviando}
          />
        </div>
      </form>
    </Modal>
  )
}
