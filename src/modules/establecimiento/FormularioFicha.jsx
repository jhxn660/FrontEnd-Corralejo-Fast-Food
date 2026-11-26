import { useState } from 'react'

import { esMapaDeGoogle } from '../../utils/seguridad'
import { CAMPOS_INFO } from '../../data/local'
import Modal from '../../components/ui/Modal'

const ID_FORMULARIO = 'formulario-ficha'

/**
 * Edición de la ficha del establecimiento.
 *
 * Los campos salen de CAMPOS_INFO (data/local.js): cada uno trae su tipo, su ayuda y si es
 * obligatorio. La URL del mapa debe ser la de "Insertar un mapa" de Google Maps (la de
 * "compartir" deja el mapa en blanco), por eso se valida y se muestra una vista previa.
 */
export default function FormularioFicha({ ficha, enviando, onGuardar, onCerrar }) {
  const [valores, setValores] = useState(ficha)
  const [errores, setErrores] = useState({})

  const cambiar = (campo) => (evento) => {
    setValores((previos) => ({ ...previos, [campo]: evento.target.value }))
    setErrores((previos) => ({ ...previos, [campo]: null }))
  }

  const validar = () => {
    const fallos = {}

    // Los mismos obligatorios que la ubicación del backend (titulo, direccion, telefono y
    // descripcion): así el error se ve en el campo y no como un 400 al guardar.
    CAMPOS_INFO.forEach(({ campo, requerido }) => {
      if (requerido && !valores[campo]?.trim()) fallos[campo] = requerido
    })
    if (!valores.descripcion?.trim()) fallos.descripcion = 'Describe el local en una o dos frases.'

    // Un enlace de "compartir" de Google Maps no funciona dentro de un iframe:
    // hace falta el de "insertar un mapa". Y se exige el dominio de Google, no
    // solo la ruta: ver utils/seguridad.js.
    if (valores.mapa?.trim() && !esMapaDeGoogle(valores.mapa.trim())) {
      fallos.mapa = 'Pega la URL de "Insertar un mapa" de Google Maps (https://www.google.com/maps/embed…).'
    }

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
      titulo="Editar ficha del establecimiento"
      icono="fa-store"
      descripcion="Estos datos son los que ve el cliente en su panel y en el pie de contacto."
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
                Guardar cambios
              </>
            )}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} className="row g-3" onSubmit={enviar} noValidate>
        {CAMPOS_INFO.map(({ campo, etiqueta, tipo = 'text', icono, ayuda, columna = 'col-12' }) => {
          const idError = `ficha-${campo}-error`

          return (
            <div className={columna} key={campo}>
              <label className="form-label" htmlFor={`ficha-${campo}`}>
                {icono && <i className={`fa-solid ${icono} text-brand me-2`} />}
                {etiqueta}
              </label>
              <input
                id={`ficha-${campo}`}
                type={tipo}
                className={`form-control ${errores[campo] ? 'is-invalid' : ''}`}
                value={valores[campo] ?? ''}
                onChange={cambiar(campo)}
                aria-invalid={Boolean(errores[campo])}
                aria-describedby={errores[campo] ? idError : undefined}
                disabled={enviando}
              />
              {errores[campo] ? (
                <div className="invalid-feedback d-block" id={idError} role="alert">
                  {errores[campo]}
                </div>
              ) : (
                ayuda && <div className="form-text">{ayuda}</div>
              )}
            </div>
          )
        })}

        <div className="col-12">
          <label className="form-label" htmlFor="ficha-descripcion">
            <i className="fa-solid fa-align-left text-brand me-2" />
            Descripción del local
          </label>
          <textarea
            id="ficha-descripcion"
            className={`form-control ${errores.descripcion ? 'is-invalid' : ''}`}
            rows="3"
            maxLength={400}
            value={valores.descripcion ?? ''}
            onChange={cambiar('descripcion')}
            aria-invalid={Boolean(errores.descripcion)}
            aria-describedby={errores.descripcion ? 'ficha-descripcion-error' : undefined}
            disabled={enviando}
          />
          {errores.descripcion ? (
            <div className="invalid-feedback d-block" id="ficha-descripcion-error" role="alert">
              {errores.descripcion}
            </div>
          ) : (
            <div className="form-text">{(valores.descripcion ?? '').length}/400 caracteres</div>
          )}
        </div>

        {/* Comprobación del mapa sin salir del modal. */}
        {esMapaDeGoogle(valores.mapa) && (
          <div className="col-12">
            <span className="form-label d-block">Así se verá el mapa</span>
            <div className="ratio ratio-21x9 rounded overflow-hidden border">
              <iframe src={valores.mapa} title="Vista previa de la ubicación" style={{ border: 0 }} />
            </div>
          </div>
        )}
      </form>
    </Modal>
  )
}
