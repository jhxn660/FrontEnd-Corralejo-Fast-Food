import Modal from '../../components/ui/Modal'
import { fechaCorta } from '../../utils/format'
import { COLOR_ESTADO, ESTADOS, ICONO_ESTADO, colorDe, iconoDe } from './esquema'

/**
 * Consulta de una PQRS ya enviada.
 *
 * Es una pieza aparte del formulario porque ver y editar son dos cosas
 * distintas: antes el panel del cliente abría el formulario con los campos en
 * `readOnly`, y un cuadro de texto gris con un botón "Cerrar" al lado parece un
 * formulario que no responde. Aquí el texto es texto, y el seguimiento del
 * estado se ve como lo que es: una línea de tiempo con tres pasos.
 */
export default function DetallePqrs({ pqrs, onEditar, onCerrar }) {
  const pasoActual = ESTADOS.indexOf(pqrs.estado)

  return (
    <Modal
      titulo={pqrs.asunto || pqrs.tipo}
      icono={iconoDe(pqrs.tipo)}
      tamano="modal-lg"
      onClose={onCerrar}
      footer={
        <>
          <button className="btn btn-outline-secondary me-auto" onClick={onCerrar}>
            Cerrar
          </button>
          {onEditar && pqrs.estado !== 'Resuelta' && (
            <button className="btn btn-primary" onClick={() => onEditar(pqrs)}>
              <i className="fa-solid fa-pen me-2" />
              Editar solicitud
            </button>
          )}
        </>
      }
    >
      <div className="d-flex align-items-center gap-3 mb-4">
        <div
          className="icon-tile d-flex align-items-center justify-content-center flex-shrink-0"
          style={{ background: colorDe(pqrs.tipo) }}
        >
          <i className={`fa-solid ${iconoDe(pqrs.tipo)}`} />
        </div>
        <div className="min-width-0">
          <div className="d-flex flex-wrap gap-2 mb-1">
            <span className="badge bg-secondary">{pqrs.tipo}</span>
            <span className={`badge bg-${COLOR_ESTADO[pqrs.estado] ?? 'secondary'}`}>
              <i className={`fa-solid ${ICONO_ESTADO[pqrs.estado] ?? 'fa-circle'} me-1`} />
              {pqrs.estado}
            </span>
          </div>
          <small className="text-secondary">
            Enviada el {fechaCorta(pqrs.fecha)}
            {pqrs.nombre ? ` por ${pqrs.nombre}` : ''}
          </small>
        </div>
      </div>

      {/* Seguimiento: el cliente quiere saber en qué va, no solo leer una etiqueta. */}
      <ol className="list-unstyled d-flex gap-2 mb-4">
        {ESTADOS.map((estado, indice) => {
          const alcanzado = indice <= pasoActual
          return (
            <li className="flex-fill text-center" key={estado}>
              <div
                className={`progress mb-2 ${alcanzado ? '' : 'opacity-50'}`}
                style={{ height: 6 }}
              >
                <div
                  className={`progress-bar bg-${alcanzado ? COLOR_ESTADO[estado] : 'secondary'}`}
                  style={{ width: alcanzado ? '100%' : '0%' }}
                />
              </div>
              <small className={alcanzado ? 'fw-semibold' : 'text-secondary'}>
                <i className={`fa-solid ${ICONO_ESTADO[estado]} me-1`} />
                {estado}
              </small>
            </li>
          )
        })}
      </ol>

      {/* Respuesta del local: la escribe el administrador en Moderación. */}
      {pqrs.respuesta && (
        <section className="modal-resumen mb-4">
          <h3 className="h6 fw-bold text-uppercase text-secondary">
            <i className="fa-solid fa-reply text-brand me-2" />
            Respuesta del restaurante
          </h3>
          <p className="mb-1" style={{ whiteSpace: 'pre-line' }}>
            {pqrs.respuesta}
          </p>
          {pqrs.fechaRespuesta && (
            <small className="text-secondary">Respondida el {fechaCorta(pqrs.fechaRespuesta)}</small>
          )}
        </section>
      )}

      <section className="mb-0">
        <h3 className="h6 fw-bold text-uppercase text-secondary">Lo que nos contaste</h3>
        {/* `white-space: pre-line` conserva los saltos de línea que escribió la
            persona; sin eso el texto llega al empleado como un solo párrafo. */}
        <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>
          {pqrs.texto}
        </p>
      </section>
    </Modal>
  )
}
