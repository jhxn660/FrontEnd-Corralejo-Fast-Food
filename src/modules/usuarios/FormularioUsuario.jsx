import { useState } from 'react'

import Modal from '../../components/ui/Modal'
import ReglasPassword from '../autenticacion/ReglasPassword'
import {
  LIMITES,
  ROLES_GESTIONABLES,
  ROL_CUENTA,
  hayFallos,
  infoDe,
  validarCuenta,
} from './esquema'

const ID_FORMULARIO = 'formulario-usuario'

/**
 * Alta y edición de una cuenta de Administrador o Empleado.
 *
 * - La contraseña solo se pide en el alta: es la inicial de la cuenta, y el
 *   backend la guarda cifrada.
 * - Correo y rol se fijan en el alta: al editar se muestran pero no se cambian.
 * - El cargo (`empleado_rol`) solo aplica a Empleado.
 * - El estado (activa / inactiva) solo se edita en una cuenta existente; una
 *   cuenta nueva nace activa.
 */
export default function FormularioUsuario({ cuenta, enviando, onGuardar, onCerrar }) {
  const [valores, setValores] = useState(cuenta)
  const [errores, setErrores] = useState({})

  const creando = !valores.id

  const cambiar = (cambios) => {
    setValores((previos) => ({ ...previos, ...cambios }))
    setErrores({})
  }

  const enviar = (evento) => {
    evento.preventDefault()
    const fallos = validarCuenta(valores, { creando })
    if (hayFallos(fallos)) {
      setErrores(fallos)
      return
    }
    onGuardar(valores)
  }

  const campo = (id, etiqueta, clave, props = {}) => (
    <div className="mb-3">
      <label className="form-label" htmlFor={id}>
        {etiqueta}
      </label>
      <input
        id={id}
        className={`form-control ${errores[clave] ? 'is-invalid' : ''}`}
        value={valores[clave] ?? ''}
        onChange={(evento) => cambiar({ [clave]: evento.target.value })}
        aria-invalid={Boolean(errores[clave])}
        aria-describedby={errores[clave] ? `${id}-error` : undefined}
        disabled={enviando}
        {...props}
      />
      {errores[clave] && (
        <div className="invalid-feedback d-block" id={`${id}-error`} role="alert">
          {errores[clave]}
        </div>
      )}
    </div>
  )

  return (
    <Modal
      titulo={creando ? 'Nueva cuenta de personal' : `Editar a ${cuenta.name}`}
      icono={creando ? 'fa-user-plus' : 'fa-user-pen'}
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
                Guardando…
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk me-2" />
                {creando ? 'Crear cuenta' : 'Guardar cambios'}
              </>
            )}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={enviar} noValidate>
        <fieldset className="mb-4" disabled={enviando || !creando}>
          <legend className="form-label">
            Rol de la cuenta
            {!creando && <small className="text-secondary ms-2">(se fija en el alta)</small>}
          </legend>
          <div className="row row-cols-1 row-cols-sm-2 g-2" role="radiogroup" aria-label="Rol">
            {ROLES_GESTIONABLES.map((rol) => {
              const { icono, ayuda } = infoDe(rol)
              const elegido = valores.role === rol
              return (
                <div className="col" key={rol}>
                  <button
                    type="button"
                    className={`btn w-100 h-100 py-3 text-start ${elegido ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => cambiar({ role: rol })}
                    aria-pressed={elegido}
                  >
                    <i className={`fa-solid ${icono} me-2`} />
                    <strong>{rol}</strong>
                    <small className="d-block mt-1 opacity-75">{ayuda}</small>
                  </button>
                </div>
              )
            })}
          </div>
          {errores.role && (
            <div className="invalid-feedback d-block" role="alert">
              {errores.role}
            </div>
          )}
        </fieldset>

        <div className="row g-0 gap-md-3 flex-md-nowrap">
          <div className="col-12 col-md">
            {campo('usuario-nombre', 'Nombre completo', 'name', {
              maxLength: LIMITES.MAX_NOMBRE,
              autoComplete: 'off',
            })}
          </div>
          <div className="col-12 col-md">
            {campo('usuario-email', 'Correo', 'email', {
              type: 'email',
              maxLength: LIMITES.MAX_EMAIL,
              autoComplete: 'off',
              readOnly: !creando,
            })}
          </div>
        </div>

        <div className="row g-0 gap-md-3 flex-md-nowrap">
          <div className="col-12 col-md">
            {campo('usuario-telefono', 'Celular (opcional)', 'phone', {
              type: 'tel',
              placeholder: '3XXXXXXXXX',
              inputMode: 'tel',
            })}
          </div>
          <div className="col-12 col-md">
            {valores.role === ROL_CUENTA.EMPLEADO &&
              campo('usuario-cargo', 'Cargo (opcional)', 'empleado_rol', {
                maxLength: LIMITES.MAX_CARGO,
                placeholder: 'Cajero, Cocinero, Domiciliario…',
              })}
          </div>
        </div>

        {creando && (
          <div className="mb-0">
            {campo('usuario-password', 'Contraseña inicial', 'password', {
              type: 'password',
              autoComplete: 'new-password',
            })}
            <div className="small">
              <ReglasPassword password={valores.password} />
            </div>
          </div>
        )}

        {!creando && (
          <div className="form-check form-switch mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="usuario-estado"
              checked={valores.state !== false}
              onChange={(evento) => cambiar({ state: evento.target.checked })}
              disabled={enviando}
            />
            <label className="form-check-label" htmlFor="usuario-estado">
              {valores.state !== false ? 'Cuenta activa: puede iniciar sesión' : 'Cuenta inactiva: no puede iniciar sesión'}
            </label>
          </div>
        )}
      </form>
    </Modal>
  )
}
