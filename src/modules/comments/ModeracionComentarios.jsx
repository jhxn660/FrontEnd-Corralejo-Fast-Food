import { useCallback, useMemo, useState } from 'react'

import { useAvisos } from '../../context/AvisosContext'
import { useConfirmacion } from '../../hooks/useConfirmacion'
import { usePeticion } from '../../hooks/usePeticion'
import { useRecurso } from '../../hooks/useRecurso'
import { fechaCorta } from '../../utils/format'
import ConfirmarEliminacion from '../../components/ui/ConfirmarEliminacion'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'
import Estrellas from '../../components/ui/Estrellas'

import { moderacionApi } from './api'
import { nombrePublico } from './esquema'
import { estrellasDe, valoracionDe } from './valoracion'

const porFecha = (a, b) => new Date(b.fecha) - new Date(a.fecha)

/**
 * Moderación de Comentarios (administración): decide si cada comentario se ve en el muro
 * (PATCH /comments/:id/status) o lo elimina (DELETE /comments/:id).
 *
 * Solo se listan los comentarios con texto: una puntuación sin texto no tiene nada que
 * moderar, y cuenta en los indicadores desde que se registra.
 */
export default function ModeracionComentarios() {
  const cargar = useCallback(async () => (await moderacionApi.listarComentarios()).sort(porFecha), [])
  const { datos: comentarios, cargando, error, recargar } = useRecurso(cargar, [])
  const avisos = useAvisos()

  const [busqueda, setBusqueda] = useState('')
  const texto = busqueda.toLowerCase().trim()
  const filtrados = useMemo(
    () =>
      comentarios.filter(
        (comentario) => !texto || `${comentario.nombre ?? ''} ${comentario.texto}`.toLowerCase().includes(texto)
      ),
    [comentarios, texto]
  )

  const visibilidad = usePeticion(
    useCallback(
      async (comentario, visible) => {
        await moderacionApi.cambiarVisibilidad(comentario.id, visible)
        await recargar()
      },
      [recargar]
    )
  )

  // Los «me gusta» viven dentro del comentario, así que se van con él.
  const eliminacion = useConfirmacion((comentario) => moderacionApi.eliminarComentario(comentario.id), {
    alTerminar: recargar,
  })

  const alternarVisible = async (comentario) => {
    const mostrar = comentario.visible !== true
    const { ok, error: fallo } = await visibilidad.ejecutar(comentario, mostrar)
    if (!ok) {
      avisos.fallo('No se pudo cambiar la visibilidad', fallo)
      return
    }
    if (mostrar) avisos.exito('Comentario visible', 'Ya aparece en el muro del Establecimiento.')
    else avisos.error('Comentario oculto', 'Dejó de verse en el muro.')
  }

  const eliminar = async () => {
    if (await eliminacion.confirmar()) avisos.error('Comentario eliminado', 'Se borró del muro.')
  }

  const visibles = comentarios.filter((comentario) => comentario.visible === true).length

  return (
    <>
      <EncabezadoPagina
        titulo="Moderación de Comentarios"
        descripcion="Decide qué comentarios de los clientes se ven en el muro público."
      >
        <button className="btn btn-outline-secondary" onClick={recargar} disabled={cargando}>
          <i className="fa-solid fa-rotate me-2" />
          Actualizar
        </button>
      </EncabezadoPagina>

      <MensajeError texto={error} onReintentar={recargar} />

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body d-flex flex-wrap align-items-center gap-3">
          <span className="badge bg-dark">
            <i className="fa-solid fa-eye me-1" />
            {visibles}/{comentarios.length} visibles
          </span>
          <input
            className="form-control ms-auto"
            style={{ maxWidth: '22rem' }}
            placeholder="Buscar por nombre o contenido…"
            aria-label="Buscar comentarios"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
        </div>
      </div>

      {cargando && comentarios.length === 0 && <Cargando texto="Cargando comentarios…" />}

      <div className="card border-0 shadow-sm">
        {filtrados.length === 0 && !cargando && (
          <Vacio texto="Todavía no hay comentarios de clientes." icono="fa-comments" />
        )}
        <ul className="list-group list-group-flush">
          {filtrados.map((comentario) => {
            const visible = comentario.visible === true
            const valoracion = valoracionDe(comentario)

            return (
              <li className="list-group-item d-flex flex-wrap align-items-center gap-3" key={comentario.id}>
                <div className="flex-grow-1 min-width-0">
                  <p className="mb-0 fw-semibold">
                    {comentario.usuario
                      ? nombrePublico(comentario.nombre ?? comentario.usuario)
                      : 'Visitante sin cuenta'}{' '}
                    {valoracion > 0 && <Estrellas valor={estrellasDe(valoracion)} />}
                  </p>
                  <small className="text-secondary">
                    {fechaCorta(comentario.fecha)} · {comentario.likes} me gusta
                    {comentario.qr && (
                      <>
                        {' · '}
                        <i className="fa-solid fa-qrcode me-1" />
                        <code>{comentario.qr}</code>
                        {comentario.ticket && ` · ticket ${comentario.ticket}`}
                      </>
                    )}
                  </small>
                  <p className="small mb-0">{comentario.texto}</p>
                </div>

                <div className="form-check form-switch mb-0 flex-shrink-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id={`visible-${comentario.id}`}
                    checked={visible}
                    onChange={() => alternarVisible(comentario)}
                    disabled={visibilidad.enviando}
                  />
                  <label className="form-check-label small" htmlFor={`visible-${comentario.id}`}>
                    {visible ? 'Visible en el muro' : 'Oculto'}
                  </label>
                </div>

                <button
                  className="btn btn-sm btn-outline-danger flex-shrink-0"
                  onClick={() => eliminacion.pedir(comentario)}
                  aria-label="Eliminar comentario"
                >
                  <i className="fa-solid fa-trash-can" />
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {eliminacion.objetivo && (
        <ConfirmarEliminacion
          entidad="el comentario de"
          nombre={nombrePublico(eliminacion.objetivo.nombre)}
          consecuencias={['Desaparece del muro y no se puede recuperar. Para retirarlo sin borrarlo, ocúltalo.']}
          enviando={eliminacion.enviando}
          error={eliminacion.error}
          onConfirmar={eliminar}
          onCancelar={eliminacion.cancelar}
        />
      )}
    </>
  )
}
