import { useMemo, useState } from 'react'

import { moneda } from '../../utils/format'
import CampoImagen from '../../components/ui/CampoImagen'
import Modal from '../../components/ui/Modal'

import { LOGO_CORRALEJO } from './esquema'

const ID_FORMULARIO = 'formulario-combo'

// Los dos modos de precio, con el texto que ve la administración (los mismos del backend)
const MODOS_PRECIO = [
  { valor: 'sum', etiqueta: 'Sumar Precio Productos', ayuda: 'El precio es la suma de sus productos y se actualiza solo si cambian.' },
  { valor: 'custom', etiqueta: 'Determinar Precio', ayuda: 'Escribe el precio del combo; se muestra cuánto se ahorra el cliente.' },
]

/**
 * Crear o editar un COMBO: un producto que agrupa productos ya hechos de la carta
 * (ej. 1 Hamburguesa + 1 Papas + 1 Gaseosa) y se vende como cualquier otro.
 *
 * - Los productos se eligen de la carta; un combo no puede incluir otro combo.
 * - "Sumar Precio Productos": el backend calcula el precio (y lo recalcula si cambian).
 * - "Determinar Precio": la administración escribe el precio; se muestra el ahorro.
 * - Al venderse, el combo gasta las recetas de los productos que agrupa.
 */
export default function FormularioCombo({ combo, categorias, enviando, onGuardar, onCerrar }) {
  const [valores, setValores] = useState(combo)
  const [nuevo, setNuevo] = useState({ productoId: '', cantidad: '1' })
  const [errores, setErrores] = useState({})

  // Lo que puede ir dentro del combo: productos normales (nunca otro combo ni él mismo)
  const productos = useMemo(
    () =>
      categorias.flatMap((categoria) =>
        categoria.productos
          .filter((plato) => !plato.esCombo && plato.id !== valores.id)
          .map((plato) => ({ ...plato, categoria: categoria.nombre }))
      ),
    [categorias, valores.id]
  )
  const productoDe = (id) => productos.find((plato) => String(plato.id) === String(id))

  const porSeparado = valores.items.reduce(
    (total, item) => total + (productoDe(item.productoId)?.precio ?? 0) * Number(item.cantidad || 0),
    0
  )
  const precioFinal = valores.modoPrecio === 'sum' ? porSeparado : Number(valores.precio) || 0
  const ahorro = porSeparado - precioFinal

  const cambiar = (cambios) => {
    setValores((previos) => ({ ...previos, ...cambios }))
    setErrores({})
  }

  const cambiarCantidad = (productoId, cantidad) =>
    cambiar({ items: valores.items.map((item) => (item.productoId === productoId ? { ...item, cantidad } : item)) })

  const quitar = (productoId) => cambiar({ items: valores.items.filter((item) => item.productoId !== productoId) })

  // Si el producto ya está en el combo, suma la cantidad en vez de repetir la línea
  const agregar = () => {
    const cantidad = Number(nuevo.cantidad)
    if (!nuevo.productoId || !Number.isInteger(cantidad) || cantidad < 1) return
    const existente = valores.items.find((item) => item.productoId === nuevo.productoId)
    cambiar({
      items: existente
        ? valores.items.map((item) =>
            item.productoId === nuevo.productoId ? { ...item, cantidad: Number(item.cantidad) + cantidad } : item
          )
        : [...valores.items, { productoId: nuevo.productoId, cantidad }],
    })
    setNuevo({ productoId: '', cantidad: '1' })
  }

  // Las mismas reglas del backend, para avisar en el campo antes de enviar
  const validar = () => {
    const fallos = {}
    if (valores.nombre.trim().length < 5) fallos.nombre = 'El nombre necesita al menos 5 caracteres.'
    if (!valores.categoriaId) fallos.categoriaId = 'Elige la categoría donde se mostrará.'
    if (valores.items.length === 0) fallos.items = 'Agrega al menos un producto al combo.'
    if (valores.items.some((item) => !Number.isInteger(Number(item.cantidad)) || Number(item.cantidad) < 1)) {
      fallos.items = 'Cada cantidad debe ser un número entero mayor que 0.'
    }
    if (valores.modoPrecio === 'custom' && !(Number(valores.precio) > 0)) {
      fallos.precio = 'Indica un precio mayor que cero.'
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
      precio: precioFinal,
      items: valores.items.map((item) => ({ ...item, cantidad: Number(item.cantidad) })),
    })
  }

  return (
    <Modal
      titulo={valores.id ? `Editar ${combo.nombre}` : 'Nuevo combo'}
      icono="fa-star"
      descripcion="Agrupa productos de la carta en un solo producto con su propio precio."
      tamano="modal-lg"
      cerrarAlPulsarFuera={false}
      onClose={onCerrar}
      footer={
        <>
          <button className="btn btn-outline-secondary" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </button>
          <button className="btn btn-primary" form={ID_FORMULARIO} type="submit" disabled={enviando}>
            <i className="fa-solid fa-floppy-disk me-2" />
            {enviando ? 'Guardando…' : 'Guardar combo'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} className="row g-3" onSubmit={enviar} noValidate>
        <div className="col-12 col-md-7">
          <label className="form-label" htmlFor="combo-nombre">
            Nombre del combo
          </label>
          <input
            id="combo-nombre"
            className={`form-control ${errores.nombre ? 'is-invalid' : ''}`}
            placeholder="Ej. Combo Corralejo Familiar"
            value={valores.nombre}
            onChange={(evento) => cambiar({ nombre: evento.target.value })}
            disabled={enviando}
          />
          {errores.nombre && <div className="invalid-feedback d-block">{errores.nombre}</div>}
        </div>

        <div className="col-12 col-md-5">
          <label className="form-label" htmlFor="combo-categoria">
            Categoría
          </label>
          <select
            id="combo-categoria"
            className={`form-select ${errores.categoriaId ? 'is-invalid' : ''}`}
            value={valores.categoriaId}
            onChange={(evento) => cambiar({ categoriaId: evento.target.value })}
            disabled={enviando}
          >
            <option value="">Elige una categoría…</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </option>
            ))}
          </select>
          {errores.categoriaId && <div className="invalid-feedback d-block">{errores.categoriaId}</div>}
        </div>

        <div className="col-12">
          <label className="form-label" htmlFor="combo-descripcion">
            Descripción
          </label>
          <textarea
            id="combo-descripcion"
            className="form-control"
            rows="2"
            maxLength={220}
            placeholder="Ej. Ideal para compartir entre dos."
            value={valores.descripcion}
            onChange={(evento) => cambiar({ descripcion: evento.target.value })}
            disabled={enviando}
          />
        </div>

        <div className="col-12">
          <span className="form-label d-block">Productos que incluye</span>
          <div className="table-responsive">
            <table className="table table-sm align-middle mb-2">
              <tbody>
                {valores.items.length === 0 && (
                  <tr>
                    <td className="text-secondary small fst-italic">Todavía no hay productos en el combo.</td>
                  </tr>
                )}
                {valores.items.map((item) => {
                  const producto = productoDe(item.productoId)
                  return (
                    <tr key={item.productoId}>
                      <td className="fw-semibold">{producto?.nombre ?? 'Producto que ya no está en la carta'}</td>
                      <td style={{ width: '7rem' }}>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="form-control form-control-sm"
                          value={item.cantidad}
                          onChange={(evento) => cambiarCantidad(item.productoId, evento.target.value)}
                          aria-label={`Cantidad de ${producto?.nombre ?? 'producto'}`}
                          disabled={enviando}
                        />
                      </td>
                      <td className="text-end small text-secondary">
                        {moneda((producto?.precio ?? 0) * Number(item.cantidad || 0))}
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => quitar(item.productoId)}
                          aria-label={`Quitar ${producto?.nombre ?? 'producto'} del combo`}
                          disabled={enviando}
                        >
                          <i className="fa-solid fa-xmark" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="row g-2 align-items-end">
            <div className="col-12 col-sm-7">
              <select
                className="form-select form-select-sm"
                value={nuevo.productoId}
                onChange={(evento) => setNuevo({ ...nuevo, productoId: evento.target.value })}
                aria-label="Producto para agregar al combo"
                disabled={enviando}
              >
                <option value="">Elige un producto de la carta…</option>
                {productos.map((producto) => (
                  <option key={producto.id} value={producto.id}>
                    {producto.nombre} · {moneda(producto.precio)} ({producto.categoria})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-6 col-sm-2">
              <input
                type="number"
                min="1"
                step="1"
                className="form-control form-control-sm"
                value={nuevo.cantidad}
                onChange={(evento) => setNuevo({ ...nuevo, cantidad: evento.target.value })}
                aria-label="Cantidad"
                disabled={enviando}
              />
            </div>
            <div className="col-6 col-sm-3">
              <button
                type="button"
                className="btn btn-sm btn-outline-primary w-100"
                onClick={agregar}
                disabled={!nuevo.productoId || enviando}
              >
                <i className="fa-solid fa-plus me-1" />
                Agregar
              </button>
            </div>
          </div>
          {errores.items && <div className="invalid-feedback d-block">{errores.items}</div>}
        </div>

        <div className="col-12">
          <span className="form-label d-block">Precio del combo</span>
          {MODOS_PRECIO.map((modo) => (
            <div className="form-check" key={modo.valor}>
              <input
                className="form-check-input"
                type="radio"
                name="combo-modo-precio"
                id={`combo-modo-${modo.valor}`}
                checked={valores.modoPrecio === modo.valor}
                onChange={() => cambiar({ modoPrecio: modo.valor })}
                disabled={enviando}
              />
              <label className="form-check-label" htmlFor={`combo-modo-${modo.valor}`}>
                <strong>{modo.etiqueta}</strong>
                <small className="d-block text-secondary">{modo.ayuda}</small>
              </label>
            </div>
          ))}

          {valores.modoPrecio === 'custom' && (
            <input
              type="number"
              min="0"
              step="100"
              className={`form-control mt-2 ${errores.precio ? 'is-invalid' : ''}`}
              style={{ maxWidth: '14rem' }}
              placeholder="Precio del combo"
              value={valores.precio}
              onChange={(evento) => cambiar({ precio: evento.target.value })}
              aria-label="Precio del combo"
              disabled={enviando}
            />
          )}
          {errores.precio && <div className="invalid-feedback d-block">{errores.precio}</div>}

          <div className="modal-resumen mt-3 small">
            Por separado: <strong>{moneda(porSeparado)}</strong> · Precio del combo:{' '}
            <strong className="text-brand">{moneda(precioFinal)}</strong>
            {ahorro > 0 && <span className="badge bg-success ms-2">El cliente ahorra {moneda(ahorro)}</span>}
          </div>
        </div>

        <div className="col-12">
          <CampoImagen
            etiqueta="Imagen del combo (JPG o PNG)"
            valor={valores.imagen ?? null}
            respaldo={LOGO_CORRALEJO}
            onCambiar={(imagen) => cambiar({ imagen })}
            ayuda="Se guardará al pulsar «Guardar combo»."
            textoRespaldo="Sin imagen: se muestra el logo del Corralejo."
            deshabilitado={enviando}
          />
        </div>
      </form>
    </Modal>
  )
}
