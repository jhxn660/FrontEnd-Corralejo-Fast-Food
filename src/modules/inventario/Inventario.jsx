import { useCallback, useMemo, useState } from 'react'

import { api } from '../../services/api'
import { useRecurso } from '../../hooks/useRecurso'
import { moneda } from '../../utils/format'
import Modal from '../../components/ui/Modal'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, Error, Vacio } from '../../components/ui/Estado'
import ConfirmarEliminacion from '../../components/ui/ConfirmarEliminacion'
import { useConfirmacion } from '../../hooks/useConfirmacion'

const POR_PAGINA = 4

const CATEGORIAS = {
  Harinas: 'fa-solid fa-wheat-awn',
  Lácteos: 'fa-solid fa-cheese',
  Aceites: 'fa-solid fa-bottle-droplet',
  Carnes: 'fa-solid fa-drumstick-bite',
  Verduras: 'fa-solid fa-leaf',
}

const UNIDADES = ['Kilogramos (kg)', 'Litros (L)', 'Gramos (g)', 'Unidades (u)']

const FORM_VACIO = {
  nombre: '',
  descripcion: '',
  categoria: 'Harinas',
  unidad: UNIDADES[0],
  estado: 'Disponible',
  stockActual: 0,
  stockMinimo: 0,
  costo: 0,
  vencimiento: '',
  pesoUnidad: '',
  calorias: '',
}

const abreviatura = (unidad = '') => unidad.match(/\(([^)]+)\)/)?.[1] ?? unidad

const fechaLegible = (iso) => (iso ? iso.split('-').reverse().join('/') : '---')

export default function Inventario() {
  const cargar = useCallback(() => api.list('insumos'), [])
  const { datos: insumos, cargando, error, setError, recargar } = useRecurso(cargar, [])

  const [busqueda, setBusqueda] = useState('')
  const [categoria, setCategoria] = useState('Todos')
  const [pagina, setPagina] = useState(1)
  const [form, setForm] = useState(null)

  const filtrados = useMemo(() => {
    const texto = busqueda.toLowerCase()
    return insumos.filter((insumo) => {
      const coincideTexto = `${insumo.nombre} ${insumo.descripcion} ${insumo.categoria}`
        .toLowerCase()
        .includes(texto)
      const coincideCategoria = categoria === 'Todos' || insumo.categoria === categoria
      return coincideTexto && coincideCategoria
    })
  }, [insumos, busqueda, categoria])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const visibles = filtrados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

  const filtrar = (setter) => (e) => {
    setter(e.target.value)
    setPagina(1)
  }

  const actualizar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async (e) => {
    e.preventDefault()
    const payload = { ...form, icon: CATEGORIAS[form.categoria] ?? 'fa-solid fa-box' }
    try {
      if (form.id) await api.update('insumos', form.id, payload)
      else await api.create('insumos', payload)
      setForm(null)
      recargar()
    } catch (err) {
      setError(err.message)
    }
  }

  // RNF-01: el borrado pasa por un modal que nombra el insumo y bloquea el DOM.
  const eliminacion = useConfirmacion((insumo) => api.remove('insumos', insumo.id), {
    alTerminar: recargar,
  })

  return (
    <>
      <EncabezadoPagina titulo="Gestión de Inventario">
        <button className="btn btn-primary" onClick={() => setForm(FORM_VACIO)}>
          <i className="fa-solid fa-plus me-2" />
          Añadir insumo
        </button>
      </EncabezadoPagina>

      <Error texto={error} onReintentar={recargar} />

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body row g-3 align-items-end">
          <div className="col-12 col-md-6">
            <label className="form-label">Buscar</label>
            <div className="input-group">
              <span className="input-group-text bg-white">
                <i className="fa-solid fa-magnifying-glass text-secondary" />
              </span>
              <input
                className="form-control"
                placeholder="Buscar insumos…"
                value={busqueda}
                onChange={filtrar(setBusqueda)}
              />
            </div>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Categoría</label>
            <select className="form-select" value={categoria} onChange={filtrar(setCategoria)}>
              <option>Todos</option>
              {Object.keys(CATEGORIAS).map((cat) => (
                <option key={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-2 text-md-end">
            <span className="badge bg-secondary-subtle text-secondary-emphasis">
              {filtrados.length} resultado(s)
            </span>
          </div>
        </div>
      </div>

      {cargando && <Cargando texto="Cargando inventario…" />}
      {!cargando && filtrados.length === 0 && <Vacio texto="No se encontraron insumos." icono="fa-box-open" />}

      {visibles.map((insumo) => {
        const stockBajo = Number(insumo.stockActual) <= Number(insumo.stockMinimo)
        const datos = [
          ['Unidad', insumo.unidad],
          ['Stock actual', `${insumo.stockActual} ${abreviatura(insumo.unidad)}`],
          ['Stock mínimo', `${insumo.stockMinimo} ${abreviatura(insumo.unidad)}`],
          ['Costo unitario', `${moneda(insumo.costo)} por ${abreviatura(insumo.unidad)}`],
          ['Categoría', insumo.categoria],
          ['Vencimiento', fechaLegible(insumo.vencimiento)],
          ['Peso por unidad', insumo.pesoUnidad || '---'],
          ['Calorías / 100 g', insumo.calorias || '---'],
        ]

        return (
          <div className="card border-0 shadow-sm mb-3" key={insumo.id}>
            <div className="card-body">
              <div className="d-flex gap-3 mb-3">
                <div className="icon-tile d-flex align-items-center justify-content-center flex-shrink-0">
                  <i className={insumo.icon ?? 'fa-solid fa-box'} />
                </div>
                <div>
                  <h3 className="h6 fw-bold mb-1">{insumo.nombre}</h3>
                  <p className="text-secondary small mb-0">
                    {insumo.descripcion || 'Sin descripción'}
                  </p>
                </div>
              </div>

              <div className="row g-2 small">
                {datos.map(([etiqueta, valor]) => (
                  <div className="col-6 col-md-4 col-xl-3" key={etiqueta}>
                    <div className="text-secondary">{etiqueta}</div>
                    <div className="fw-semibold">{valor}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-footer bg-transparent d-flex flex-wrap align-items-center gap-2">
              <span className={`badge bg-${stockBajo ? 'danger' : 'success'}`}>
                {stockBajo ? 'Stock bajo' : 'Stock suficiente'}
              </span>
              <span className={`badge bg-${insumo.estado === 'Disponible' ? 'success' : 'danger'}`}>
                {insumo.estado}
              </span>
              <div className="ms-auto d-flex gap-2">
                <button className="btn btn-sm btn-outline-primary" onClick={() => setForm(insumo)}>
                  Editar
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => eliminacion.pedir(insumo)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {totalPaginas > 1 && (
        <nav className="d-flex justify-content-center">
          <ul className="pagination">
            <li className={`page-insumo ${paginaActual === 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPagina(paginaActual - 1)}>
                Anterior
              </button>
            </li>
            <li className="page-insumo disabled">
              <span className="page-link">
                Página {paginaActual} de {totalPaginas}
              </span>
            </li>
            <li className={`page-insumo ${paginaActual === totalPaginas ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPagina(paginaActual + 1)}>
                Siguiente
              </button>
            </li>
          </ul>
        </nav>
      )}

      {form && (
        <Modal
          titulo={form.id ? 'Editar insumo' : 'Añadir insumo'}
          icono="fa-box"
          tamano="modal-lg"
          onClose={() => setForm(null)}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={() => setForm(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" form="form-insumo" type="submit">
                Guardar
              </button>
            </>
          }
        >
          <form id="form-insumo" onSubmit={guardar} className="row g-3">
            <div className="col-12">
              <label className="form-label">Nombre</label>
              <input
                className="form-control"
                value={form.nombre}
                onChange={actualizar('nombre')}
                required
              />
            </div>
            <div className="col-12">
              <label className="form-label">Descripción</label>
              <textarea
                className="form-control"
                rows="2"
                value={form.descripcion}
                onChange={actualizar('descripcion')}
              />
            </div>
            <div className="col-sm-4">
              <label className="form-label">Categoría</label>
              <select
                className="form-select"
                value={form.categoria}
                onChange={actualizar('categoria')}
              >
                {Object.keys(CATEGORIAS).map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="col-sm-4">
              <label className="form-label">Unidad</label>
              <select className="form-select" value={form.unidad} onChange={actualizar('unidad')}>
                {UNIDADES.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="col-sm-4">
              <label className="form-label">Estado</label>
              <select className="form-select" value={form.estado} onChange={actualizar('estado')}>
                <option>Disponible</option>
                <option>Fuera de stock</option>
              </select>
            </div>
            <div className="col-sm-4">
              <label className="form-label">Stock actual</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                value={form.stockActual}
                onChange={actualizar('stockActual')}
                required
              />
            </div>
            <div className="col-sm-4">
              <label className="form-label">Stock mínimo</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                value={form.stockMinimo}
                onChange={actualizar('stockMinimo')}
                required
              />
            </div>
            <div className="col-sm-4">
              <label className="form-label">Costo unitario</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                value={form.costo}
                onChange={actualizar('costo')}
                required
              />
            </div>
            <div className="col-sm-4">
              <label className="form-label">Vencimiento</label>
              <input
                type="date"
                className="form-control"
                value={form.vencimiento}
                onChange={actualizar('vencimiento')}
              />
            </div>
            <div className="col-sm-4">
              <label className="form-label">Peso por unidad</label>
              <input
                className="form-control"
                placeholder="Ej. 500 g"
                value={form.pesoUnidad}
                onChange={actualizar('pesoUnidad')}
              />
            </div>
            <div className="col-sm-4">
              <label className="form-label">Calorías / 100 g</label>
              <input
                className="form-control"
                placeholder="Ej. 364 kcal"
                value={form.calorias}
                onChange={actualizar('calorias')}
              />
            </div>
          </form>
        </Modal>
      )}

      {eliminacion.objetivo && (
        <ConfirmarEliminacion
          entidad="el insumo"
          nombre={eliminacion.objetivo.nombre}
          consecuencias={['Se perderá su stock registrado y su histórico de costos.']}
          enviando={eliminacion.enviando}
          error={eliminacion.error}
          onConfirmar={eliminacion.confirmar}
          onCancelar={eliminacion.cancelar}
        />
      )}
    </>
  )
}
