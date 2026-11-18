import { useState } from 'react'

import Modal from '../../components/ui/Modal'
import CampoImagen from '../../components/ui/CampoImagen'
import { moneda } from '../../utils/format'
import { LOGO_CORRALEJO, emojiDe } from './esquema'

const ID_FORMULARIO = 'formulario-plato'

/**
 * Edición de UN plato desde la vista de la carta. Solo cambia ese plato: no
 * hace falta abrir la categoría entera ni ocultarla para corregir un precio o
 * marcar un plato como agotado.
 *
 * AQUÍ SE GESTIONA LA IMAGEN
 * Es el único sitio donde se sube, se cambia o se quita la foto de un plato.
 * Al guardar, `useMenu` recarga la carta completa (R21), así que la imagen
 * aparece a la vez en la carta del cliente, en la ficha del plato, en la tabla
 * del administrador, en el catálogo de Pedidos y en el podio: todos leen el
 * mismo registro a través de `imagenDe`.
 *
 * El alta de platos de `FormularioCategoria` no la pide: un plato nuevo nace
 * con el logo y se le pone la foto desde aquí cuando se tenga. Ese formulario
 * conserva la imagen de los platos que ya la tienen.
 */
export default function FormularioPlato({ plato, categoria, enviando, onGuardar, onCerrar }) {
  const [valores, setValores] = useState({ ...plato, precioCombo: plato.precioCombo ?? '' })
  const [errores, setErrores] = useState({})

  const cambiar = (cambios) => {
    setValores((previos) => ({ ...previos, ...cambios }))
    setErrores({})
  }

  const enviar = (evento) => {
    evento.preventDefault()
    const fallos = {}
    if (!valores.nombre.trim()) fallos.nombre = 'El plato necesita un nombre.'
    if (!(Number(valores.precio) > 0)) fallos.precio = 'Indica un precio mayor que cero.'
    if (valores.precioCombo !== '' && Number(valores.precioCombo) < 0) {
      fallos.precioCombo = 'El precio del combo no puede ser negativo.'
    }
    if (Object.keys(fallos).length > 0) {
      setErrores(fallos)
      return
    }

    onGuardar({
      ...valores,
      // '' o undefined se normalizan a null: es lo que el adaptador entiende
      // por "sin imagen" y lo que hace que se pinte el logo.
      imagen: valores.imagen || null,
      nombre: valores.nombre.trim(),
      descripcion: valores.descripcion?.trim() ?? '',
      precio: Number(valores.precio),
      precioCombo: Number(valores.precioCombo) > 0 ? Number(valores.precioCombo) : null,
    })
  }

  const disponible = valores.estado !== 'Inhabilitado'

  return (
    <Modal
      titulo={`Editar ${plato.nombre}`}
      icono="fa-pen-to-square"
      descripcion={`Categoría: ${categoria}. El cambio solo afecta a este plato.`}
      cerrarAlPulsarFuera={false}
      onClose={onCerrar}
      footer={
        <>
          <button className="btn btn-outline-secondary" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </button>
          <button className="btn btn-primary" form={ID_FORMULARIO} type="submit" disabled={enviando}>
            <i className="fa-solid fa-floppy-disk me-2" />
            {enviando ? 'Guardando…' : 'Guardar plato'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={enviar} noValidate className="row g-3">
        <div className="col-12">
          <label className="form-label" htmlFor="plato-nombre">
            <span className="me-2" aria-hidden="true">
              {emojiDe(valores.nombre, categoria)}
            </span>
            Nombre
          </label>
          <input
            id="plato-nombre"
            className={`form-control ${errores.nombre ? 'is-invalid' : ''}`}
            value={valores.nombre}
            onChange={(evento) => cambiar({ nombre: evento.target.value })}
            aria-invalid={Boolean(errores.nombre)}
            disabled={enviando}
          />
          {errores.nombre && <div className="invalid-feedback d-block">{errores.nombre}</div>}
        </div>

        <div className="col-6">
          <label className="form-label" htmlFor="plato-precio">
            Precio (COP)
          </label>
          <input
            id="plato-precio"
            type="number"
            min="1"
            step="50"
            className={`form-control ${errores.precio ? 'is-invalid' : ''}`}
            value={valores.precio}
            onChange={(evento) => cambiar({ precio: evento.target.value })}
            aria-invalid={Boolean(errores.precio)}
            disabled={enviando}
          />
          {errores.precio ? (
            <div className="invalid-feedback d-block">{errores.precio}</div>
          ) : (
            <div className="form-text">{moneda(valores.precio)}</div>
          )}
        </div>

        <div className="col-6">
          <label className="form-label" htmlFor="plato-precio-combo">
            Precio combo
          </label>
          <input
            id="plato-precio-combo"
            type="number"
            min="0"
            step="50"
            placeholder="Sin combo"
            className={`form-control ${errores.precioCombo ? 'is-invalid' : ''}`}
            value={valores.precioCombo}
            onChange={(evento) => cambiar({ precioCombo: evento.target.value })}
            disabled={enviando}
          />
          {errores.precioCombo ? (
            <div className="invalid-feedback d-block">{errores.precioCombo}</div>
          ) : (
            <div className="form-text">
              {Number(valores.precioCombo) > 0 ? moneda(valores.precioCombo) : 'Opcional'}
            </div>
          )}
        </div>

        <div className="col-12">
          <label className="form-label" htmlFor="plato-descripcion">
            Descripción
          </label>
          <textarea
            id="plato-descripcion"
            className="form-control"
            rows="3"
            maxLength={220}
            value={valores.descripcion ?? ''}
            onChange={(evento) => cambiar({ descripcion: evento.target.value })}
            disabled={enviando}
          />
        </div>

        <div className="col-12">
          <CampoImagen
            etiqueta="Imagen del plato (JPG o PNG)"
            valor={valores.imagen ?? null}
            respaldo={LOGO_CORRALEJO}
            onCambiar={(imagen) => cambiar({ imagen })}
            ayuda="Se guardará al pulsar «Guardar plato» y se verá en la carta, en el catálogo de Pedidos y en el podio."
            textoRespaldo="Sin imagen: en la carta y en los listados se muestra el logo del Corralejo."
            deshabilitado={enviando}
          />
        </div>

        <div className="col-12">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="plato-disponible"
              checked={disponible}
              onChange={(evento) =>
                cambiar({ estado: evento.target.checked ? 'Disponible' : 'Inhabilitado' })
              }
              disabled={enviando}
            />
            <label className="form-check-label" htmlFor="plato-disponible">
              {disponible ? 'A la venta' : 'Agotado: se ve en la carta pero no se puede pedir'}
            </label>
          </div>
        </div>
      </form>
    </Modal>
  )
}
