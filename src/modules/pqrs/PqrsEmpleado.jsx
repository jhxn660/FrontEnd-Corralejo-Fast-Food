import { useCallback, useMemo, useState } from 'react'

import { useRecurso } from '../../hooks/useRecurso'
import { fechaCorta } from '../../utils/format'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'

import { pqrsApi } from './api'
import DetallePqrs from './DetallePqrs'
import { COLOR_ESTADO, ESTADOS, ICONO_ESTADO, NOMBRES_TIPO, colorDe, iconoDe } from './esquema'

/**
 * PQRS para el EMPLEADO: consulta todas las que enviaron los clientes (filtros, búsqueda y
 * detalle). Responder, cambiar el estado o eliminar es de administración (Moderación de PQRS);
 * el backend no se lo permite al empleado.
 */
export default function PqrsEmpleado() {
  const cargar = useCallback(() => pqrsApi.listar(), [])
  const { datos: solicitudes, cargando, error, recargar } = useRecurso(cargar, [])

  const [filtroEstado, setFiltroEstado] = useState('Todas')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')
  // El id y no el registro: si otro rol lo cambia, el detalle abierto se
  // actualiza con la siguiente sincronización.
  const [detalleId, setDetalleId] = useState(null)
  const detalle = solicitudes.find((registro) => registro.id === detalleId) ?? null

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

  return (
    <>
      <EncabezadoPagina
        titulo="PQRS de clientes"
        descripcion="Consulta las peticiones, quejas, reclamos y sugerencias que enviaron los clientes."
      >
        <button className="btn btn-outline-secondary" onClick={recargar} disabled={cargando}>
          <i className="fa-solid fa-rotate me-2" />
          Actualizar
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

                <span className={`badge bg-${COLOR_ESTADO[registro.estado] ?? 'secondary'} ms-auto`}>
                  {registro.estado}
                </span>

                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setDetalleId(registro.id)}
                  aria-label={`Ver ${registro.asunto}`}
                >
                  <i className="fa-solid fa-eye" />
                </button>
              </div>
            </article>
          </div>
        ))}
      </div>

      {detalle && <DetallePqrs pqrs={detalle} onCerrar={() => setDetalleId(null)} />}
    </>
  )
}
