import { useCallback, useMemo, useState } from 'react'

import { api } from '../../services/api'
import { useRecurso } from '../../hooks/useRecurso'
import { usePeticion } from '../../hooks/usePeticion'
import { useConfirmacion } from '../../hooks/useConfirmacion'
import { useAvisos } from '../../context/AvisosContext'
import { useAuth } from '../../context/AuthContext'
import { fechaCorta } from '../../utils/format'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'
import ConfirmarEliminacion from '../../components/ui/ConfirmarEliminacion'
import PieContacto from '../../components/ui/PieContacto'
import {
  COLOR_ESTADO,
  ICONO_ESTADO,
  NOMBRES_TIPO,
  ayudaDe,
  colorDe,
  iconoDe,
  pqrsVacia,
} from './esquema'
import FormularioPqrs from './FormularioPqrs'
import DetallePqrs from './DetallePqrs'

export default function ClientePqrs() {
  // La sesión se toma del contexto: ningún componente la consulta por su cuenta (R5, R8).
  const { usuario } = useAuth()
  const avisos = useAvisos()

  const cargar = useCallback(() => api.list('pqrs'), [])
  const { datos: todas, cargando, error, recargar } = useRecurso(cargar, [])

  const [formulario, setFormulario] = useState(null)
  const [detalle, setDetalle] = useState(null)

  // DEUDA (R17): el recorte por usuario debería hacerlo el servidor. Mientras
  // la colección viva en json-server, toda la tabla llega al navegador.
  const mias = useMemo(
    () =>
      todas
        .filter((registro) => !usuario || registro.usuario === usuario.email)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
    [todas, usuario]
  )

  const enviado = usePeticion(
    useCallback(
      async (valores) => {
        const payload = {
          ...valores,
          asunto: valores.asunto.trim(),
          texto: valores.texto.trim(),
          nombre: valores.nombre?.trim() || usuario?.email || 'Cliente',
          usuario: usuario?.email ?? null,
          fecha: valores.fecha ?? new Date().toISOString(),
        }

        if (valores.id) await api.update('pqrs', valores.id, payload)
        else await api.create('pqrs', payload)
        await recargar()
      },
      [recargar, usuario]
    )
  )

  const guardar = async (valores) => {
    const editando = Boolean(valores.id)
    const { ok, error: fallo } = await enviado.ejecutar(valores)

    if (!ok) {
      avisos.fallo(editando ? 'No se pudo guardar' : 'No se pudo enviar', fallo)
      return
    }

    setFormulario(null)
    setDetalle(null)
    avisos.exito(
      editando ? 'Solicitud actualizada' : `${valores.tipo} enviada`,
      editando
        ? `Guardamos los cambios de "${valores.asunto.trim()}".`
        : 'La recibimos y te responderemos por este mismo panel.'
    )
  }

  // RNF-01: el modal muestra el asunto, para no borrar la solicitud equivocada.
  const eliminacion = useConfirmacion((solicitud) => api.remove('pqrs', solicitud.id), {
    alTerminar: () => {
      recargar()
      setDetalle(null)
    },
  })

  const eliminar = async () => {
    const asunto = eliminacion.objetivo?.asunto
    if (await eliminacion.confirmar()) {
      avisos.error('Solicitud eliminada', `"${asunto}" dejó de estar en seguimiento.`)
    }
  }

  const porEstado = (estado) => mias.filter((registro) => registro.estado === estado).length

  return (
    <>
      <EncabezadoPagina
        titulo="PQRS"
        descripcion="Envía peticiones, quejas, reclamos y sugerencias; aquí mismo puedes consultarlas."
      >
        <button className="btn btn-outline-secondary" onClick={recargar} disabled={cargando}>
          <i className="fa-solid fa-rotate me-2" />
          Actualizar
        </button>
      </EncabezadoPagina>

      <MensajeError texto={error} onReintentar={recargar} />

      <h2 className="h6 fw-bold text-uppercase text-secondary mb-3">¿Qué quieres contarnos?</h2>

      <div className="row row-cols-2 row-cols-lg-4 g-3 mb-4">
        {NOMBRES_TIPO.map((tipo) => (
          <div className="col" key={tipo}>
            <button
              className="card card-clickable border-0 shadow-sm w-100 h-100 text-center p-3 cinta-superior"
              style={{ '--color-cinta': colorDe(tipo) }}
              onClick={() => setFormulario(pqrsVacia(tipo))}
            >
              <div
                className="icon-tile d-flex align-items-center justify-content-center mx-auto mb-2"
                style={{ background: colorDe(tipo) }}
              >
                <i className={`fa-solid ${iconoDe(tipo)}`} />
              </div>
              <span className="fw-bold">{tipo}</span>
              <span className="text-secondary small">{ayudaDe(tipo)}</span>
            </button>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
          <h2 className="h6 fw-bold mb-0">Mis solicitudes</h2>
          {mias.length > 0 && (
            <div className="d-flex flex-wrap gap-2">
              {['Pendiente', 'En revisión', 'Resuelta'].map((estado) => (
                <span className={`badge bg-${COLOR_ESTADO[estado]}`} key={estado}>
                  {porEstado(estado)} {estado.toLowerCase()}
                </span>
              ))}
            </div>
          )}
        </div>

        {cargando && <Cargando texto="Cargando solicitudes…" />}

        {!cargando && mias.length === 0 && (
          <Vacio texto="Aún no has enviado ninguna PQRS." icono="fa-inbox">
            <button
              className="btn btn-primary"
              onClick={() => setFormulario(pqrsVacia('Petición'))}
            >
              <i className="fa-solid fa-plus me-2" />
              Enviar la primera
            </button>
          </Vacio>
        )}

        {!cargando && mias.length > 0 && (
          <ul className="list-group list-group-flush">
            {mias.map((registro) => (
              <li
                className="list-group-item d-flex flex-wrap align-items-center gap-3"
                key={registro.id}
              >
                <div
                  className="icon-tile icon-tile-sm d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ background: colorDe(registro.tipo) }}
                >
                  <i className={`fa-solid ${iconoDe(registro.tipo)}`} />
                </div>

                <div className="flex-grow-1 min-width-0">
                  <p className="mb-0 fw-semibold text-truncate">{registro.asunto}</p>
                  <small className="text-secondary">
                    {registro.tipo} · {fechaCorta(registro.fecha)}
                  </small>
                </div>

                <span
                  className={`badge bg-${COLOR_ESTADO[registro.estado] ?? 'secondary'} flex-shrink-0`}
                >
                  <i className={`fa-solid ${ICONO_ESTADO[registro.estado] ?? 'fa-circle'} me-1`} />
                  {registro.estado}
                </span>

                <div className="btn-group btn-group-sm flex-shrink-0">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setDetalle(registro)}
                    aria-label={`Ver ${registro.asunto}`}
                  >
                    <i className="fa-solid fa-eye" />
                  </button>
                  {/* Una solicitud resuelta no se edita: cambiarla después de la
                      respuesta dejaría el historial sin sentido. */}
                  {registro.estado !== 'Resuelta' && (
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => setFormulario(registro)}
                      aria-label={`Editar ${registro.asunto}`}
                    >
                      <i className="fa-solid fa-pen" />
                    </button>
                  )}
                  <button
                    className="btn btn-outline-danger"
                    onClick={() => eliminacion.pedir(registro)}
                    aria-label={`Eliminar ${registro.asunto}`}
                  >
                    <i className="fa-solid fa-trash-can" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PieContacto />

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
          enviando={enviado.enviando}
          onGuardar={guardar}
          onCerrar={() => setFormulario(null)}
        />
      )}

      {eliminacion.objetivo && (
        <ConfirmarEliminacion
          entidad="la solicitud"
          nombre={eliminacion.objetivo.asunto}
          consecuencias={[
            `Tipo: ${eliminacion.objetivo.tipo} · estado ${eliminacion.objetivo.estado}.`,
            'Perderás el seguimiento de su respuesta.',
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
