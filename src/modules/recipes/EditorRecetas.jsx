import { useCallback, useMemo, useState } from 'react'

import { useAvisos } from '../../context/AvisosContext'
import { usePeticion } from '../../hooks/usePeticion'
import { useRecurso } from '../../hooks/useRecurso'
import { Cargando, MensajeError } from '../../components/ui/Estado'
import Modal from '../../components/ui/Modal'
import { insumosApi } from '../supplies/api'
import { abreviatura } from '../supplies/esquema'

import { recetasApi } from './api'
import { colorAlcance, limpiarReceta, unidadesPosibles } from './calculos'

const ID_FORMULARIO = 'formulario-receta'

const aFilas = (receta) =>
  limpiarReceta(receta).map(({ insumo_id, cantidad_requerida }) => ({
    insumo_id,
    cantidad: String(cantidad_requerida),
  }))

const aReceta = (filas) =>
  filas.map(({ insumo_id, cantidad }) => ({ insumo_id, cantidad_requerida: Number(cantidad) }))

const claveDe = (receta) => JSON.stringify(limpiarReceta(receta))
const cantidadValida = (texto) => Number.isFinite(Number(texto)) && Number(texto) > 0

/** Pie del editor: cuántas unidades alcanzan con la receta que se está escribiendo. */
function ResumenAlcance({ lineas, alcanza }) {
  if (lineas === 0) {
    return <span className="text-secondary">Sin receta: el inventario no limita este plato.</span>
  }
  if (alcanza === null) {
    return <span className="text-danger">Revisa las cantidades marcadas.</span>
  }
  return (
    <>
      Con el stock actual alcanza para{' '}
      <strong className={alcanza === 0 ? 'text-danger' : 'text-brand'}>
        {alcanza} unidad{alcanza === 1 ? '' : 'es'}
      </strong>
      {alcanza === 0 && ' (saldrá agotado)'}
    </>
  )
}

/**
 * Editor de recetas (Owner y Administrador): qué insumos gasta UNA unidad de cada producto.
 *
 * Los insumos salen de Inventario (/supplies) y la receta se guarda en el módulo recipes del
 * backend, que comprueba que cada insumo exista. Desde ese momento Pedidos limita lo que se
 * puede vender y, al facturar, el backend descuenta esos insumos del inventario.
 *
 * `recetas` es el Map(productoId → { id, receta }) que carga la pantalla de Recetas; tras
 * guardar se llama a `onGuardado` para que lo vuelva a leer. Los combos no aparecen: gastan las
 * recetas de los productos que agrupan.
 *
 * El borrador vive aparte de la receta guardada: mientras se edita, los datos que llegan de
 * otra pestaña no pisan lo que se está escribiendo, y para cambiar de plato hay que guardar o
 * descartar primero.
 */
export default function EditorRecetas({ categorias, recetas, platoInicial, onGuardado, onCerrar }) {
  const avisos = useAvisos()

  const cargarInsumos = useCallback(() => insumosApi.listar(), [])
  const { datos: insumos, cargando, error, recargar } = useRecurso(cargarInsumos, [])

  // Solo productos normales: un combo no lleva receta propia
  const platos = useMemo(
    () =>
      categorias.flatMap((c) =>
        c.productos.filter((p) => !p.esCombo).map((p) => ({ ...p, categoria: c.nombre }))
      ),
    [categorias]
  )

  const [platoId, setPlatoId] = useState(() => platoInicial ?? platos[0]?.id ?? '')
  const [borrador, setBorrador] = useState(null) // { platoId, filas } mientras se edita
  const [nuevo, setNuevo] = useState({ insumo_id: '', cantidad: '' })

  const plato = platos.find((p) => p.id === platoId) ?? null
  const guardada = recetas.get(String(platoId)) ?? null // { id, receta } o null si no tiene
  const claveServidor = claveDe(guardada?.receta)
  const filas = borrador?.platoId === platoId ? borrador.filas : aFilas(guardada?.receta)
  const sucio = borrador?.platoId === platoId && claveDe(aReceta(filas)) !== claveServidor
  const invalidas = filas.filter((fila) => !cantidadValida(fila.cantidad)).length

  const insumoDe = (id) => insumos.find((insumo) => String(insumo.id) === String(id))
  const stockDe = (id) => Number(insumoDe(id)?.stockActual) || 0
  const alcanza = invalidas === 0 ? unidadesPosibles(aReceta(filas), stockDe) : null

  // Los que ya están en la receta no se ofrecen otra vez; agrupados por categoría.
  const disponiblesParaAgregar = useMemo(() => {
    const usados = new Set(filas.map((fila) => fila.insumo_id))
    const grupos = new Map()
    ;[...insumos]
      .filter((insumo) => !usados.has(String(insumo.id)))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      .forEach((insumo) => {
        const grupo = insumo.categoria ?? 'Otros'
        grupos.set(grupo, [...(grupos.get(grupo) ?? []), insumo])
      })
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b, 'es'))
  }, [insumos, filas])

  const editar = (siguientes) => setBorrador({ platoId, filas: siguientes })

  const cambiarCantidad = (insumoId, cantidad) =>
    editar(filas.map((fila) => (fila.insumo_id === insumoId ? { ...fila, cantidad } : fila)))

  const quitar = (insumoId) => editar(filas.filter((fila) => fila.insumo_id !== insumoId))

  const agregar = () => {
    if (!nuevo.insumo_id || !cantidadValida(nuevo.cantidad)) return
    editar([...filas, { insumo_id: nuevo.insumo_id, cantidad: nuevo.cantidad }])
    setNuevo({ insumo_id: '', cantidad: '' })
  }

  const descartar = () => setBorrador(null)

  // Guardar = crear, cambiar o (con la lista vacía) eliminar la receta; luego se recargan
  // las recetas de la pantalla antes de soltar el borrador, para que no parpadee lo viejo.
  const envio = usePeticion(
    useCallback(
      async (productoId, receta, recetaId) => {
        await recetasApi.guardar(productoId, receta, recetaId)
        await onGuardado?.()
      },
      [onGuardado]
    )
  )

  const guardar = async (evento) => {
    evento.preventDefault()
    if (!plato || !sucio || invalidas > 0) return

    const receta = aReceta(filas)
    const { ok, error: fallo } = await envio.ejecutar(plato.id, receta, guardada?.id)
    if (!ok) {
      avisos.fallo('No se pudo guardar la receta', fallo)
      return
    }
    setBorrador(null)
    avisos.exito(
      'Receta guardada',
      receta.length === 0
        ? `${plato.nombre} ya no gasta insumos del inventario.`
        : `${plato.nombre}: con el stock actual alcanza para ${alcanza ?? 0} unidad(es).`
    )
  }

  return (
    <Modal
      titulo="Recetas por plato"
      icono="fa-flask"
      descripcion="Qué insumos del inventario consume cada plato. Se descuentan solos al facturar."
      tamano="modal-lg"
      cerrarAlPulsarFuera={false}
      onClose={onCerrar}
      footer={
        <div className="d-flex flex-wrap justify-content-between align-items-center w-100 gap-2">
          <span className="small">
            <ResumenAlcance lineas={filas.length} alcanza={alcanza} />
          </span>
          <span className="d-flex gap-2">
            {sucio && (
              <button type="button" className="btn btn-outline-secondary" onClick={descartar} disabled={envio.enviando}>
                Descartar
              </button>
            )}
            <button type="button" className="btn btn-outline-secondary" onClick={onCerrar} disabled={envio.enviando}>
              Cerrar
            </button>
            <button
              className="btn btn-primary"
              type="submit"
              form={ID_FORMULARIO}
              disabled={!sucio || invalidas > 0 || envio.enviando}
            >
              <i className="fa-solid fa-floppy-disk me-2" />
              {envio.enviando ? 'Guardando…' : 'Guardar receta'}
            </button>
          </span>
        </div>
      }
    >
      <MensajeError texto={error} onReintentar={recargar} />

      <form id={ID_FORMULARIO} onSubmit={guardar} noValidate>
        <label className="form-label" htmlFor="receta-plato">
          Plato
        </label>
        <select
          id="receta-plato"
          className="form-select mb-1"
          value={platoId}
          onChange={(evento) => setPlatoId(evento.target.value)}
          disabled={sucio || envio.enviando}
        >
          {categorias.map((categoria) => (
            <optgroup key={categoria.id} label={categoria.nombre}>
              {categoria.productos
                .filter((p) => !p.esCombo)
                .map((p) => {
                  const lineas = recetas.get(String(p.id))?.receta.length ?? 0
                  return (
                    <option key={p.id} value={p.id}>
                      {p.nombre} · {lineas ? `${lineas} insumo(s)` : 'sin receta'}
                    </option>
                  )
                })}
            </optgroup>
          ))}
        </select>
        <div className="form-text mb-3">
          {sucio
            ? 'Guarda o descarta los cambios para pasar a otro plato.'
            : 'Elige el plato cuya receta quieres ver o modificar.'}
        </div>

        {cargando && insumos.length === 0 ? (
          <Cargando texto="Cargando insumos…" />
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th style={{ width: '9.5rem' }}>Cantidad por plato</th>
                    <th className="text-end">Stock</th>
                    <th className="text-end">Alcanza para</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filas.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-secondary py-4">
                        Este plato no tiene insumos asignados. Agrégalos abajo.
                      </td>
                    </tr>
                  )}
                  {filas.map((fila) => {
                    const insumo = insumoDe(fila.insumo_id)
                    const unidad = abreviatura(insumo?.unidad ?? '')
                    const valida = cantidadValida(fila.cantidad)
                    const veces = valida ? Math.floor(stockDe(fila.insumo_id) / Number(fila.cantidad) + 1e-9) : null

                    return (
                      <tr key={fila.insumo_id}>
                        <td>
                          {insumo ? (
                            <span className="fw-semibold">{insumo.nombre}</span>
                          ) : (
                            <span className="text-danger">
                              <i className="fa-solid fa-triangle-exclamation me-1" />
                              Insumo {fila.insumo_id} (ya no existe)
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="input-group input-group-sm">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className={`form-control ${valida ? '' : 'is-invalid'}`}
                              value={fila.cantidad}
                              onChange={(evento) => cambiarCantidad(fila.insumo_id, evento.target.value)}
                              aria-label={`Cantidad de ${insumo?.nombre ?? fila.insumo_id} por plato`}
                              disabled={envio.enviando}
                            />
                            <span className="input-group-text">{unidad || 'und'}</span>
                          </div>
                        </td>
                        <td className="text-end small text-secondary">
                          {stockDe(fila.insumo_id)} {unidad}
                        </td>
                        <td className="text-end">
                          {veces === null ? (
                            '—'
                          ) : (
                            <span className={`badge ${colorAlcance(veces)}`}>
                              {veces}
                            </span>
                          )}
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => quitar(fila.insumo_id)}
                            aria-label={`Quitar ${insumo?.nombre ?? fila.insumo_id} de la receta`}
                            disabled={envio.enviando}
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

            <div className="modal-resumen">
              <strong className="small text-uppercase d-block mb-2">Agregar insumo</strong>
              <div className="row g-2 align-items-end">
                <div className="col-12 col-sm-7">
                  <label className="form-label small mb-1" htmlFor="receta-insumo">
                    Insumo del inventario
                  </label>
                  <select
                    id="receta-insumo"
                    className="form-select form-select-sm"
                    value={nuevo.insumo_id}
                    onChange={(evento) => setNuevo({ ...nuevo, insumo_id: evento.target.value })}
                    disabled={envio.enviando}
                  >
                    <option value="">Elige un insumo…</option>
                    {disponiblesParaAgregar.map(([grupo, lista]) => (
                      <optgroup key={grupo} label={grupo}>
                        {lista.map((insumo) => (
                          <option key={insumo.id} value={String(insumo.id)}>
                            {insumo.nombre} — {insumo.stockActual} {abreviatura(insumo.unidad)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div className="col-7 col-sm-3">
                  <label className="form-label small mb-1" htmlFor="receta-cantidad">
                    Cantidad
                    {nuevo.insumo_id && ` (${abreviatura(insumoDe(nuevo.insumo_id)?.unidad ?? '')})`}
                  </label>
                  <input
                    id="receta-cantidad"
                    type="number"
                    min="0"
                    step="any"
                    className="form-control form-control-sm"
                    value={nuevo.cantidad}
                    onChange={(evento) => setNuevo({ ...nuevo, cantidad: evento.target.value })}
                    onKeyDown={(evento) => {
                      if (evento.key === 'Enter') {
                        evento.preventDefault()
                        agregar()
                      }
                    }}
                    disabled={envio.enviando}
                  />
                </div>
                <div className="col-5 col-sm-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary w-100"
                    onClick={agregar}
                    disabled={!nuevo.insumo_id || !cantidadValida(nuevo.cantidad) || envio.enviando}
                  >
                    <i className="fa-solid fa-plus me-1" />
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </form>
    </Modal>
  )
}
