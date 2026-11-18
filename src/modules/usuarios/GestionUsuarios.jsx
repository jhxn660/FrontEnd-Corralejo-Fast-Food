import { useCallback, useMemo, useState } from 'react'

import { useRecurso } from '../../hooks/useRecurso'
import { usePeticion } from '../../hooks/usePeticion'
import { useConfirmacion } from '../../hooks/useConfirmacion'
import { useAuth } from '../../context/AuthContext'
import { useAvisos } from '../../context/AvisosContext'
import { fechaCorta, inicialesDe } from '../../utils/format'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'
import ConfirmarEliminacion from '../../components/ui/ConfirmarEliminacion'
import { usuariosApi } from './api'
import {
  CUENTA_VACIA,
  ROLES_GESTIONABLES,
  ROL_CUENTA,
  aFormulario,
  aPayload,
  infoDe,
  puedeEliminarCuenta,
} from './esquema'
import FormularioUsuario from './FormularioUsuario'

const ESTADOS_FILTRO = { todos: 'Todos', activos: 'Activos', inactivos: 'Inactivos' }

/**
 * Panel exclusivo del Owner: cuentas de Administrador y Empleado.
 *
 * Listar, crear, editar, activar/desactivar y dar de baja. La baja pasa por un
 * modal que nombra la cuenta (RNF-01) y, si es un Administrador, exige además
 * marcar la casilla: es la cuenta con más alcance después del Owner.
 *
 * Quién puede dar de baja a quién sale de los permisos (config/roles.js), no de
 * comprobar el rol aquí: Administrador → ELIMINAR_ADMINS (solo Owner);
 * Empleado → ELIMINAR_EMPLEADOS (Owner y, de momento, Admin).
 *
 * Datos: `usuariosApi` (api.js). La ficha se guarda en json-server
 * (colección `usuarios`) y el alta crea además la cuenta de acceso en Supabase.
 */
export default function GestionUsuarios() {
  const { usuario, puede } = useAuth()
  const avisos = useAvisos()

  const cargar = useCallback(() => usuariosApi.listar(), [])
  const { datos: cuentas, cargando, error, recargar } = useRecurso(cargar, [])

  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('Todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [formulario, setFormulario] = useState(null)

  const visibles = useMemo(() => {
    const texto = busqueda.toLowerCase().trim()
    return cuentas
      .filter((cuenta) => {
        const coincideTexto =
          !texto ||
          `${cuenta.name} ${cuenta.email} ${cuenta.empleado_rol ?? ''}`.toLowerCase().includes(texto)
        const coincideRol = filtroRol === 'Todos' || cuenta.role === filtroRol
        const coincideEstado =
          filtroEstado === 'todos' ||
          (filtroEstado === 'activos' ? cuenta.state !== false : cuenta.state === false)
        return coincideTexto && coincideRol && coincideEstado
      })
      .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name))
  }, [cuentas, busqueda, filtroRol, filtroEstado])

  const resumen = useMemo(
    () => ({
      admins: cuentas.filter((cuenta) => cuenta.role === ROL_CUENTA.ADMIN).length,
      empleados: cuentas.filter((cuenta) => cuenta.role === ROL_CUENTA.EMPLEADO).length,
      activas: cuentas.filter((cuenta) => cuenta.state !== false).length,
      inactivas: cuentas.filter((cuenta) => cuenta.state === false).length,
    }),
    [cuentas]
  )

  const guardado = usePeticion(
    useCallback(
      async (valores) => {
        const creando = !valores.id
        const payload = aPayload(valores, { creando })
        if (creando) await usuariosApi.crear(payload)
        else await usuariosApi.actualizar(valores.id, payload)
        await recargar()
      },
      [recargar]
    )
  )

  const cambioEstado = usePeticion(
    useCallback(
      async (cuenta) => {
        const state = cuenta.state === false
        await usuariosApi.cambiarEstado(cuenta.id, state)
        await recargar()
        return state
      },
      [recargar]
    )
  )

  const eliminacion = useConfirmacion(
    (cuenta) => usuariosApi.eliminar(cuenta.id, { quien: usuario?.email ?? null }),
    { alTerminar: recargar }
  )

  const guardar = async (valores) => {
    const creando = !valores.id
    const { ok, error: fallo } = await guardado.ejecutar(valores)
    if (!ok) {
      avisos.fallo(creando ? 'No se pudo crear la cuenta' : 'No se pudo guardar', fallo)
      return
    }
    setFormulario(null)
    avisos.exito(
      creando ? 'Cuenta creada' : 'Cuenta actualizada',
      `${valores.name.trim()} · ${valores.role}.`
    )
  }

  const alternarEstado = async (cuenta) => {
    const { ok, datos: activa, error: fallo } = await cambioEstado.ejecutar(cuenta)
    if (!ok) {
      avisos.fallo('No se pudo cambiar el estado', fallo)
      return
    }
    if (activa) avisos.exito('Cuenta activada', `${cuenta.name} ya puede iniciar sesión.`)
    else avisos.informacion('Cuenta desactivada', `${cuenta.name} ya no puede iniciar sesión.`)
  }

  const eliminar = async () => {
    const { name, role } = eliminacion.objetivo ?? {}
    if (await eliminacion.confirmar()) {
      avisos.error('Cuenta dada de baja', `${name} (${role}) salió del equipo.`)
    }
  }

  const objetivo = eliminacion.objetivo
  const objetivoEsAdmin = objetivo?.role === ROL_CUENTA.ADMIN

  return (
    <>
      <EncabezadoPagina
        titulo="Gestión de Usuarios"
        descripcion="Cuentas de administradores y empleados: altas, cambios, acceso y bajas."
      >
        <button className="btn btn-outline-secondary" onClick={recargar} disabled={cargando}>
          <i className="fa-solid fa-rotate me-2" />
          Actualizar
        </button>
        <button className="btn btn-primary" onClick={() => setFormulario(CUENTA_VACIA)}>
          <i className="fa-solid fa-user-plus me-2" />
          Nueva cuenta
        </button>
      </EncabezadoPagina>

      <MensajeError texto={error} onReintentar={recargar} />

      <div className="row g-3 mb-3">
        {[
          { etiqueta: 'Administradores', valor: resumen.admins, icono: infoDe(ROL_CUENTA.ADMIN).icono },
          { etiqueta: 'Empleados', valor: resumen.empleados, icono: infoDe(ROL_CUENTA.EMPLEADO).icono },
          { etiqueta: 'Activas', valor: resumen.activas, icono: 'fa-circle-check', color: 'success' },
          { etiqueta: 'Inactivas', valor: resumen.inactivas, icono: 'fa-ban', color: 'secondary' },
        ].map(({ etiqueta, valor, icono, color }) => (
          <div className="col-6 col-lg-3" key={etiqueta}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body py-3 d-flex align-items-center gap-3">
                <div className="icon-tile icon-tile-sm d-flex align-items-center justify-content-center flex-shrink-0">
                  <i className={`fa-solid ${icono}`} />
                </div>
                <div className="min-width-0">
                  <p className="text-secondary small text-uppercase fw-semibold mb-0">{etiqueta}</p>
                  <p className={`h5 fw-bold mb-0 ${color ? `text-${color}` : ''}`}>{valor}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body row g-3 align-items-end">
          <div className="col-12 col-lg-6">
            <label className="form-label" htmlFor="buscar-usuario">
              Buscar
            </label>
            <div className="input-group">
              <span className="input-group-text bg-white">
                <i className="fa-solid fa-magnifying-glass text-secondary" />
              </span>
              <input
                id="buscar-usuario"
                className="form-control"
                placeholder="Nombre, correo o cargo…"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
              />
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <label className="form-label" htmlFor="filtro-rol-usuario">
              Rol
            </label>
            <select
              id="filtro-rol-usuario"
              className="form-select"
              value={filtroRol}
              onChange={(evento) => setFiltroRol(evento.target.value)}
            >
              <option>Todos</option>
              {ROLES_GESTIONABLES.map((rol) => (
                <option key={rol}>{rol}</option>
              ))}
            </select>
          </div>
          <div className="col-6 col-lg-3">
            <label className="form-label" htmlFor="filtro-estado-usuario">
              Estado
            </label>
            <select
              id="filtro-estado-usuario"
              className="form-select"
              value={filtroEstado}
              onChange={(evento) => setFiltroEstado(evento.target.value)}
            >
              {Object.entries(ESTADOS_FILTRO).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {cargando && cuentas.length === 0 && <Cargando texto="Cargando cuentas…" />}

      {!cargando && visibles.length === 0 && (
        <div className="card border-0 shadow-sm">
          <Vacio texto="Ninguna cuenta coincide con los filtros." icono="fa-user-slash" />
        </div>
      )}

      {visibles.length > 0 && (
        <div className="card border-0 shadow-sm">
          <ul className="list-group list-group-flush">
            {visibles.map((cuenta) => {
              const { icono, color } = infoDe(cuenta.role)
              const activa = cuenta.state !== false
              const eliminable = puedeEliminarCuenta(puede, cuenta)

              return (
                <li className="list-group-item d-flex flex-wrap align-items-center gap-3" key={cuenta.id}>
                  <div
                    className={`icon-tile icon-tile-sm d-flex align-items-center justify-content-center flex-shrink-0 fw-bold ${
                      activa ? '' : 'opacity-50'
                    }`}
                    aria-hidden="true"
                  >
                    {inicialesDe(cuenta.name)}
                  </div>

                  <div className="flex-grow-1 min-width-0">
                    <p className="mb-0 fw-semibold text-truncate">{cuenta.name}</p>
                    <small className="text-secondary d-block text-truncate">
                      {cuenta.email}
                      {cuenta.phone ? ` · ${cuenta.phone}` : ''}
                    </small>
                    <small className="text-secondary">
                      Alta: {fechaCorta(cuenta.createdAt)}
                      {cuenta.empleado_rol ? ` · ${cuenta.empleado_rol}` : ''}
                    </small>
                  </div>

                  <span className={`badge bg-${color} flex-shrink-0`}>
                    <i className={`fa-solid ${icono} me-1`} />
                    {cuenta.role}
                  </span>

                  <div className="form-check form-switch mb-0 flex-shrink-0">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id={`activa-${cuenta.id}`}
                      checked={activa}
                      onChange={() => alternarEstado(cuenta)}
                      disabled={cambioEstado.enviando}
                    />
                    <label className="form-check-label small" htmlFor={`activa-${cuenta.id}`}>
                      {activa ? 'Activa' : 'Inactiva'}
                    </label>
                  </div>

                  <div className="btn-group btn-group-sm flex-shrink-0">
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => setFormulario(aFormulario(cuenta))}
                      aria-label={`Editar a ${cuenta.name}`}
                    >
                      <i className="fa-solid fa-pen" />
                    </button>
                    {eliminable && (
                      <button
                        className="btn btn-outline-danger"
                        onClick={() => eliminacion.pedir(cuenta)}
                        aria-label={`Dar de baja a ${cuenta.name}`}
                      >
                        <i className="fa-solid fa-trash-can" />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {formulario && (
        <FormularioUsuario
          cuenta={formulario}
          enviando={guardado.enviando}
          onGuardar={guardar}
          onCerrar={() => setFormulario(null)}
        />
      )}

      {objetivo && puedeEliminarCuenta(puede, objetivo) && (
        <ConfirmarEliminacion
          entidad={objetivoEsAdmin ? 'al administrador' : 'al empleado'}
          nombre={objetivo.name}
          consecuencias={[
            `${objetivo.email} · ${objetivo.role}${objetivo.empleado_rol ? ` (${objetivo.empleado_rol})` : ''}.`,
            'No podrá volver a iniciar sesión y dejará de aparecer en esta lista.',
            'Su historial (ventas, productos, comentarios que registró) se conserva.',
          ]}
          requiereCasilla={objetivoEsAdmin}
          textoCasilla="Entiendo que esta cuenta perderá el acceso de administración."
          enviando={eliminacion.enviando}
          error={eliminacion.error}
          onConfirmar={eliminar}
          onCancelar={eliminacion.cancelar}
        />
      )}
    </>
  )
}
