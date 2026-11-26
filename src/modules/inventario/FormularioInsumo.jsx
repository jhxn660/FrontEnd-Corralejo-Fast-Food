import { useState } from 'react'

import Modal from '../../components/ui/Modal'
import { moneda } from '../../utils/format'
import {
  ESTADOS,
  NOMBRES_CATEGORIA,
  UNIDADES,
  abreviatura,
  colorDe,
  iconoDe,
} from './esquema'

const ID_FORMULARIO = 'formulario-insumo'

/**
 * Alta y edición de un insumo.
 *
 * Tres cosas que el formulario anterior no hacía:
 * - Agrupaba doce campos en una sola retícula plana; aquí van en tres bloques
 *   con título, así que se sabe dónde mirar.
 * - No validaba nada antes de llamar a la red: un nombre en blanco o un stock
 *   negativo llegaban al servidor. Las comprobaciones son de experiencia, no de
 *   seguridad —el back revalida—, pero ahorran un viaje y señalan el campo
 *   exacto (R61, R64).
 * - No mostraba el efecto de lo que se escribía. La cabecera previsualiza el
 *   icono, el color de la categoría y el valor inmovilizado.
 */
export default function FormularioInsumo({ insumo, enviando, onGuardar, onCerrar }) {
  // Las calorías se guardan como "364 kcal", pero se editan como número: la
  // unidad la pone el formulario, no la persona.
  const [valores, setValores] = useState(() => ({
    ...insumo,
    calorias: String(insumo.calorias ?? '').replace(/[^\d.,]/g, '').replace(',', '.'),
  }))
  const [errores, setErrores] = useState({})

  const editando = Boolean(valores.id)

  const actualizar = (campo) => (evento) => {
    setValores((previos) => ({ ...previos, [campo]: evento.target.value }))
    setErrores((previos) => ({ ...previos, [campo]: null }))
  }

  const validar = () => {
    const fallos = {}
    const numero = (valor) => Number(String(valor).replace(',', '.'))

    if (!valores.nombre.trim()) fallos.nombre = 'Escribe el nombre del insumo.'
    else if (valores.nombre.trim().length < 3) fallos.nombre = 'Al menos 3 caracteres.'

    const actual = numero(valores.stockActual)
    if (valores.stockActual === '' || Number.isNaN(actual) || actual < 0) {
      fallos.stockActual = 'Indica una cantidad de 0 o más.'
    }

    const minimo = numero(valores.stockMinimo)
    if (valores.stockMinimo === '' || Number.isNaN(minimo) || minimo < 0) {
      fallos.stockMinimo = 'Indica el mínimo de reposición.'
    }

    if (valores.calorias !== '' && (Number.isNaN(numero(valores.calorias)) || numero(valores.calorias) < 0)) {
      fallos.calorias = 'Escribe solo el número de calorías.'
    }

    const costo = numero(valores.costo)
    if (valores.costo === '' || Number.isNaN(costo) || costo < 0) {
      fallos.costo = 'Indica el costo por unidad.'
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

    // El stock y el costo viajan como números: guardarlos como texto obliga a
    // reparsearlos en cada comparación de nivel y en cada orden.
    onGuardar({
      ...valores,
      nombre: valores.nombre.trim(),
      descripcion: valores.descripcion.trim(),
      proveedor: valores.proveedor?.trim() ?? '',
      stockActual: Number(String(valores.stockActual).replace(',', '.')),
      stockMinimo: Number(String(valores.stockMinimo).replace(',', '.')),
      costo: Number(String(valores.costo).replace(',', '.')),
      calorias: valores.calorias === '' ? '' : `${Number(String(valores.calorias).replace(',', '.'))} kcal`,
      icon: iconoDe(valores.categoria),
    })
  }

  /** Campo de texto con su mensaje de error enlazado (R64). */
  const campo = (nombre, etiqueta, extras = {}) => {
    const { tipo = 'text', ayuda, ...resto } = extras
    const idError = `${nombre}-error`

    return (
      <>
        <label className="form-label" htmlFor={nombre}>
          {etiqueta}
        </label>
        <input
          id={nombre}
          type={tipo}
          className={`form-control ${errores[nombre] ? 'is-invalid' : ''}`}
          value={valores[nombre] ?? ''}
          onChange={actualizar(nombre)}
          aria-invalid={Boolean(errores[nombre])}
          aria-describedby={errores[nombre] ? idError : undefined}
          disabled={enviando}
          {...resto}
        />
        {errores[nombre] && (
          <div className="invalid-feedback d-block" id={idError} role="alert">
            {errores[nombre]}
          </div>
        )}
        {ayuda && !errores[nombre] && <div className="form-text">{ayuda}</div>}
      </>
    )
  }

  const unidad = abreviatura(valores.unidad)
  const valorInmovilizado =
    (Number(String(valores.stockActual).replace(',', '.')) || 0) *
    (Number(String(valores.costo).replace(',', '.')) || 0)

  return (
    <Modal
      titulo={editando ? `Editar ${insumo.nombre}` : 'Añadir insumo al inventario'}
      icono={editando ? 'fa-pen-to-square' : 'fa-circle-plus'}
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
                {editando ? 'Guardar cambios' : 'Añadir insumo'}
              </>
            )}
          </button>
        </>
      }
    >
      {/* Vista previa: el formulario enseña lo que va a quedar guardado. */}
      <div className="modal-resumen d-flex align-items-center gap-3 mb-4">
        <div
          className="icon-tile d-flex align-items-center justify-content-center flex-shrink-0"
          style={{ background: colorDe(valores.categoria) }}
        >
          <i className={iconoDe(valores.categoria)} />
        </div>
        <div className="min-width-0">
          <strong className="d-block text-truncate">
            {valores.nombre.trim() || 'Nuevo insumo'}
          </strong>
          <small className="text-secondary">
            {valores.categoria} · {valores.stockActual || 0} {unidad} · valor{' '}
            {moneda(valorInmovilizado)}
          </small>
        </div>
      </div>

      <form id={ID_FORMULARIO} onSubmit={enviar} noValidate>
        <fieldset className="mb-4" disabled={enviando}>
          <legend className="h6 fw-bold text-uppercase text-secondary">Identificación</legend>
          <div className="row g-3">
            <div className="col-12">
              {campo('nombre', 'Nombre del insumo', {
                placeholder: 'Ej. Carne molida de res',
                maxLength: 80,
                required: true,
              })}
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="descripcion">
                Descripción
              </label>
              <textarea
                id="descripcion"
                className="form-control"
                rows="2"
                maxLength={240}
                placeholder="Para qué se usa, marca, presentación…"
                value={valores.descripcion}
                onChange={actualizar('descripcion')}
              />
              <div className="form-text">{valores.descripcion.length}/240 caracteres</div>
            </div>
            <div className="col-sm-6">
              <label className="form-label" htmlFor="categoria">
                Categoría
              </label>
              <select
                id="categoria"
                className="form-select"
                value={valores.categoria}
                onChange={actualizar('categoria')}
              >
                {NOMBRES_CATEGORIA.map((nombre) => (
                  <option key={nombre}>{nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-sm-6">{campo('proveedor', 'Proveedor', { placeholder: 'Ej. Distribuidora Zenú' })}</div>
          </div>
        </fieldset>

        <fieldset className="mb-4" disabled={enviando}>
          <legend className="h6 fw-bold text-uppercase text-secondary">Existencias y costo</legend>
          <div className="row g-3">
            <div className="col-sm-6">
              <label className="form-label" htmlFor="unidad">
                Unidad de medida
              </label>
              <select
                id="unidad"
                className="form-select"
                value={valores.unidad}
                onChange={actualizar('unidad')}
              >
                {UNIDADES.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="col-sm-6">
              <label className="form-label" htmlFor="estado">
                Estado
              </label>
              <select
                id="estado"
                className="form-select"
                value={valores.estado}
                onChange={actualizar('estado')}
              >
                {ESTADOS.map((estado) => (
                  <option key={estado}>{estado}</option>
                ))}
              </select>
            </div>
            <div className="col-sm-4">
              {campo('stockActual', `Stock actual (${unidad})`, {
                tipo: 'number',
                step: '0.01',
                min: '0',
                required: true,
              })}
            </div>
            <div className="col-sm-4">
              {campo('stockMinimo', `Stock mínimo (${unidad})`, {
                tipo: 'number',
                step: '0.01',
                min: '0',
                required: true,
                ayuda: 'Por debajo de aquí hay que reponer.',
              })}
            </div>
            <div className="col-sm-4">
              {campo('costo', 'Costo unitario (COP)', {
                tipo: 'number',
                step: '1',
                min: '0',
                required: true,
              })}
            </div>
          </div>
        </fieldset>

        <fieldset disabled={enviando}>
          <legend className="h6 fw-bold text-uppercase text-secondary">Datos adicionales</legend>
          <div className="row g-3">
            <div className="col-sm-4">{campo('vencimiento', 'Fecha de vencimiento', { tipo: 'date' })}</div>
            <div className="col-sm-4">{campo('pesoUnidad', 'Peso por unidad', { placeholder: 'Ej. 500 g' })}</div>
            <div className="col-sm-4">
              <label className="form-label" htmlFor="calorias">
                Calorías / 100 g
              </label>
              <div className="input-group">
                <input
                  id="calorias"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  className={`form-control ${errores.calorias ? 'is-invalid' : ''}`}
                  placeholder="Ej. 364"
                  value={valores.calorias}
                  onChange={actualizar('calorias')}
                  aria-invalid={Boolean(errores.calorias)}
                  aria-describedby={errores.calorias ? 'calorias-error' : undefined}
                />
                <span className="input-group-text">kcal</span>
              </div>
              {errores.calorias && (
                <div className="invalid-feedback d-block" id="calorias-error" role="alert">
                  {errores.calorias}
                </div>
              )}
            </div>
          </div>
        </fieldset>
      </form>
    </Modal>
  )
}
