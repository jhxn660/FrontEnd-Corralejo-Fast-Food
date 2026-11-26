import { useCallback, useMemo, useState } from 'react'

import { useRecurso } from '../../hooks/useRecurso'
import { usePeticion } from '../../hooks/usePeticion'
import { useAuth } from '../../context/AuthContext'
import { useAvisos } from '../../context/AvisosContext'
import { fechaCorta, inicialesDe } from '../../utils/format'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'
import Estrellas from '../../components/ui/Estrellas'
import { PIE_REGLAS, REGLAS_COMENTARIOS } from '../../data/contenido'
import { nombrePublico } from '../pqrs/esquema'
import { comentariosApi, meGustaApi } from './api'

const VISIBLES_AL_INICIO = 8
const LARGO_MINIMO = 10
const LARGO_MAXIMO = 300

/**
 * Muro público de comentarios, con el flujo completo del wireframe.
 *
 * TRES VISTAS, UNA PANTALLA
 * `lista` (los comentarios publicados y el botón de escribir), `formulario`
 * (quién eres, el texto y el contador) y `reglas` (las normas antes de
 * publicar). Se reemplazan en el mismo sitio en vez de abrir modales, como en
 * los wireframes: el formulario es la tarea principal de ese momento, no una
 * interrupción de otra cosa, y así también cabe en un móvil.
 *
 * QUÉ SE PUBLICA Y QUÉ NO
 * El comentario nace oculto y aparece cuando el administrador lo aprueba en
 * Moderación de PQRS.
 *
 * Desde aquí NO se puntúa: este formulario escribe un comentario sin ticket
 * detrás, y una nota sin compra que la respalde es lo que hubo que retirar en
 * su día (ver components/ui/Estrellas.jsx). Las estrellas que el muro sí pinta
 * son las de los comentarios que llegaron con un QR: ahí el tiquete demuestra
 * la compra, y la nota ya está contando en los indicadores.
 *
 * Quien quiera puntuar su pedido lo hace en CalificarPedido, con el código del
 * tiquete, registrado o no.
 */
export default function MuroComentarios({ puedeComentar = false, ancla = 'muro-comentarios' }) {
  const { usuario } = useAuth()
  const avisos = useAvisos()

  const cargarComentarios = useCallback(() => comentariosApi.listarPublicados(), [])
  const cargarMeGusta = useCallback(() => meGustaApi.listar(), [])

  const {
    datos: publicados,
    cargando,
    error,
    recargar: recargarComentarios,
  } = useRecurso(cargarComentarios, [])

  const { datos: votos, recargar: recargarMeGusta } = useRecurso(cargarMeGusta, [])

  const [vista, setVista] = useState('lista')
  const [abierto, setAbierto] = useState(true)
  const [verTodos, setVerTodos] = useState(false)
  const [texto, setTexto] = useState('')
  const [pendiente, setPendiente] = useState(null) // id del comentario en vuelo

  const correo = usuario?.email ?? null
  const yo = nombrePublico(correo)

  // Recuento de "me gusta" por comentario y cuál es el mío, en una pasada.
  const meGusta = useMemo(() => {
    const indice = new Map()
    votos.forEach((voto) => {
      const actual = indice.get(voto.comentario) ?? { total: 0, mio: null }
      actual.total += 1
      if (correo && voto.usuario === correo) actual.mio = voto.id
      indice.set(voto.comentario, actual)
    })
    return indice
  }, [votos, correo])

  const comentarios = useMemo(
    () => [...publicados].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
    [publicados]
  )

  const visibles = verTodos ? comentarios : comentarios.slice(0, VISIBLES_AL_INICIO)

  const envio = usePeticion(
    useCallback(
      async (contenido) => {
        await comentariosApi.publicar({
          texto: contenido,
          nombre: correo ?? 'Cliente',
          usuario: correo,
        })
        await recargarComentarios()
      },
      [correo, recargarComentarios]
    )
  )

  const voto = usePeticion(
    useCallback(
      async (comentario, mio) => {
        if (mio) await meGustaApi.quitar(mio)
        else await meGustaApi.dar({ comentario, usuario: correo })
        await recargarMeGusta()
      },
      [correo, recargarMeGusta]
    )
  )

  const publicar = async (evento) => {
    evento.preventDefault()
    const contenido = texto.trim()

    if (contenido.length < LARGO_MINIMO) {
      avisos.error('Comentario muy corto', `Escribe al menos ${LARGO_MINIMO} caracteres.`)
      return
    }

    const { ok, error: fallo } = await envio.ejecutar(contenido)
    if (!ok) {
      avisos.fallo('No se pudo enviar el comentario', fallo)
      return
    }

    setTexto('')
    setVista('lista')
    setAbierto(true)
    avisos.exito(
      '¡Gracias por tu comentario!',
      'Aparecerá en el muro cuando el restaurante lo apruebe.'
    )
  }

  const alternarMeGusta = async (comentario) => {
    if (!correo) return
    const { mio } = meGusta.get(comentario.id) ?? {}
    setPendiente(comentario.id)
    const { ok, error: fallo } = await voto.ejecutar(comentario.id, mio ?? null)
    setPendiente(null)
    if (!ok) avisos.fallo('No se pudo guardar tu me gusta', fallo)
  }

  // ---------- Vista: normas ----------
  if (vista === 'reglas') {
    return (
      <section className="card border-0 shadow-sm" id={ancla}>
        <div className="card-body p-4">
          <h2 className="h3 fw-bold text-center mb-4">Reglas a tener en cuenta.</h2>

          <ol className="list-group list-group-numbered list-group-flush border rounded mb-3">
            {REGLAS_COMENTARIOS.map(({ id, titulo, texto: detalle }) => (
              <li className="list-group-item py-3" key={id}>
                <strong className="d-block">{titulo}</strong>
                <span className="text-secondary small">{detalle}</span>
              </li>
            ))}
          </ol>

          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <p className="small text-secondary mb-0">{PIE_REGLAS}</p>
            <button
              className="btn btn-primary"
              onClick={() => setVista(puedeComentar ? 'formulario' : 'lista')}
            >
              <i className="fa-solid fa-arrow-left me-2" />
              Regresar a comentarios
            </button>
          </div>
        </div>
      </section>
    )
  }

  // ---------- Vista: formulario ----------
  if (vista === 'formulario') {
    return (
      <section className="card border-0 shadow-sm" id={ancla}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center gap-3 mb-4">
            <span
              className="icon-tile d-flex align-items-center justify-content-center flex-shrink-0 rounded-circle fw-bold"
              aria-hidden="true"
            >
              {inicialesDe(yo)}
            </span>
            <div className="min-width-0">
              <h2 className="h5 fw-bold mb-0 text-truncate">{yo}</h2>
              <small className="text-secondary">Así te verán los demás clientes.</small>
            </div>
          </div>

          <form onSubmit={publicar}>
            <label className="form-label" htmlFor="nuevo-comentario">
              Escribe tu comentario:
            </label>
            <textarea
              id="nuevo-comentario"
              className="form-control mb-2"
              rows="6"
              maxLength={LARGO_MAXIMO}
              placeholder="Escribe aquí tu comentario."
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              disabled={envio.enviando}
              autoFocus
            />

            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              <small className={texto.trim().length < LARGO_MINIMO ? 'text-secondary' : 'text-success'}>
                {texto.length}/{LARGO_MAXIMO} caracteres
                {texto.trim().length < LARGO_MINIMO &&
                  ` · mínimo ${LARGO_MINIMO}`}
              </small>
            </div>

            <div className="d-flex flex-wrap justify-content-center gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  setTexto('')
                  setVista('lista')
                }}
                disabled={envio.enviando}
              >
                Cancelar
              </button>
              <button className="btn btn-primary" type="submit" disabled={envio.enviando}>
                {envio.enviando ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                    Publicando…
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-paper-plane me-2" />
                    Publicar comentario
                  </>
                )}
              </button>
            </div>
          </form>

          <p className="text-center mt-3 mb-0">
            <button className="btn btn-link" onClick={() => setVista('reglas')}>
              Reglas a tener en cuenta para comentar
            </button>
          </p>
        </div>
      </section>
    )
  }

  // ---------- Vista: lista ----------
  return (
    <section className="card border-0 shadow-sm" id={ancla}>
      <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h2 className="h6 fw-bold mb-0">
          <i className="fa-solid fa-comments text-brand me-2" />
          Lo que dicen nuestros clientes
          {comentarios.length > 0 && (
            <span className="badge bg-secondary ms-2">{comentarios.length}</span>
          )}
        </h2>

        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => setAbierto(!abierto)}
          aria-expanded={abierto}
          aria-controls={`${ancla}-lista`}
        >
          <i className={`fa-solid fa-chevron-${abierto ? 'up' : 'down'} me-2`} />
          {abierto ? 'Ocultar' : 'Ver comentarios'}
        </button>
      </div>

      {abierto && (
        <div className="card-body" id={`${ancla}-lista`}>
          <MensajeError texto={error} onReintentar={recargarComentarios} />

          {cargando && comentarios.length === 0 && <Cargando texto="Cargando comentarios…" />}

          {!cargando && comentarios.length === 0 && (
            <Vacio texto="Aún no hay comentarios publicados." icono="fa-comments" />
          )}

          <div className="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-3">
            {visibles.map((comentario) => {
              const { total = 0, mio = null } = meGusta.get(comentario.id) ?? {}
              const autor = nombrePublico(comentario.nombre)

              return (
                <div className="col" key={comentario.id}>
                  <figure className="card h-100 border-0 shadow-sm cinta-superior p-3 mb-0">
                    <figcaption className="d-flex align-items-center gap-2 mb-2">
                      <span
                        className="icon-tile icon-tile-sm d-flex align-items-center justify-content-center flex-shrink-0 rounded-circle fw-bold small"
                        aria-hidden="true"
                      >
                        {inicialesDe(autor)}
                      </span>
                      <span className="min-width-0 flex-grow-1">
                        <strong className="d-block small text-truncate">{autor}</strong>
                        <small className="text-secondary">
                          Publicado: {fechaCorta(comentario.fecha)}
                        </small>
                      </span>
                      {/* Solo los comentarios con QR traen nota: el resto no
                          tiene compra que la respalde. */}
                      {comentario.qr && comentario.estrellas > 0 && (
                        <Estrellas valor={comentario.estrellas} clase="flex-shrink-0 small" />
                      )}
                    </figcaption>

                    {comentario.qr && (
                      <p className="small text-success mb-2">
                        <i className="fa-solid fa-circle-check me-1" />
                        Pedido verificado
                      </p>
                    )}

                    <blockquote className="flex-grow-1 mb-2">
                      <p className="small mb-0">{comentario.texto}</p>
                    </blockquote>

                    <div className="d-flex align-items-center justify-content-end gap-2">
                      <span className="small text-secondary">{total}</span>
                      <button
                        className={`btn btn-sm btn-link p-0 ${mio ? 'text-danger' : 'text-secondary'}`}
                        onClick={() => alternarMeGusta(comentario)}
                        disabled={!correo || pendiente === comentario.id}
                        aria-pressed={Boolean(mio)}
                        aria-label={
                          mio
                            ? `Quitar tu me gusta del comentario de ${autor}`
                            : `Me gusta el comentario de ${autor}`
                        }
                      >
                        <i className={`fa-${mio ? 'solid' : 'regular'} fa-heart fs-5`} />
                      </button>
                    </div>
                  </figure>
                </div>
              )
            })}
          </div>

          <div className="d-flex flex-wrap justify-content-center gap-2 mt-4">
            {comentarios.length > VISIBLES_AL_INICIO && (
              <button className="btn btn-outline-primary" onClick={() => setVerTodos(!verTodos)}>
                {verTodos ? 'Ver menos' : `Ver los ${comentarios.length} comentarios`}
              </button>
            )}

            {puedeComentar && (
              <button className="btn btn-primary" onClick={() => setVista('formulario')}>
                <i className="fa-solid fa-pen me-2" />
                Realizar comentario
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
