import { useCallback, useMemo, useState } from 'react'

import { useAvisos } from '../../context/AvisosContext'
import { useConfirmacion } from '../../hooks/useConfirmacion'
import { useRecurso } from '../../hooks/useRecurso'
import ConfirmarEliminacion from '../../components/ui/ConfirmarEliminacion'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'
import { menuApi } from '../products/api'
import { insumosApi } from '../supplies/api'
import { abreviatura } from '../supplies/esquema'

import { recetasApi } from './api'
import { colorAlcance, unidadesPosibles } from './calculos'
import EditorRecetas from './EditorRecetas'

const INICIAL = { categorias: [], recetas: new Map(), insumos: [] }

/**
 * Recetas de los productos (módulo `recipes` del backend): qué insumos gasta cada uno.
 *
 * - `editable` (Owner y Administrador): crear, cambiar y eliminar recetas.
 * - Sin `editable` (Empleado): solo consulta, igual que en el backend (GET /recipes).
 *
 * Al facturar un pedido, el backend descuenta del inventario los insumos de estas recetas, y
 * Pedidos usa las mismas recetas para avisar cuántas unidades alcanzan. Los combos no aparecen:
 * gastan las recetas de los productos que agrupan.
 */
export default function Recetas({ editable = false }) {
  const cargar = useCallback(async () => {
    const [{ categorias }, recetas, insumos] = await Promise.all([
      menuApi.listarCategorias(),
      recetasApi.listar(),
      insumosApi.listar(),
    ])
    return { categorias, recetas, insumos }
  }, [])
  const { datos, cargando, error, recargar } = useRecurso(cargar, INICIAL)
  const avisos = useAvisos()

  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState(null) // id del producto abierto en el editor

  const insumoDe = useCallback(
    (id) => datos.insumos.find((insumo) => String(insumo.id) === String(id)),
    [datos.insumos]
  )

  // Las categorías con sus productos normales (sin combos), filtrados por la búsqueda
  const categorias = useMemo(() => {
    const texto = busqueda.toLowerCase().trim()
    return datos.categorias
      .map((categoria) => ({
        ...categoria,
        productos: categoria.productos.filter(
          (plato) => !plato.esCombo && (!texto || plato.nombre.toLowerCase().includes(texto))
        ),
      }))
      .filter((categoria) => categoria.productos.length > 0)
  }, [datos.categorias, busqueda])

  const eliminacion = useConfirmacion((plato) => recetasApi.eliminar(datos.recetas.get(String(plato.id)).id), {
    alTerminar: recargar,
  })

  const eliminar = async () => {
    const nombre = eliminacion.objetivo?.nombre
    if (await eliminacion.confirmar()) avisos.error('Receta eliminada', `${nombre} ya no gasta insumos del inventario.`)
  }

  const conReceta = datos.recetas.size

  return (
    <>
      <EncabezadoPagina
        titulo={editable ? 'Gestión de Recetas' : 'Recetas'}
        descripcion={
          editable
            ? 'Qué insumos gasta cada producto. Al facturar, se descuentan solos del inventario.'
            : 'Qué insumos gasta cada producto y cuántas unidades alcanzan con el inventario actual.'
        }
      >
        <button className="btn btn-outline-secondary" onClick={recargar} disabled={cargando}>
          <i className="fa-solid fa-rotate me-2" />
          Actualizar
        </button>
      </EncabezadoPagina>

      <MensajeError texto={error} onReintentar={recargar} />

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body d-flex flex-wrap align-items-center gap-3">
          <span className="badge bg-dark">
            <i className="fa-solid fa-flask me-1" />
            {conReceta} producto(s) con receta
          </span>
          <small className="text-secondary">Los combos gastan las recetas de los productos que agrupan.</small>
          <input
            className="form-control ms-auto"
            style={{ maxWidth: '22rem' }}
            placeholder="Buscar producto…"
            aria-label="Buscar producto"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
        </div>
      </div>

      {cargando && datos.categorias.length === 0 && <Cargando texto="Cargando recetas…" />}

      {!cargando && categorias.length === 0 && (
        <div className="card border-0 shadow-sm">
          <Vacio texto="No hay productos que coincidan." icono="fa-flask" />
        </div>
      )}

      {categorias.map((categoria) => (
        <section className="card border-0 shadow-sm mb-3" key={categoria.id}>
          <div className="card-header bg-white">
            <h2 className="h6 fw-bold mb-0">{categoria.nombre}</h2>
          </div>
          <ul className="list-group list-group-flush">
            {categoria.productos.map((plato) => {
              const receta = datos.recetas.get(String(plato.id))?.receta ?? []
              const alcanza = unidadesPosibles(receta, (id) => insumoDe(id)?.stockActual ?? 0)

              return (
                <li className="list-group-item d-flex flex-wrap align-items-center gap-3" key={plato.id}>
                  <div className="flex-grow-1 min-width-0">
                    <p className="mb-1 fw-semibold">{plato.nombre}</p>
                    {receta.length === 0 ? (
                      <small className="text-secondary fst-italic">Sin receta: no gasta inventario.</small>
                    ) : (
                      <small className="text-secondary">
                        {receta
                          .map(({ insumo_id, cantidad_requerida }) => {
                            const insumo = insumoDe(insumo_id)
                            return `${cantidad_requerida} ${abreviatura(insumo?.unidad ?? '')} ${insumo?.nombre ?? 'insumo eliminado'}`
                          })
                          .join(' · ')}
                      </small>
                    )}
                  </div>

                  {alcanza !== null && (
                    <span className={`badge ${colorAlcance(alcanza)} flex-shrink-0`}>
                      Alcanza para {alcanza}
                    </span>
                  )}

                  {editable && (
                    <div className="btn-group btn-group-sm flex-shrink-0">
                      <button className="btn btn-outline-primary" onClick={() => setEditando(plato.id)}>
                        <i className="fa-solid fa-pen me-1" />
                        {receta.length ? 'Editar receta' : 'Crear receta'}
                      </button>
                      {receta.length > 0 && (
                        <button
                          className="btn btn-outline-danger"
                          onClick={() => eliminacion.pedir(plato)}
                          aria-label={`Eliminar la receta de ${plato.nombre}`}
                        >
                          <i className="fa-solid fa-trash-can" />
                        </button>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      {editable && editando && (
        <EditorRecetas
          categorias={datos.categorias}
          recetas={datos.recetas}
          platoInicial={editando}
          onGuardado={recargar}
          onCerrar={() => setEditando(null)}
        />
      )}

      {eliminacion.objetivo && (
        <ConfirmarEliminacion
          entidad="la receta de"
          nombre={eliminacion.objetivo.nombre}
          consecuencias={['El producto dejará de gastar insumos del inventario al venderse.']}
          enviando={eliminacion.enviando}
          error={eliminacion.error}
          onConfirmar={eliminar}
          onCancelar={eliminacion.cancelar}
        />
      )}
    </>
  )
}
