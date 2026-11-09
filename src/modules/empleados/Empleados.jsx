import { useCallback, useState } from 'react'

import { api } from '../../services/api'
import { useRecurso } from '../../hooks/useRecurso'
import Modal from '../../components/ui/Modal'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, Error } from '../../components/ui/Estado'
import ConfirmarEliminacion from '../../components/ui/ConfirmarEliminacion'
import { useConfirmacion } from '../../hooks/useConfirmacion'

const FORM_VACIO = { name: '', schedule: '', role: '', status: 'Trabajando' }
const ROLES_EMPLEADO = ['Jefe', 'Cajero', 'Cocinero', 'Mesero']

export default function Empleados() {
  const cargar = useCallback(() => api.list('employees'), [])
  const { datos: empleados, cargando, error, setError, recargar } = useRecurso(cargar, [])

  const [form, setForm] = useState(null) // null = modal cerrado

  const editando = Boolean(form?.id)
  const actualizar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  const guardar = async (e) => {
    e.preventDefault()
    try {
      if (editando) await api.update('employees', form.id, form)
      else await api.create('employees', form)
      setForm(null)
      recargar()
    } catch (err) {
      setError(err.message)
    }
  }

  // RNF-01: nunca se borra un empleado sin un modal que diga cuál.
  const eliminacion = useConfirmacion((empleado) => api.remove('employees', empleado.id), {
    alTerminar: recargar,
  })

  const grupos = [
    { titulo: 'Empleados activos', estado: 'Trabajando', color: 'success' },
    { titulo: 'En descanso / inactivos', estado: 'Inactivo', color: 'danger' },
  ]

  return (
    <>
      <EncabezadoPagina titulo="Gestión de Empleados">
        <button className="btn btn-primary" onClick={() => setForm(FORM_VACIO)}>
          <i className="fa-solid fa-plus me-2" />
          Añadir empleado
        </button>
      </EncabezadoPagina>

      <Error texto={error} onReintentar={recargar} />

      {cargando ? (
        <Cargando texto="Cargando empleados…" />
      ) : (
        grupos.map(({ titulo, estado, color }) => {
          const lista = empleados.filter((emp) => emp.status === estado)
          return (
            <section key={estado} className="mb-4">
              <h2 className="h6 text-uppercase text-secondary d-flex align-items-center gap-2 mb-3">
                <span className={`badge rounded-pill bg-${color}`}>&nbsp;</span>
                {titulo}
              </h2>

              {lista.length === 0 ? (
                <p className="text-secondary fst-italic">Sin registros en este grupo.</p>
              ) : (
                <div className="row g-3">
                  {lista.map((emp) => (
                    <div className="col-12 col-sm-6 col-xl-4" key={emp.id}>
                      <div className={`card h-100 border-top border-4 border-${color} shadow-sm`}>
                        <div className="card-body text-center">
                          <i className="fa-solid fa-circle-user fs-1 text-secondary opacity-50" />
                          <h3 className="h6 fw-bold mt-2 mb-1">{emp.name}</h3>
                          <p className="text-brand small fw-semibold mb-2">{emp.role}</p>
                          <p className="text-secondary small mb-0">
                            <i className="fa-regular fa-clock me-1" />
                            {emp.schedule}
                          </p>
                        </div>
                        <div className="card-footer bg-transparent d-flex justify-content-center gap-2">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setForm(emp)}
                          >
                            <i className="fa-solid fa-pen" />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => eliminacion.pedir(emp)}
                          >
                            <i className="fa-solid fa-trash" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })
      )}

      {form && (
        <Modal
          titulo={editando ? 'Editar empleado' : 'Añadir empleado'}
          icono="fa-user"
          onClose={() => setForm(null)}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={() => setForm(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" form="form-empleado" type="submit">
                Guardar
              </button>
            </>
          }
        >
          <form id="form-empleado" onSubmit={guardar} className="row g-3">
            <div className="col-12">
              <label className="form-label">Nombre completo</label>
              <input
                className="form-control"
                value={form.name}
                onChange={actualizar('name')}
                placeholder="Ej. Carlos Ramírez"
                required
              />
            </div>
            <div className="col-12">
              <label className="form-label">Horario</label>
              <input
                className="form-control"
                value={form.schedule}
                onChange={actualizar('schedule')}
                placeholder="Ej. 08:00 AM - 04:00 PM"
                required
              />
            </div>
            <div className="col-sm-6">
              <label className="form-label">Rol</label>
              <select
                className="form-select"
                value={form.role}
                onChange={actualizar('role')}
                required
              >
                <option value="" disabled>
                  Seleccione un rol
                </option>
                {ROLES_EMPLEADO.map((rol) => (
                  <option key={rol}>{rol}</option>
                ))}
              </select>
            </div>
            <div className="col-sm-6">
              <label className="form-label">Estado</label>
              <select className="form-select" value={form.status} onChange={actualizar('status')}>
                <option>Trabajando</option>
                <option>Inactivo</option>
              </select>
            </div>
          </form>
        </Modal>
      )}

      {eliminacion.objetivo && (
        <ConfirmarEliminacion
          entidad="al empleado"
          nombre={eliminacion.objetivo.name}
          consecuencias={['Dejará de aparecer en los turnos y en la asignación de ventas.']}
          enviando={eliminacion.enviando}
          error={eliminacion.error}
          onConfirmar={eliminacion.confirmar}
          onCancelar={eliminacion.cancelar}
        />
      )}
    </>
  )
}
