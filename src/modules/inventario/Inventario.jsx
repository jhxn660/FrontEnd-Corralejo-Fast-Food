import { useCallback, useMemo, useState } from 'react'

import { api } from '../../services/api'
import { useRecurso } from '../../hooks/useRecurso'
import { usePeticion } from '../../hooks/usePeticion'
import { useConfirmacion } from '../../hooks/useConfirmacion'
import { useAvisos } from '../../context/AvisosContext'
import { moneda } from '../../utils/format'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'
import ConfirmarEliminacion from '../../components/ui/ConfirmarEliminacion'
import Paginacion from '../../components/ui/Paginacion'
import { INSUMO_VACIO, NOMBRES_CATEGORIA, nivelDe } from './esquema'
import TarjetaInsumo from './TarjetaInsumo'
import DetalleInsumo from './DetalleInsumo'
import FormularioInsumo from './FormularioInsumo'

// Doce por página: tres filas completas de cuatro en escritorio, y en móvil
// seis filas de dos. Cualquier otro número deja huecos en la última fila.
const POR_PAGINA = 12

const ORDENES = {
  nombre: { etiqueta: 'Nombre (A–Z)', comparar: (a, b) => a.nombre.localeCompare(b.nombre, 'es') },
  critico: {
    etiqueta: 'Más críticos primero',
    // El orden por criticidad es el que de verdad se usa a diario: pone arriba
    // lo que hay que reponer hoy.
    comparar: (a, b) => prioridad(a) - prioridad(b),
  },
  stock: {
    etiqueta: 'Mayor stock',
    comparar: (a, b) => Number(b.stockActual) - Number(a.stockActual),
  },
  costo: { etiqueta: 'Mayor costo', comparar: (a, b) => Number(b.costo) - Number(a.costo) },
}

const RANGO_NIVEL = { agotado: 0, bajo: 1, justo: 2, suficiente: 3 }
const prioridad = (insumo) => RANGO_NIVEL[nivelDe(insumo).clave] ?? 9

export default function Inventario() {
  const cargar = useCallback(() => api.list('insumos'), [])
  const { datos: insumos, cargando, error, recargar } = useRecurso(cargar, [])
  const avisos = useAvisos()

  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todas')
  const [soloCriticos, setSoloCriticos] = useState(false)
  const [orden, setOrden] = useState('critico')
  const [pagina, setPagina] = useState(1)

  const [formulario, setFormulario] = useState(null) // insumo en edición o alta
  const [detalle, setDetalle] = useState(null) // insumo cuya ficha está abierta

  const guardado = usePeticion(
    useCallback(
      async (insumo) => {
        if (insumo.id) await api.update('insumos', insumo.id, insumo)
        else await api.create('insumos', insumo)
        await recargar()
        return insumo
      },
      [recargar]
    )
  )

  const filtrados = useMemo(() => {
    const texto = busqueda.toLowerCase().trim()
    return insumos
      .filter((insumo) => {
        const coincideTexto =
          !texto ||
          `${insumo.nombre} ${insumo.descripcion ?? ''} ${insumo.categoria} ${
            insumo.proveedor ?? ''
          }`
            .toLowerCase()
            .includes(texto)
        const coincideCategoria = categoria === 'Todas' || insumo.categoria === categoria
        const coincideCritico = !soloCriticos || prioridad(insumo) <= 1
        return coincideTexto && coincideCategoria && coincideCritico
      })
      .sort((ORDENES[orden] ?? ORDENES.nombre).comparar)
  }, [insumos, busqueda, categoria, soloCriticos, orden])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

  // Un filtro nuevo debe devolver a la primera página: si no, filtrar estando
  // en la página 4 deja la rejilla vacía sin explicación.
  const filtrar = (setter) => (valor) => {
    setter(valor)
    setPagina(1)
  }

  const resumen = useMemo(() => {
    const criticos = insumos.filter((insumo) => prioridad(insumo) <= 1).length
    const valor = insumos.reduce(
      (suma, insumo) => suma + (Number(insumo.stockActual) || 0) * (Number(insumo.costo) || 0),
      0
    )
    return { criticos, valor }
  }, [insumos])

  const guardar = async (insumo) => {
    const editando = Boolean(insumo.id)
    const { ok, error: fallo } = await guardado.ejecutar(insumo)

    if (!ok) {
      avisos.fallo(editando ? 'No se pudo guardar' : 'No se pudo añadir', fallo)
      return
    }

    setFormulario(null)
    setDetalle(null)
    avisos.exito(
      editando ? 'Insumo actualizado' : 'Insumo añadido',
      `${insumo.nombre} quedó guardado en el inventario.`
    )
  }

  // RNF-01: el borrado pasa por un modal que nombra el insumo y bloquea el DOM.
  const eliminacion = useConfirmacion((insumo) => api.remove('insumos', insumo.id), {
    alTerminar: () => {
      recargar()
      setDetalle(null)
    },
  })

  const eliminar = async () => {
    const nombre = eliminacion.objetivo?.nombre
    // Si falla, el modal se queda abierto con el error (R60) y no se avisa de
    // un borrado que no ocurrió.
    if (await eliminacion.confirmar()) {
      avisos.error('Insumo eliminado', `${nombre} salió del inventario.`)
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Gestión de Inventario"
        descripcion="Controla existencias, costos y reposición de los insumos del local."
      >
        <button className="btn btn-outline-secondary" onClick={recargar} disabled={cargando}>
          <i className="fa-solid fa-rotate me-2" />
          Actualizar
        </button>
        <button className="btn btn-primary" onClick={() => setFormulario(INSUMO_VACIO)}>
          <i className="fa-solid fa-plus me-2" />
          Añadir insumo
        </button>
      </EncabezadoPagina>

      <MensajeError texto={error} onReintentar={recargar} />

      <div className="row g-3 mb-3">
        {[
          {
            etiqueta: 'Insumos registrados',
            valor: insumos.length,
            icono: 'fa-boxes-stacked',
            tono: 'secondary',
          },
          {
            etiqueta: 'Por reponer',
            valor: resumen.criticos,
            icono: 'fa-triangle-exclamation',
            tono: resumen.criticos > 0 ? 'danger' : 'success',
          },
          {
            etiqueta: 'Valor del inventario',
            valor: moneda(resumen.valor),
            icono: 'fa-coins',
            tono: 'secondary',
          },
        ].map(({ etiqueta, valor, icono, tono }) => (
          <div className="col-12 col-md-4" key={etiqueta}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body py-3 d-flex align-items-center gap-3">
                <div className="icon-tile icon-tile-sm d-flex align-items-center justify-content-center flex-shrink-0">
                  <i className={`fa-solid ${icono}`} />
                </div>
                <div className="min-width-0">
                  <p className="text-secondary small text-uppercase fw-semibold mb-0">{etiqueta}</p>
                  <p className={`h5 fw-bold mb-0 text-${tono}`}>{valor}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body row g-3 align-items-end">
          <div className="col-12 col-lg-4">
            <label className="form-label" htmlFor="buscar-insumo">
              Buscar
            </label>
            <div className="input-group">
              <span className="input-group-text bg-white">
                <i className="fa-solid fa-magnifying-glass text-secondary" />
              </span>
              <input
                id="buscar-insumo"
                className="form-control"
                placeholder="Nombre, categoría o proveedor…"
                value={busqueda}
                onChange={(evento) => filtrar(setBusqueda)(evento.target.value)}
              />
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <label className="form-label" htmlFor="filtro-categoria">
              Categoría
            </label>
            <select
              id="filtro-categoria"
              className="form-select"
              value={categoria}
              onChange={(evento) => filtrar(setCategoria)(evento.target.value)}
            >
              <option>Todas</option>
              {NOMBRES_CATEGORIA.map((nombre) => (
                <option key={nombre}>{nombre}</option>
              ))}
            </select>
          </div>

          <div className="col-6 col-lg-3">
            <label className="form-label" htmlFor="filtro-orden">
              Ordenar por
            </label>
            <select
              id="filtro-orden"
              className="form-select"
              value={orden}
              onChange={(evento) => setOrden(evento.target.value)}
            >
              {Object.entries(ORDENES).map(([clave, { etiqueta }]) => (
                <option key={clave} value={clave}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </div>

          <div className="col-12 col-lg-2">
            <div className="form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                id="solo-criticos"
                checked={soloCriticos}
                onChange={(evento) => filtrar(setSoloCriticos)(evento.target.checked)}
              />
              <label className="form-check-label small" htmlFor="solo-criticos">
                Solo por reponer
              </label>
            </div>
          </div>
        </div>
      </div>

      {cargando && <Cargando texto="Cargando inventario…" />}

      {!cargando && filtrados.length === 0 && (
        <div className="card border-0 shadow-sm">
          <Vacio texto="Ningún insumo coincide con los filtros." icono="fa-box-open">
            <button
              className="btn btn-outline-secondary"
              onClick={() => {
                setBusqueda('')
                setCategoria('Todas')
                setSoloCriticos(false)
                setPagina(1)
              }}
            >
              Limpiar filtros
            </button>
          </Vacio>
        </div>
      )}

      {!cargando && filtrados.length > 0 && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-2 small text-secondary">
            <span>
              Mostrando <strong>{visibles.length}</strong> de <strong>{filtrados.length}</strong>{' '}
              insumo(s)
            </span>
            <span>
              Página {paginaActual} de {totalPaginas}
            </span>
          </div>

          {/* Cuatro a lo ancho en escritorio, tres en tableta y dos en móvil. */}
          <div className="row row-cols-2 row-cols-md-3 row-cols-xl-4 g-3">
            {visibles.map((insumo) => (
              <TarjetaInsumo
                key={insumo.id}
                insumo={insumo}
                onAbrir={setDetalle}
                onEditar={setFormulario}
                onEliminar={eliminacion.pedir}
              />
            ))}
          </div>

          <Paginacion
            pagina={paginaActual}
            totalPaginas={totalPaginas}
            onCambiar={setPagina}
            etiqueta="Páginas del inventario"
          />
        </>
      )}

      {detalle && !formulario && (
        <DetalleInsumo
          insumo={detalle}
          onEditar={setFormulario}
          onEliminar={eliminacion.pedir}
          onCerrar={() => setDetalle(null)}
        />
      )}

      {formulario && (
        <FormularioInsumo
          insumo={formulario}
          enviando={guardado.enviando}
          onGuardar={guardar}
          onCerrar={() => setFormulario(null)}
        />
      )}

      {eliminacion.objetivo && (
        <ConfirmarEliminacion
          entidad="el insumo"
          nombre={eliminacion.objetivo.nombre}
          consecuencias={[
            'Se perderá su stock registrado y su histórico de costos.',
            `Valor inmovilizado que deja de contarse: ${moneda(
              (Number(eliminacion.objetivo.stockActual) || 0) *
                (Number(eliminacion.objetivo.costo) || 0)
            )}.`,
          ]}
          enviando={eliminacion.enviando}
          error={eliminacion.error}
          onConfirmar={eliminar}
          onCancelar={eliminacion.cancelar}
        />
      )}
    </>
  )
}
