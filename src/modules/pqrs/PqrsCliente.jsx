import { useCallback, useMemo, useState } from 'react'

import { api } from '../../services/api'
import { useRecurso } from '../../hooks/useRecurso'
import { usePeticion } from '../../hooks/usePeticion'
import { useAvisos } from '../../context/AvisosContext'
import { useAuth } from '../../context/AuthContext'
import { fechaCorta } from '../../utils/format'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'
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

/**
 * PQRS del cliente: CREAR y LEER, nada más.
 *
 * El cliente no edita ni elimina sus solicitudes: una PQRS es un registro de lo
 * que se pidió, y si se pudiera reescribir o borrar después, la respuesta del
 * local quedaría sin contexto. Por eso esta pantalla no tiene botones de editar
 * ni de eliminar, y el formulario solo se abre para solicitudes nuevas.
 *
 * Es una restricción de interfaz (R17): impedirlo de verdad le corresponde al
 * back, que debe rechazar PUT y DELETE sobre PQRS con rol cliente.
 */
export default function ClientePqrs() {
  // La sesión se toma del contexto: ningún componente la consulta por su cuenta (R5, R8).
  const { usuario } = useAuth()
  const avisos = useAvisos()

  // El filtro por usuario viaja a la API (?usuario=correo): las PQRS de otros
  // clientes ya no llegan a este navegador. Sin correo no se pide nada.
  const correo = usuario?.email ?? null
  const cargar = useCallback(
    () => (correo ? api.list('pqrs', { usuario: correo }) : Promise.resolve([])),
    [correo]
  )
  const { datos: todas, cargando, error, recargar } = useRecurso(cargar, [])

  const [nueva, setNueva] = useState(null) // solicitud en creación
  const [detalle, setDetalle] = useState(null)

  // Segundo seguro en el cliente: aunque la API ignorara el filtro, aquí solo
  // pasan las del usuario. DEUDA (R17): json-server no comprueba quién pregunta;
  // el back real debe filtrar por el token, no por un parámetro.
  const mias = useMemo(
    () =>
      todas
        .filter((registro) => Boolean(usuario?.email) && registro.usuario === usuario.email)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
    [todas, usuario]
  )

  const envio = usePeticion(
    useCallback(
      async (valores) => {
        await api.create('pqrs', {
          tipo: valores.tipo,
          asunto: valores.asunto.trim(),
          texto: valores.texto.trim(),
          nombre: usuario?.email ?? 'Cliente',
          usuario: usuario?.email ?? null,
          fecha: new Date().toISOString(),
          // El estado lo decide el local, nunca el cliente.
          estado: 'Pendiente',
        })
        await recargar()
      },
      [recargar, usuario]
    )
  )

  const enviar = async (valores) => {
    const { ok, error: fallo } = await envio.ejecutar(valores)
    if (!ok) {
      avisos.fallo('No se pudo enviar', fallo)
      return
    }
    setNueva(null)
    avisos.exito(`${valores.tipo} enviada`, 'La recibimos y te responderemos por este mismo panel.')
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

      {/* Cada botón abre el formulario con SU tipo ya fijado. */}
      <div className="row row-cols-2 row-cols-lg-4 g-3 mb-4">
        {NOMBRES_TIPO.map((tipo) => (
          <div className="col" key={tipo}>
            <button
              className="card card-clickable border-0 shadow-sm w-100 h-100 text-center p-3 cinta-superior"
              style={{ '--color-cinta': colorDe(tipo) }}
              onClick={() => setNueva(pqrsVacia(tipo))}
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

        {cargando && mias.length === 0 && <Cargando texto="Cargando solicitudes…" />}

        {!cargando && mias.length === 0 && (
          <Vacio texto="Aún no has enviado ninguna PQRS." icono="fa-inbox">
            <button className="btn btn-primary" onClick={() => setNueva(pqrsVacia('Petición'))}>
              <i className="fa-solid fa-plus me-2" />
              Enviar la primera
            </button>
          </Vacio>
        )}

        {mias.length > 0 && (
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
                {registro.respuesta && (
                  <span className="badge bg-success flex-shrink-0">
                    <i className="fa-solid fa-reply me-1" />
                    Respondida
                  </span>
                )}

                <button
                  className="btn btn-sm btn-outline-secondary flex-shrink-0"
                  onClick={() => setDetalle(registro)}
                >
                  <i className="fa-solid fa-eye me-2" />
                  Ver
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PieContacto />

      {detalle && <DetallePqrs pqrs={detalle} onCerrar={() => setDetalle(null)} />}

      {nueva && (
        <FormularioPqrs
          pqrs={nueva}
          tipoFijo
          enviando={envio.enviando}
          onGuardar={enviar}
          onCerrar={() => setNueva(null)}
        />
      )}
    </>
  )
}
