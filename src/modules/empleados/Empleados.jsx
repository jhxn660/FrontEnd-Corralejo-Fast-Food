import { useCallback, useMemo, useState } from 'react'

import { api } from '../../services/api'
import { useRecurso } from '../../hooks/useRecurso'
import { usePeticion } from '../../hooks/usePeticion'
import { useConfirmacion } from '../../hooks/useConfirmacion'
import { useAvisos } from '../../context/AvisosContext'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'
import ConfirmarEliminacion from '../../components/ui/ConfirmarEliminacion'
import {
  EMPLEADO_VACIO,
  ESTADOS,
  NOMBRES_CARGO,
  aEmpleadoApi,
  aFormulario,
  colorDe,
  horasDeTurno,
  iconoDe,
  inicialesDe,
  partesHorario,
} from './esquema'
import FormularioEmpleado from './FormularioEmpleado'

const GRUPOS = [
  { clave: 'Trabajando', titulo: 'En turno ahora', icono: 'fa-circle-check' },
  { clave: 'Inactivo', titulo: 'Fuera de turno', icono: 'fa-moon' },
]

export default function Empleados() {
  const cargar = useCallback(() => api.list('employees'), [])
  const { datos: empleados, cargando, error, recargar } = useRecurso(cargar, [])
  const avisos = useAvisos()

  const [formulario, setFormulario] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [cargo, setCargo] = useState('Todos')

  const guardado = usePeticion(
    useCallback(
      async (valores) => {
        const registro = aEmpleadoApi(valores)
        if (valores.id) await api.update('employees', valores.id, registro)
        else await api.create('employees', registro)
        await recargar()
      },
      [recargar]
    )
  )

  // Cambiar el turno de alguien es la operación más frecuente del día, así que
  // tiene su propio botón y no obliga a abrir el formulario completo.
  const cambioEstado = usePeticion(
    useCallback(
      async (empleado) => {
        const status = empleado.status === 'Trabajando' ? 'Inactivo' : 'Trabajando'
        await api.patch('employees', empleado.id, { status })
        await recargar()
        return status
      },
      [recargar]
    )
  )

  const visibles = useMemo(() => {
    const texto = busqueda.toLowerCase().trim()
    return empleados.filter((empleado) => {
      const coincideTexto =
        !texto || `${empleado.name} ${empleado.role}`.toLowerCase().includes(texto)
      const coincideCargo = cargo === 'Todos' || empleado.role === cargo
      return coincideTexto && coincideCargo
    })
  }, [empleados, busqueda, cargo])

  const resumen = useMemo(() => {
    const enTurno = empleados.filter((empleado) => empleado.status === 'Trabajando').length
    const horas = empleados.reduce((suma, empleado) => {
      const { inicio, fin } = partesHorario(empleado.schedule)
      return suma + (horasDeTurno(inicio, fin) ?? 0)
    }, 0)
    const cargos = new Set(empleados.map((empleado) => empleado.role).filter(Boolean)).size
    return { enTurno, horas: Math.round(horas), cargos }
  }, [empleados])

  const guardar = async (valores) => {
    const editando = Boolean(valores.id)
    const { ok, error: fallo } = await guardado.ejecutar(valores)

    if (!ok) {
      avisos.fallo(editando ? 'No se pudo guardar' : 'No se pudo añadir', fallo)
      return
    }

    setFormulario(null)
    avisos.exito(
      editando ? 'Empleado actualizado' : 'Empleado añadido',
      `${valores.name.trim()} quedó registrado como ${valores.role}.`
    )
  }

  const alternarEstado = async (empleado) => {
    const { ok, datos, error: fallo } = await cambioEstado.ejecutar(empleado)
    if (!ok) {
      avisos.fallo('No se pudo cambiar el estado', fallo)
      return
    }
    avisos.exito(
      datos === 'Trabajando' ? 'Empleado en turno' : 'Empleado fuera de turno',
      `${empleado.name} pasó a "${ESTADOS[datos]?.etiqueta ?? datos}".`
    )
  }

  // RNF-01: nunca se borra un empleado sin un modal que diga cuál.
  const eliminacion = useConfirmacion((empleado) => api.remove('employees', empleado.id), {
    alTerminar: recargar,
  })

  const eliminar = async () => {
    const nombre = eliminacion.objetivo?.name
    if (await eliminacion.confirmar()) {
      avisos.error('Empleado eliminado', `${nombre} salió de la lista del equipo.`)
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Gestión de Empleados"
        descripcion="Equipo del local, turnos del día y cargos asignados."
      >
        <button className="btn btn-outline-secondary" onClick={recargar} disabled={cargando}>
          <i className="fa-solid fa-rotate me-2" />
          Actualizar
        </button>
        <button className="btn btn-primary" onClick={() => setFormulario(EMPLEADO_VACIO)}>
          <i className="fa-solid fa-user-plus me-2" />
          Añadir empleado
        </button>
      </EncabezadoPagina>

      <MensajeError texto={error} onReintentar={recargar} />

      <div className="row g-3 mb-3">
        {[
          { etiqueta: 'Equipo registrado', valor: empleados.length, icono: 'fa-users' },
          { etiqueta: 'En turno ahora', valor: resumen.enTurno, icono: 'fa-circle-check' },
          { etiqueta: 'Horas de turno', valor: `${resumen.horas} h`, icono: 'fa-clock' },
          { etiqueta: 'Cargos cubiertos', valor: resumen.cargos, icono: 'fa-sitemap' },
        ].map(({ etiqueta, valor, icono }) => (
          <div className="col-6 col-lg-3" key={etiqueta}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body py-3 d-flex align-items-center gap-3">
                <div className="icon-tile icon-tile-sm d-flex align-items-center justify-content-center flex-shrink-0">
                  <i className={`fa-solid ${icono}`} />
                </div>
                <div className="min-width-0">
                  <p className="text-secondary small text-uppercase fw-semibold mb-0">{etiqueta}</p>
                  <p className="h5 fw-bold mb-0">{valor}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body row g-3 align-items-end">
          <div className="col-12 col-md-7">
            <label className="form-label" htmlFor="buscar-empleado">
              Buscar
            </label>
            <div className="input-group">
              <span className="input-group-text bg-white">
                <i className="fa-solid fa-magnifying-glass text-secondary" />
              </span>
              <input
                id="buscar-empleado"
                className="form-control"
                placeholder="Nombre o cargo…"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-md-5">
            <label className="form-label" htmlFor="filtro-cargo">
              Cargo
            </label>
            <select
              id="filtro-cargo"
              className="form-select"
              value={cargo}
              onChange={(evento) => setCargo(evento.target.value)}
            >
              <option>Todos</option>
              {NOMBRES_CARGO.map((nombre) => (
                <option key={nombre}>{nombre}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {cargando && <Cargando texto="Cargando empleados…" />}

      {!cargando && visibles.length === 0 && (
        <div className="card border-0 shadow-sm">
          <Vacio texto="Ningún empleado coincide con la búsqueda." icono="fa-user-slash" />
        </div>
      )}

      {!cargando &&
        visibles.length > 0 &&
        GRUPOS.map(({ clave, titulo, icono }) => {
          const lista = visibles.filter((empleado) => empleado.status === clave)
          if (lista.length === 0) return null

          const { color } = ESTADOS[clave]

          return (
            <section key={clave} className="mb-4">
              <h2 className="h6 text-uppercase text-secondary d-flex align-items-center gap-2 mb-3">
                <i className={`fa-solid ${icono} text-${color}`} />
                {titulo}
                <span className="badge bg-secondary">{lista.length}</span>
              </h2>

              <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-3 g-3">
                {lista.map((empleado) => {
                  const { inicio, fin } = partesHorario(empleado.schedule)
                  const horas = horasDeTurno(inicio, fin)
                  const enTurno = empleado.status === 'Trabajando'

                  return (
                    <div className="col" key={empleado.id}>
                      <article
                        className="card h-100 border-0 shadow-sm cinta-superior"
                        style={{ '--color-cinta': colorDe(empleado.role) }}
                      >
                        <div className="card-body">
                          <div className="d-flex align-items-center gap-3 mb-3">
                            <div
                              className="icon-tile d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
                              style={{ background: colorDe(empleado.role) }}
                              aria-hidden="true"
                            >
                              {inicialesDe(empleado.name)}
                            </div>
                            <div className="min-width-0 flex-grow-1">
                              <h3 className="h6 fw-bold mb-0 text-truncate">{empleado.name}</h3>
                              <small className="text-secondary">
                                <i className={`${iconoDe(empleado.role)} me-1`} />
                                {empleado.role || 'Sin cargo'}
                              </small>
                            </div>
                            <span className={`badge bg-${enTurno ? 'success' : 'secondary'} flex-shrink-0`}>
                              {ESTADOS[empleado.status]?.etiqueta ?? empleado.status}
                            </span>
                          </div>

                          <div className="border rounded p-2 d-flex justify-content-between align-items-center">
                            <span className="small">
                              <i className="fa-regular fa-clock text-brand me-2" />
                              {empleado.schedule}
                            </span>
                            {horas !== null && (
                              <span className="badge bg-secondary-subtle text-secondary-emphasis">
                                {horas} h
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="card-footer bg-transparent d-flex gap-2">
                          <button
                            className={`btn btn-sm flex-grow-1 btn-outline-${
                              enTurno ? 'secondary' : 'success'
                            }`}
                            onClick={() => alternarEstado(empleado)}
                            disabled={cambioEstado.enviando}
                          >
                            <i
                              className={`fa-solid ${enTurno ? 'fa-moon' : 'fa-circle-check'} me-2`}
                            />
                            {enTurno ? 'Marcar salida' : 'Marcar entrada'}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setFormulario(aFormulario(empleado))}
                            aria-label={`Editar a ${empleado.name}`}
                          >
                            <i className="fa-solid fa-pen" />
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => eliminacion.pedir(empleado)}
                            aria-label={`Eliminar a ${empleado.name}`}
                          >
                            <i className="fa-solid fa-trash-can" />
                          </button>
                        </div>
                      </article>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}

      {formulario && (
        <FormularioEmpleado
          empleado={formulario}
          enviando={guardado.enviando}
          onGuardar={guardar}
          onCerrar={() => setFormulario(null)}
        />
      )}

      {eliminacion.objetivo && (
        <ConfirmarEliminacion
          entidad="al empleado"
          nombre={eliminacion.objetivo.name}
          consecuencias={[
            `Cargo: ${eliminacion.objetivo.role || 'sin asignar'} · turno ${
              eliminacion.objetivo.schedule
            }.`,
            'Dejará de aparecer en los turnos y en la asignación de ventas.',
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
