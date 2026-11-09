import { useCallback, useMemo, useState } from 'react'

import { api } from '../../services/api'
import { useRecurso } from '../../hooks/useRecurso'
import { fechaCorta } from '../../utils/format'
import { TIPOS, ESTADOS, COLOR_ESTADO, iconoDe, pqrsVacia } from './esquema'
import Modal from '../../components/ui/Modal'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, Error, Vacio } from '../../components/ui/Estado'
import ConfirmarEliminacion from '../../components/ui/ConfirmarEliminacion'
import { useConfirmacion } from '../../hooks/useConfirmacion'

export default function EmpleadoPqrs() {
  const cargar = useCallback(() => api.list('pqrs'), [])
  const { datos: solicitudes, cargando, error, setError, recargar } = useRecurso(cargar, [])

  const [filtro, setFiltro] = useState('Todas')
  const [form, setForm] = useState(null)

  const visibles = useMemo(
    () =>
      solicitudes
        .filter((p) => filtro === 'Todas' || p.estado === filtro)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
    [solicitudes, filtro]
  )

  const actualizar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...form, fecha: form.fecha ?? new Date().toISOString() }
      if (form.id) await api.update('pqrs', form.id, payload)
      else await api.create('pqrs', payload)
      setForm(null)
      recargar()
    } catch (err) {
      setError(err.message)
    }
  }

  // El empleado puede cambiar el estado sin abrir el modal completo.
  const cambiarEstado = async (registro, estado) => {
    try {
      await api.patch('pqrs', registro.id, { estado })
      recargar()
    } catch (err) {
      setError(err.message)
    }
  }

  // RNF-01: borrar la PQRS de un cliente es irreversible, así que se confirma
  // con casilla además del botón.
  const eliminacion = useConfirmacion((solicitud) => api.remove('pqrs', solicitud.id), {
    alTerminar: recargar,
  })

  return (
    <>
      <EncabezadoPagina
        titulo="Gestión de PQRS"
        descripcion="Administra las peticiones, quejas, reclamos y sugerencias recibidas."
      >
        <select
          className="form-select"
          style={{ width: 'auto' }}
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        >
          <option>Todas</option>
          {ESTADOS.map((estado) => (
            <option key={estado}>{estado}</option>
          ))}
        </select>
      </EncabezadoPagina>

      <Error texto={error} onReintentar={recargar} />

      <div className="row g-3 mb-4">
        {Object.entries(TIPOS).map(([tipo, icono]) => (
          <div className="col-6 col-lg-3" key={tipo}>
            <button
              className="card card-clickable border-0 shadow-sm w-100 h-100 text-center p-3"
              onClick={() => setForm(pqrsVacia(tipo))}
            >
              <i className={`fa-solid ${icono} fs-2 text-brand mb-2`} />
              <span className="fw-semibold">Registrar {tipo.toLowerCase()}</span>
            </button>
          </div>
        ))}
      </div>

      <h2 className="h6 fw-bold mb-3">Solicitudes registradas ({visibles.length})</h2>

      {cargando && <Cargando texto="Cargando solicitudes…" />}
      {!cargando && visibles.length === 0 && (
        <Vacio texto="No hay solicitudes con ese filtro." icono="fa-clipboard-list" />
      )}

      <div className="row g-3">
        {visibles.map((item) => (
          <div className="col-12 col-xl-6" key={item.id}>
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className="icon-tile d-flex align-items-center justify-content-center flex-shrink-0">
                    <i className={`fa-solid ${iconoDe(item.tipo)}`} />
                  </div>
                  <div className="flex-grow-1 min-width-0">
                    <p className="fw-bold mb-0">{item.tipo}</p>
                    <small className="text-secondary">De: {item.nombre}</small>
                  </div>
                  <span className={`badge bg-${COLOR_ESTADO[item.estado] ?? 'secondary'}`}>
                    {item.estado}
                  </span>
                </div>

                {item.asunto && <p className="fw-semibold mb-1">{item.asunto}</p>}
                <p className="text-secondary small mb-0">{item.texto}</p>
              </div>

              <div className="card-footer bg-transparent d-flex flex-wrap align-items-center gap-2">
                <small className="text-secondary">{fechaCorta(item.fecha)}</small>

                <select
                  className="form-select form-select-sm ms-auto"
                  style={{ width: 'auto' }}
                  value={item.estado}
                  onChange={(e) => cambiarEstado(item, e.target.value)}
                >
                  {ESTADOS.map((estado) => (
                    <option key={estado}>{estado}</option>
                  ))}
                </select>

                <button className="btn btn-sm btn-outline-primary" onClick={() => setForm(item)}>
                  <i className="fa-solid fa-pen" />
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => eliminacion.pedir(item)}
                >
                  <i className="fa-solid fa-trash" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {form && (
        <Modal
          titulo={form.id ? `Editar ${form.tipo}` : `Nueva ${form.tipo}`}
          icono={iconoDe(form.tipo)}
          onClose={() => setForm(null)}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={() => setForm(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" form="form-pqrs-emp" type="submit">
                {form.id ? 'Guardar cambios' : 'Registrar'}
              </button>
            </>
          }
        >
          <form id="form-pqrs-emp" onSubmit={guardar} className="d-grid gap-3">
            <div>
              <label className="form-label">Tipo de solicitud</label>
              <select className="form-select" value={form.tipo} onChange={actualizar('tipo')}>
                {Object.keys(TIPOS).map((tipo) => (
                  <option key={tipo}>{tipo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Nombre del solicitante</label>
              <input
                className="form-control"
                value={form.nombre}
                onChange={actualizar('nombre')}
                required
              />
            </div>
            <div>
              <label className="form-label">Asunto</label>
              <input className="form-control" value={form.asunto} onChange={actualizar('asunto')} />
            </div>
            <div>
              <label className="form-label">Descripción</label>
              <textarea
                className="form-control"
                rows="4"
                value={form.texto}
                onChange={actualizar('texto')}
                required
              />
            </div>
            <div>
              <label className="form-label">Estado</label>
              <select className="form-select" value={form.estado} onChange={actualizar('estado')}>
                {ESTADOS.map((estado) => (
                  <option key={estado}>{estado}</option>
                ))}
              </select>
            </div>
          </form>
        </Modal>
      )}

      {eliminacion.objetivo && (
        <ConfirmarEliminacion
          entidad="la solicitud de"
          nombre={eliminacion.objetivo.nombre || 'un cliente'}
          consecuencias={[
            `Asunto: ${eliminacion.objetivo.asunto}`,
            'El cliente dejará de ver su solicitud y su estado.',
          ]}
          requiereCasilla
          enviando={eliminacion.enviando}
          error={eliminacion.error}
          onConfirmar={eliminacion.confirmar}
          onCancelar={eliminacion.cancelar}
        />
      )}
    </>
  )
}
