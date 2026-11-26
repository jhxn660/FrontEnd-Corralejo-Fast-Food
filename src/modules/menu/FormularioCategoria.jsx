import { useState } from 'react'

import Modal from '../../components/ui/Modal'
import { moneda } from '../../utils/format'
import { ICONOS_CATEGORIA, PRODUCTO_VACIO, emojiDe, tonoDe } from './esquema'

const ID_FORMULARIO = 'formulario-categoria'

const TITULOS = {
  categoria: { titulo: 'Registrar nueva categoría', icono: 'fa-circle-plus' },
  combo: { titulo: 'Registrar nuevo combo', icono: 'fa-star' },
  edicion: { titulo: 'Editar categoría', icono: 'fa-pen-to-square' },
}

/**
 * Alta y edición de una categoría de la carta, con sus platos.
 *
 * QUÉ CAMBIA RESPECTO AL FORMULARIO ANTERIOR
 * Antes los platos se añadían por un `input-group` de dos campos y, una vez
 * añadidos, ya no se podían tocar: para corregir una errata en un precio había
 * que borrar el plato y volver a escribirlo, y la descripción no se podía
 * introducir en ningún momento, aunque la carta del cliente la muestre. Aquí
 * cada plato es una fila editable, se puede reordenar y se ve el precio
 * formateado mientras se escribe.
 *
 * El precio se guarda como número (R54): el adaptador del módulo ya convierte
 * lo que venga de la API, y un "$12.500" guardado a mano obliga a reparsear en
 * cada orden por precio.
 */
export default function FormularioCategoria({ modo, categoria, enviando, onGuardar, onCerrar }) {
  const [valores, setValores] = useState(categoria)
  const [errores, setErrores] = useState({})

  const { titulo, icono } = TITULOS[modo] ?? TITULOS.edicion
  const esCombo = modo === 'combo'

  const cambiar = (cambios) => {
    setValores((previos) => ({ ...previos, ...cambios }))
    setErrores({})
  }

  const cambiarPlato = (posicion, cambios) =>
    cambiar({
      productos: valores.productos.map((plato, indice) =>
        indice === posicion ? { ...plato, ...cambios } : plato
      ),
    })

  const añadirPlato = () => cambiar({ productos: [...valores.productos, { ...PRODUCTO_VACIO }] })

  const quitarPlato = (posicion) =>
    cambiar({ productos: valores.productos.filter((_, indice) => indice !== posicion) })

  /** Mover un plato cambia el orden en el que lo ve el cliente. */
  const moverPlato = (posicion, delta) => {
    const destino = posicion + delta
    if (destino < 0 || destino >= valores.productos.length) return
    const copia = [...valores.productos]
    ;[copia[posicion], copia[destino]] = [copia[destino], copia[posicion]]
    cambiar({ productos: copia })
  }

  const validar = () => {
    const fallos = {}
    if (!valores.nombre.trim()) fallos.nombre = 'Escribe cómo se llama en la carta.'
    if (esCombo && !valores.descripcion.trim()) {
      fallos.descripcion = 'Un combo necesita decir qué incluye.'
    }

    // Una categoría sin platos se ve como un hueco en la carta del cliente.
    if (valores.productos.length === 0) {
      fallos.productos = 'Añade al menos un plato antes de guardar.'
    } else if (valores.productos.some((plato) => !plato.nombre.trim())) {
      fallos.productos = 'Hay un plato sin nombre.'
    } else if (valores.productos.some((plato) => !(Number(plato.precio) > 0))) {
      fallos.productos = 'Todos los platos necesitan un precio mayor que cero.'
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

    onGuardar({
      ...valores,
      nombre: valores.nombre.trim(),
      descripcion: valores.descripcion.trim(),
      productos: valores.productos.map((plato) => ({
        ...plato,
        nombre: plato.nombre.trim(),
        descripcion: plato.descripcion?.trim() ?? '',
        precio: Number(plato.precio),
        precioCombo: Number(plato.precioCombo) > 0 ? Number(plato.precioCombo) : null,
      })),
    })
  }

  const total = valores.productos.reduce((suma, plato) => suma + (Number(plato.precio) || 0), 0)

  return (
    <Modal
      titulo={titulo}
      icono={icono}
      tamano="modal-xl"
      cerrarAlPulsarFuera={false}
      onClose={onCerrar}
      footer={
        <>
          <span className="small text-secondary me-auto">
            {valores.productos.length} plato(s) · suma de la carta {moneda(total)}
          </span>
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
                Guardar en la carta
              </>
            )}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={enviar} noValidate>
        {/* Vista previa de cómo quedará la cabecera de la categoría. */}
        <div className="modal-resumen d-flex align-items-center gap-3 mb-4">
          <div
            className="icon-tile d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ background: tonoDe(valores.nombre, valores.nombre) }}
          >
            <i className={valores.icono} />
          </div>
          <div className="min-width-0">
            <strong className="d-block text-truncate">
              {valores.nombre.trim() || (esCombo ? 'Nuevo combo' : 'Nueva categoría')}
            </strong>
            <small className="text-secondary">
              Así la verá el cliente en la carta · {valores.estado}
            </small>
          </div>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-12 col-lg-8">
            <label className="form-label" htmlFor="nombre-categoria">
              {esCombo ? 'Nombre del combo' : 'Título de la categoría'}
            </label>
            <input
              id="nombre-categoria"
              className={`form-control ${errores.nombre ? 'is-invalid' : ''}`}
              value={valores.nombre}
              onChange={(evento) => cambiar({ nombre: evento.target.value })}
              placeholder={esCombo ? 'Ej. Combo Corralejo Familiar' : 'Ej. Perros Calientes'}
              aria-invalid={Boolean(errores.nombre)}
              aria-describedby={errores.nombre ? 'nombre-categoria-error' : undefined}
              disabled={enviando}
            />
            {errores.nombre && (
              <div className="invalid-feedback d-block" id="nombre-categoria-error" role="alert">
                {errores.nombre}
              </div>
            )}
          </div>

          <div className="col-12 col-lg-4">
            <label className="form-label" htmlFor="estado-categoria">
              Visibilidad
            </label>
            <select
              id="estado-categoria"
              className="form-select"
              value={valores.estado}
              onChange={(evento) => cambiar({ estado: evento.target.value })}
              disabled={enviando}
            >
              <option value="Disponible">Visible en la carta</option>
              <option value="Inhabilitado">Oculta para el cliente</option>
            </select>
          </div>

          <div className="col-12">
            <label className="form-label" htmlFor="descripcion-categoria">
              Descripción {esCombo ? '' : '(opcional)'}
            </label>
            <textarea
              id="descripcion-categoria"
              className={`form-control ${errores.descripcion ? 'is-invalid' : ''}`}
              rows="2"
              maxLength={220}
              value={valores.descripcion}
              onChange={(evento) => cambiar({ descripcion: evento.target.value })}
              placeholder="Una línea que dé ganas de pedir de esta categoría."
              disabled={enviando}
            />
            {errores.descripcion && (
              <div className="invalid-feedback d-block" role="alert">
                {errores.descripcion}
              </div>
            )}
          </div>

          <div className="col-12">
            <span className="form-label d-block">Icono de la categoría</span>
            <div className="d-flex flex-wrap gap-2" role="radiogroup" aria-label="Icono">
              {ICONOS_CATEGORIA.map(({ valor, etiqueta }) => (
                <button
                  key={valor}
                  type="button"
                  className={`btn btn-sm ${
                    valores.icono === valor ? 'btn-primary' : 'btn-outline-secondary'
                  }`}
                  onClick={() => cambiar({ icono: valor })}
                  aria-pressed={valores.icono === valor}
                  title={etiqueta}
                  disabled={enviando}
                >
                  <i className={valor} />
                  <span className="visually-hidden">{etiqueta}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <fieldset disabled={enviando}>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <legend className="h6 fw-bold text-uppercase text-secondary mb-0 w-auto">
              Platos de esta categoría
            </legend>
            <button type="button" className="btn btn-sm btn-primary ms-auto" onClick={añadirPlato}>
              <i className="fa-solid fa-plus me-2" />
              Añadir plato
            </button>
          </div>

          {errores.productos && (
            <div className="alert alert-danger py-2" role="alert">
              {errores.productos}
            </div>
          )}

          {valores.productos.length === 0 ? (
            <p className="text-secondary small border rounded p-3 mb-0">
              Ningún plato todavía. Pulsa <strong>Añadir plato</strong> para empezar.
            </p>
          ) : (
            <ul className="list-unstyled d-grid gap-2 mb-0">
              {valores.productos.map((plato, posicion) => (
                <li className="border rounded p-3" key={`plato-${posicion}`}>
                  <div className="row g-2 align-items-start">
                    <div className="col-12 col-md-1 text-center">
                      <span className="fs-3" aria-hidden="true">
                        {emojiDe(plato.nombre, valores.nombre)}
                      </span>
                    </div>

                    <div className="col-12 col-md-3">
                      <label className="form-label small" htmlFor={`plato-nombre-${posicion}`}>
                        Nombre
                      </label>
                      <input
                        id={`plato-nombre-${posicion}`}
                        className="form-control form-control-sm"
                        value={plato.nombre}
                        onChange={(evento) => cambiarPlato(posicion, { nombre: evento.target.value })}
                        placeholder="Ej. Perro Ranchero"
                      />
                    </div>

                    <div className="col-6 col-md-2">
                      <label className="form-label small" htmlFor={`plato-precio-${posicion}`}>
                        Precio
                      </label>
                      <input
                        id={`plato-precio-${posicion}`}
                        type="number"
                        min="1"
                        step="50"
                        className="form-control form-control-sm"
                        value={plato.precio}
                        onChange={(evento) => cambiarPlato(posicion, { precio: evento.target.value })}
                      />
                      <div className="form-text">{moneda(plato.precio)}</div>
                    </div>

                    <div className="col-6 col-md-2">
                      <label className="form-label small" htmlFor={`plato-combo-${posicion}`}>
                        Precio combo
                      </label>
                      <input
                        id={`plato-combo-${posicion}`}
                        type="number"
                        min="0"
                        step="50"
                        className="form-control form-control-sm"
                        value={plato.precioCombo ?? ''}
                        placeholder="Sin combo"
                        onChange={(evento) =>
                          cambiarPlato(posicion, { precioCombo: evento.target.value })
                        }
                      />
                      <div className="form-text">
                        {Number(plato.precioCombo) > 0 ? moneda(plato.precioCombo) : 'Opcional'}
                      </div>
                    </div>

                    <div className="col-6 col-md-2">
                      <label className="form-label small" htmlFor={`plato-estado-${posicion}`}>
                        Estado
                      </label>
                      <select
                        id={`plato-estado-${posicion}`}
                        className="form-select form-select-sm"
                        value={plato.estado ?? 'Disponible'}
                        onChange={(evento) => cambiarPlato(posicion, { estado: evento.target.value })}
                      >
                        <option value="Disponible">Disponible</option>
                        <option value="Inhabilitado">Agotado</option>
                      </select>
                    </div>

                    <div className="col-6 col-md-2 text-md-end">
                      <span className="form-label small d-block">Orden</span>
                      <div className="btn-group btn-group-sm">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => moverPlato(posicion, -1)}
                          disabled={posicion === 0}
                          aria-label={`Subir ${plato.nombre || 'el plato'}`}
                        >
                          <i className="fa-solid fa-arrow-up" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => moverPlato(posicion, 1)}
                          disabled={posicion === valores.productos.length - 1}
                          aria-label={`Bajar ${plato.nombre || 'el plato'}`}
                        >
                          <i className="fa-solid fa-arrow-down" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          onClick={() => quitarPlato(posicion)}
                          aria-label={`Quitar ${plato.nombre || 'el plato'}`}
                        >
                          <i className="fa-solid fa-trash-can" />
                        </button>
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="form-label small" htmlFor={`plato-desc-${posicion}`}>
                        Descripción
                      </label>
                      <input
                        id={`plato-desc-${posicion}`}
                        className="form-control form-control-sm"
                        value={plato.descripcion ?? ''}
                        onChange={(evento) =>
                          cambiarPlato(posicion, { descripcion: evento.target.value })
                        }
                        placeholder="Lo que lleva el plato; es lo que lee el cliente."
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      </form>
    </Modal>
  )
}
