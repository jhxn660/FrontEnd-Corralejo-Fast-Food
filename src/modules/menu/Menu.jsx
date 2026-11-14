import { useState } from 'react'

import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import ConfirmarEliminacion from '../../components/ui/ConfirmarEliminacion'
import { Cargando, MensajeError } from '../../components/ui/Estado'
import { useConfirmacion } from '../../hooks/useConfirmacion'
import { useAvisos } from '../../context/AvisosContext'
import { moneda } from '../../utils/format'
import PieContacto from '../../components/ui/PieContacto'
import { useMenu } from './useMenu'
import { categoriaVacia } from './esquema'
import CartaCliente from './CartaCliente'
import GestionCategorias from './GestionCategorias'
import FormularioCategoria from './FormularioCategoria'
import FormularioPlato from './FormularioPlato'

const ORDENES = {
  '': 'Orden de la carta',
  asc: 'Precio: menor a mayor',
  desc: 'Precio: mayor a menor',
}

/**
 * Carta del restaurante. Una sola pantalla para los tres roles: `editable`
 * añade las operaciones de escritura y nada más (R44).
 *
 * Esta vista no calcula, no filtra y no habla con la API: todo eso es useMenu.
 * Aquí se recogen eventos y se decide qué presentación toca —`CartaCliente`
 * para quien viene a pedir, `GestionCategorias` para quien administra—. Las dos
 * leen las MISMAS categorías del mismo hook, así que lo que el administrador
 * publica es exactamente lo que el cliente ve.
 */
export default function Menu({ editable = false, vitrina = false }) {
  const {
    categorias,
    todas,
    cargando,
    error,
    recargar,
    busqueda,
    setBusqueda,
    orden,
    setOrden,
    guardar,
    eliminar,
    alternarEstado,
    escribiendo,
  } = useMenu({ editable })

  const avisos = useAvisos()
  const [formulario, setFormulario] = useState(null) // { modo, categoria }
  const [platoEnEdicion, setPlatoEnEdicion] = useState(null) // { categoriaId, categoria, plato }

  /** La categoría completa, sin el recorte de la búsqueda ni el orden por precio. */
  const original = (id) => todas.find((categoria) => categoria.id === id)

  /** Guarda la categoría cambiando solo un plato, identificado por su id. */
  const guardarPlato = async (categoriaId, plato, mensaje) => {
    const categoria = original(categoriaId)
    if (!categoria) return false

    const { ok, error: fallo } = await guardar({
      ...categoria,
      productos: categoria.productos.map((actual) => (actual.id === plato.id ? plato : actual)),
    })
    if (!ok) {
      avisos.fallo('No se pudo guardar el plato', fallo)
      return false
    }
    avisos.exito(mensaje.titulo, mensaje.texto)
    return true
  }

  const alternarPlato = (categoria, plato) => {
    const agotar = plato.estado !== 'Inhabilitado'
    return guardarPlato(
      categoria.id,
      { ...plato, estado: agotar ? 'Inhabilitado' : 'Disponible' },
      {
        titulo: agotar ? 'Plato agotado' : 'Plato a la venta',
        texto: `${plato.nombre} ${agotar ? 'ya no se puede pedir' : 'vuelve a estar disponible'}.`,
      }
    )
  }

  // useMenu.eliminar no lanza: devuelve { ok, error }. El modal necesita el
  // fallo como excepción para quedarse abierto en vez de cerrarse como si
  // hubiera funcionado (R60).
  const eliminacion = useConfirmacion(async (categoria) => {
    const { ok, error: fallo } = await eliminar(categoria.id)
    if (!ok) throw fallo ?? new Error('No se pudo eliminar la categoría.')
  })

  const confirmarBorrado = async () => {
    const nombre = eliminacion.objetivo?.nombre
    if (await eliminacion.confirmar()) {
      avisos.error('Categoría eliminada', `${nombre} ya no aparece en la carta.`)
    }
  }

  const guardarCategoria = async (categoria) => {
    const editando = Boolean(categoria.id)
    const { ok, error: fallo } = await guardar(categoria)

    if (!ok) {
      avisos.fallo('No se pudo guardar la carta', fallo)
      return
    }

    setFormulario(null)
    avisos.exito(
      editando ? 'Categoría actualizada' : 'Categoría creada',
      `${categoria.nombre} quedó publicada con ${categoria.productos.length} plato(s).`
    )
  }

  const alternar = async (categoria) => {
    const { ok, error: fallo } = await alternarEstado(categoria)
    if (!ok) {
      avisos.fallo('No se pudo cambiar la visibilidad', fallo)
      return
    }
    avisos.exito(
      categoria.disponible ? 'Categoría oculta' : 'Categoría visible',
      categoria.disponible
        ? `${categoria.nombre} dejó de verse en la carta del cliente.`
        : `${categoria.nombre} ya aparece en la carta del cliente.`
    )
  }

  const platos = categorias.reduce((suma, categoria) => suma + categoria.productos.length, 0)
  const ocultas = categorias.filter((categoria) => !categoria.disponible).length
  const precios = categorias.flatMap((c) => c.productos.map((p) => p.precio)).filter((p) => p > 0)
  const promedio = precios.length > 0 ? precios.reduce((a, b) => a + b, 0) / precios.length : 0

  // Las acciones son las mismas vaya la pantalla suelta o dentro de una
  // pestaña del panel; lo único que cambia es si las encabeza un <h1>.
  const acciones = (
    <>
      <select
        className="form-select"
        style={{ width: 'auto' }}
        value={orden}
        onChange={(evento) => setOrden(evento.target.value)}
        aria-label="Ordenar productos por precio"
      >
        {Object.entries(ORDENES).map(([valor, texto]) => (
          <option key={valor} value={valor}>
            {texto}
          </option>
        ))}
      </select>

      {editable && (
        <>
          <button
            className="btn btn-primary"
            onClick={() => setFormulario({ modo: 'categoria', categoria: categoriaVacia() })}
          >
            <i className="fa-solid fa-circle-plus me-2" />
            Nueva categoría
          </button>
          <button
            className="btn btn-outline-primary"
            onClick={() =>
              setFormulario({ modo: 'combo', categoria: categoriaVacia('fa-solid fa-star') })
            }
          >
            <i className="fa-solid fa-star me-2" />
            Nuevo combo
          </button>
        </>
      )}

      <button className="btn btn-outline-secondary" onClick={recargar} disabled={cargando}>
        <i className="fa-solid fa-rotate me-2" />
        Actualizar
      </button>
    </>
  )

  return (
    <>
      <EncabezadoPagina
        titulo={editable ? 'Gestión de Menú' : vitrina ? 'Carta del local' : 'Nuestra Carta'}
        descripcion={
          editable
            ? 'Crea categorías, ajusta precios y decide qué ve el cliente.'
            : vitrina
              ? 'Vista previa para enseñarle la carta al cliente en el local, sin que tenga que iniciar sesión.'
              : 'Elige lo que se te antoje: todo se prepara al momento.'
        }
      >
        {acciones}
      </EncabezadoPagina>

      <MensajeError texto={error?.message} onReintentar={recargar} />

      {editable && !cargando && (
        <div className="row g-3 mb-3">
          {[
            { etiqueta: 'Categorías', valor: categorias.length, icono: 'fa-layer-group' },
            { etiqueta: 'Platos en la carta', valor: platos, icono: 'fa-utensils' },
            { etiqueta: 'Precio promedio', valor: moneda(promedio), icono: 'fa-tag' },
            { etiqueta: 'Ocultas al cliente', valor: ocultas, icono: 'fa-eye-slash' },
          ].map(({ etiqueta, valor, icono }) => (
            <div className="col-6 col-lg-3" key={etiqueta}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body py-3 d-flex align-items-center gap-3">
                  <div className="icon-tile icon-tile-sm d-flex align-items-center justify-content-center flex-shrink-0">
                    <i className={`fa-solid ${icono}`} />
                  </div>
                  <div className="min-width-0">
                    <p className="text-secondary small text-uppercase fw-semibold mb-0">
                      {etiqueta}
                    </p>
                    <p className="h5 fw-bold mb-0">{valor}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="input-group mb-3" style={{ maxWidth: '26rem' }}>
        <span className="input-group-text bg-white">
          <i className="fa-solid fa-magnifying-glass text-secondary" />
        </span>
        <input
          className="form-control"
          placeholder={editable ? 'Consultar categoría o plato…' : '¿Qué se te antoja hoy?'}
          aria-label="Buscar categoría o plato"
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
        />
        {busqueda && (
          <button
            className="btn btn-outline-secondary"
            onClick={() => setBusqueda('')}
            aria-label="Limpiar búsqueda"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        )}
      </div>

      {cargando && <Cargando texto="Cargando menú…" />}

      {!cargando &&
        (editable ? (
          <GestionCategorias
            categorias={categorias}
            escribiendo={escribiendo}
            onEditar={(categoria) =>
              setFormulario({
                modo: 'edicion',
                categoria: structuredClone(original(categoria.id) ?? categoria),
              })
            }
            onEditarPlato={(categoria, plato) =>
              setPlatoEnEdicion({ categoriaId: categoria.id, categoria: categoria.nombre, plato })
            }
            onAlternarPlato={alternarPlato}
            onAlternar={alternar}
            onEliminar={eliminacion.pedir}
          />
        ) : (
          <>
            <CartaCliente categorias={categorias} vitrina={vitrina} busqueda={busqueda} />
            {!vitrina && <PieContacto />}
          </>
        ))}

      {formulario && (
        <FormularioCategoria
          modo={formulario.modo}
          categoria={formulario.categoria}
          enviando={escribiendo}
          onGuardar={guardarCategoria}
          onCerrar={() => setFormulario(null)}
        />
      )}

      {platoEnEdicion && (
        <FormularioPlato
          plato={platoEnEdicion.plato}
          categoria={platoEnEdicion.categoria}
          enviando={escribiendo}
          onGuardar={async (plato) => {
            const guardado = await guardarPlato(platoEnEdicion.categoriaId, plato, {
              titulo: 'Plato actualizado',
              texto: `${plato.nombre} quedó en ${moneda(plato.precio)}.`,
            })
            if (guardado) setPlatoEnEdicion(null)
          }}
          onCerrar={() => setPlatoEnEdicion(null)}
        />
      )}

      {eliminacion.objetivo && (
        <ConfirmarEliminacion
          entidad="la categoría"
          nombre={eliminacion.objetivo.nombre}
          consecuencias={[
            `Se eliminarán sus ${eliminacion.objetivo.productos.length} plato(s).`,
            'Dejará de verse en la carta del empleado y del cliente.',
          ]}
          requiereCasilla
          enviando={eliminacion.enviando}
          error={eliminacion.error}
          onConfirmar={confirmarBorrado}
          onCancelar={eliminacion.cancelar}
        />
      )}
    </>
  )
}
