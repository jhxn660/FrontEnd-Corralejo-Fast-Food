import { useState } from 'react'

import Modal from '../../components/ui/Modal'

import { fechaLegible } from './calendario'

const ID_FORMULARIO = 'formulario-dia'
const MAXIMO_MOTIVO = 200

/**
 * Lo que pasa UNA fecha concreta (/cierres): cerrada, o abierta con su propio horario. El
 * horario semanal no cambia: editar el viernes 27 deja igual los demás viernes.
 * El motivo (o nota) es opcional y lo ve el cliente en el calendario de atención.
 *
 * @param {{ dia: { id?, fecha, estaAbierto, horaApertura, horaCierre, motivo },
 *   enviando: boolean, onGuardar: (dia) => void, onCerrar }} props
 *   Sin `id`, la fecha aún no tiene nada guardado y al guardar se crea.
 */
export default function FormularioDia({ dia, enviando, onGuardar, onCerrar }) {
  const [valores, setValores] = useState(dia)
  const [error, setError] = useState('')

  const cambiar = (cambios) => {
    setValores((previos) => ({ ...previos, ...cambios }))
    setError('')
  }

  const enviar = (evento) => {
    evento.preventDefault()
    if (valores.estaAbierto && (!valores.horaApertura || !valores.horaCierre)) {
      setError('Indica la hora de apertura y la de cierre.')
      return
    }
    onGuardar({ ...valores, motivo: valores.motivo.trim() })
  }

  return (
    <Modal
      titulo={`Editar el ${fechaLegible(valores.fecha)}`}
      icono="fa-calendar-day"
      descripcion="Solo esta fecha: el horario de los demás días no cambia."
      cerrarAlPulsarFuera={false}
      onClose={onCerrar}
      footer={
        <>
          <button type="button" className="btn btn-outline-secondary" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </button>
          <button
            className={`btn ${valores.estaAbierto ? 'btn-primary' : 'btn-danger'}`}
            form={ID_FORMULARIO}
            type="submit"
            disabled={enviando}
          >
            <i className={`fa-solid ${valores.estaAbierto ? 'fa-floppy-disk' : 'fa-ban'} me-2`} />
            {enviando ? 'Guardando…' : valores.estaAbierto ? 'Guardar este día' : 'Cerrar este día'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} className="d-grid gap-4" onSubmit={enviar} noValidate>
        <div className="form-check form-switch">
          <input
            id="dia-abierto"
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={valores.estaAbierto}
            onChange={(evento) => cambiar({ estaAbierto: evento.target.checked })}
            disabled={enviando}
          />
          <label className="form-check-label" htmlFor="dia-abierto">
            {valores.estaAbierto ? 'Abierto este día' : 'Cerrado este día'}
          </label>
        </div>

        {valores.estaAbierto && (
          <div className="row g-3">
            <div className="col-6">
              <label className="form-label" htmlFor="dia-apertura">
                Abre
              </label>
              <input
                id="dia-apertura"
                type="time"
                className={`form-control ${error ? 'is-invalid' : ''}`}
                value={valores.horaApertura}
                onChange={(evento) => cambiar({ horaApertura: evento.target.value })}
                disabled={enviando}
              />
            </div>
            <div className="col-6">
              <label className="form-label" htmlFor="dia-cierre">
                Cierra
              </label>
              <input
                id="dia-cierre"
                type="time"
                className={`form-control ${error ? 'is-invalid' : ''}`}
                value={valores.horaCierre}
                onChange={(evento) => cambiar({ horaCierre: evento.target.value })}
                disabled={enviando}
              />
            </div>
            {error && (
              <div className="col-12 invalid-feedback d-block" role="alert">
                {error}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="form-label" htmlFor="dia-motivo">
            {valores.estaAbierto ? 'Nota para el cliente (opcional)' : 'Motivo (opcional)'}
          </label>
          <input
            id="dia-motivo"
            className="form-control"
            maxLength={MAXIMO_MOTIVO}
            placeholder={valores.estaAbierto ? 'Ej. Horario reducido por festivo.' : 'Ej. Inventario, festivo, mantenimiento…'}
            value={valores.motivo}
            onChange={(evento) => cambiar({ motivo: evento.target.value })}
            disabled={enviando}
          />
          <div className="form-text">El cliente lo verá en el calendario de atención.</div>
        </div>
      </form>
    </Modal>
  )
}
