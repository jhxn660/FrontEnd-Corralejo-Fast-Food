import { useCallback, useMemo, useState } from 'react'

import { api } from '../../services/api'
import { useRecurso } from '../../hooks/useRecurso'
import { usePeticion } from '../../hooks/usePeticion'
import { useConfirmacion } from '../../hooks/useConfirmacion'
import { useAvisos } from '../../context/AvisosContext'
import { fechaCorta } from '../../utils/format'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'
import ConfirmarEliminacion from '../../components/ui/ConfirmarEliminacion'
import {
  COLOR_ESTADO,
  ESTADOS,
  ICONO_ESTADO,
  NOMBRES_TIPO,
  colorDe,
  iconoDe,
  pqrsVacia,
} from './esquema'
import FormularioPqrs from './FormularioPqrs'
import DetallePqrs from './DetallePqrs'

export default function EmpleadoPqrs() {
  const cargar = useCallback(() => api.list('pqrs'), [])
  const { datos: solicitudes, cargando, error, recargar } = useRecurso(cargar, [])
  const avisos = useAvisos()

  const [filtroEstado, setFiltroEstado] = useState('Todas')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')
  const [formulario, setFormulario] = useState(null)
  const [detalle, setDetalle] = useState(null)

  const visibles = useMemo(() => {
    const texto = busqueda.toLowerCase().trim()
    return solicitudes
      .filter((registro) => {
        const coincideEstado = filtroEstado === 'Todas' || registro.estado === filtroEstado
        const coincideTipo = filtroTipo === 'Todos' || registro.tipo === filtroTipo
        const coincideTexto =
          !texto ||
          `${registro.nombre ?? ''} ${registro.asunto ?? ''} ${registro.texto ?? ''}`
            .toLowerCase()
            .includes(texto)
        return coincideEstado && coincideTipo && coincideTexto
      })
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  }, [solicitudes, filtroEstado, filtroTipo, busqueda])

  const porEstado = useMemo(
    () =>
      ESTADOS.reduce(
        (cuenta, estado) => ({
          ...cuenta,
          [estado]: solicitudes.filter((registro) => registro.estado === estado).length,
        }),
        {}
      ),
    [solicitudes]
  )

  const guardado = usePeticion(
    useCallback(
      async (valores) => {
        const payload = {
          ...valores,
          asunto: valores.asunto.trim(),
          texto: valores.texto.trim(),
          nombre: valores.nombre?.trim() ?? '',
          fecha: valores.fecha ?? new Date().toISOString(),
        }
        if (valores.id) await api.update('pqrs', valores.id, payload)
        else await api.create('pqrs', payload)
        await recargar()
      },
      [recargar]
    )
  )

  // El empleado cambia el estado sin abrir el formulario completo: es la acción
  // que repite docenas de veces al día.
  const cambioEstado = usePeticion(
    useCallback(
      async (registro, estado) => {
        await api.patch('pqrs', registro.id, { estado })
        await recargar()
        return estado
      },
      [recargar]
    )
  )

  const guardar = async (valores) => {
    const editando = Boolean(valores.id)
    const { ok, error: fallo } = await guardado.ejecutar(valores)

    if (!ok) {
      avisos.fallo(editando ? 'No se pudo guardar' : 'No se pudo registrar', fallo)
      return
    }

    setFormulario(null)
    setDetalle(null)
    avisos.exito(
      editando ? 'Solicitud actualizada' : 'Solicitud registrada',
      `${valores.tipo} de ${valores.nombre?.trim() || 'un cliente'} quedó guardada.`
    )
  }

  const cambiarEstado = async (registro, estado) => {
    const { ok, error: fallo } = await cambioEstado.ejecutar(registro, estado)
    if (!ok) {
      avisos.fallo('No se pudo cambiar el estado', fallo)
      return
    }
    avisos.exito('Estado actualizado', `"${registro.asunto}" pasó a ${estado.toLowerCase()}.`)
  }

  // RNF-01: borrar la PQRS de un cliente es irreversible, así que se confirma
  // con casilla además del botón.
  const eliminacion = useConfirmacion((solicitud) => api.remove('pqrs', solicitud.id), {
    alTerminar: () => {
      recargar()
      setDetalle(null)
    },
  })

  const eliminar = async () => {
    const asunto = eliminacion.objetivo?.asunto
    if (await eliminacion.confirmar()) {
      avisos.error('Solicitud eliminada', `"${asunto}" salió del listado.`)
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Gestión de PQRS"
        descripcion="Administra las peticiones, quejas, reclamos y sugerencias recibidas."
      >
        <button className="btn btn-outline-secondary" onClick={recargar} disabled={cargando}>
          <i className="fa-solid fa-rotate me-2" />
          Actualizar
        </button>
        <button className="btn btn-primary" onClick={() => setFormulario(pqrsVacia())}>
          <i className="fa-solid fa-plus me-2" />
          Registrar solicitud
        </button>
      </EncabezadoPagina>

      <MensajeError texto={error} onReintentar={recargar} />

      <div className="row g-3 mb-3">
        {[
          { etiqueta: 'Recibidas', valor: solicitudes.length, icono: 'fa-inbox', color: 'secondary' },
          ...ESTADOS.map((estado) => ({
            etiqueta: estado,
            valor: porEstado[estado] ?? 0,
            icono: ICONO_ESTADO[estado],
            color: COLOR_ESTADO[estado],
          })),
        ].map(({ etiqueta, valor, icono, color }) => (
          <div className="col-6 col-lg-3" key={etiqueta}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body py-3 d-flex align-items-center gap-3">
                <div className="icon-tile icon-tile-sm d-flex align-items-center justify-content-center flex-shrink-0">
                  <i className={`fa-solid ${icono}`} />
                </div>
                <div className="min-width-0">
                  <p className="text-secondary small text-uppercase fw-semibold mb-0">{etiqueta}</p>
                  <p className={`h5 fw-bold mb-0 text-${color}`}>{valor}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body row g-3 align-items-end">
          <div className="col-12 col-lg-6">
            <label className="form-label" htmlFor="buscar-pqrs">
              Buscar
            </label>
            <div className="input-group">
              <span className="input-group-text bg-white">
                <i className="fa-solid fa-magnifying-glass text-secondary" />
              </span>
              <input
                id="buscar-pqrs"
                className="form-control"
                placeholder="Solicitante, asunto o contenido…"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
              />
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <label className="form-label" htmlFor="filtro-estado-pqrs">
              Estado
            </label>
            <select
              id="filtro-estado-pqrs"
              className="form-select"
              value={filtroEstado}
              onChange={(evento) => setFiltroEstado(evento.target.value)}
            >
              <option>Todas</option>
              {ESTADOS.map((estado) => (
                <option key={estado}>{estado}</option>
              ))}
            </select>
          </div>
          <div className="col-6 col-lg-3">
            <label className="form-label" htmlFor="filtro-tipo-pqrs">
              Tipo
            </label>
            <select
              id="filtro-tipo-pqrs"
              className="form-select"
              value={filtroTipo}
              onChange={(evento) => setFiltroTipo(evento.target.value)}
            >
              <option>Todos</option>
              {NOMBRES_TIPO.map((tipo) => (
                <option key={tipo}>{tipo}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {cargando && <Cargando texto="Cargando solicitudes…" />}

      {!cargando && visibles.length === 0 && (
        <div className="card border-0 shadow-sm">
          <Vacio texto="No hay solicitudes con esos filtros." icono="fa-clipboard-list" />
        </div>
      )}

      <div className="row g-3">
        {visibles.map((registro) => (
          <div className="col-12 col-xl-6" key={registro.id}>
            <article
              className="card h-100 border-0 shadow-sm cinta-superior"
              style={{ '--color-cinta': colorDe(registro.tipo) }}
            >
              <div className="card-body">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div
                    className="icon-tile d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ background: colorDe(registro.tipo) }}
                  >
                    <i className={`fa-solid ${iconoDe(registro.tipo)}`} />
                  </div>
                  <div className="flex-grow-1 min-width-0">
                    <p className="fw-bold mb-0">{registro.tipo}</p>
                    <small className="text-secondary d-block text-truncate">
                      De: {registro.nombre || 'sin identificar'}
                    </small>
                  </div>
                  <span
                    className={`badge bg-${COLOR_ESTADO[registro.estado] ?? 'secondary'} flex-shrink-0`}
                  >
                    <i className={`fa-solid ${ICONO_ESTADO[registro.estado] ?? 'fa-circle'} me-1`} />
                    {registro.estado}
                  </span>
                </div>

                {registro.asunto && <p className="fw-semibold mb-1">{registro.asunto}</p>}
                <p className="text-secondary small mb-0 recorte-3">{registro.texto}</p>
              </div>

              <div className="card-footer bg-transparent d-flex flex-wrap align-items-center gap-2">
                <small className="text-secondary">
                  <i className="fa-regular fa-calendar me-1" />
                  {fechaCorta(registro.fecha)}
                </small>

                <select
                  className="form-select form-select-sm ms-auto"
                  style={{ width: 'auto' }}
                  value={registro.estado}
                  onChange={(evento) => cambiarEstado(registro, evento.target.value)}
                  disabled={cambioEstado.enviando}
                  aria-label={`Estado de ${registro.asunto}`}
                >
                  {ESTADOS.map((estado) => (
                    <option key={estado}>{estado}</option>
                  ))}
                </select>

                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setDetalle(registro)}
                  aria-label={`Ver ${registro.asunto}`}
                >
                  <i className="fa-solid fa-eye" />
                </button>
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => setFormulario(registro)}
                  aria-label={`Editar ${registro.asunto}`}
                >
                  <i className="fa-solid fa-pen" />
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => eliminacion.pedir(registro)}
                  aria-label={`Eliminar ${registro.asunto}`}
                >
                  <i className="fa-solid fa-trash-can" />
                </button>
              </div>
            </article>
          </div>
        ))}
      </div>

      {detalle && !formulario && (
        <DetallePqrs
          pqrs={detalle}
          onEditar={(registro) => {
            setDetalle(null)
            setFormulario(registro)
          }}
          onCerrar={() => setDetalle(null)}
        />
      )}

      {formulario && (
        <FormularioPqrs
          pqrs={formulario}
          gestion
          enviando={guardado.enviando}
          onGuardar={guardar}
          onCerrar={() => setFormulario(null)}
        />
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
          onConfirmar={eliminar}
          onCancelar={eliminacion.cancelar}
        />
      )}
    </>
  )
}
