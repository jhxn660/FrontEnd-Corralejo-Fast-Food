import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import logo from '../../assets/logo.png'
import { useRecurso } from '../../hooks/useRecurso'
import { usePeticion } from '../../hooks/usePeticion'
import { useAuth } from '../../context/AuthContext'
import { useAvisos } from '../../context/AvisosContext'
import { PERMISO } from '../../config/roles'
import { fechaCorta, inicialesDe } from '../../utils/format'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'
import Estrellas from '../../components/ui/Estrellas'
import { nombrePublico } from '../pqrs/esquema'
import { meGustaApi, opinionesApi } from './api'
import { VALORACION_MAXIMA, estrellasDe } from './valoracion'

const VISIBLES_AL_INICIO = 8

/** Identidad por defecto de quien opina sin cuenta (compró y escaneó el QR). */
const AUTOR_ANONIMO = 'Corralejo Cliente'

const FILTROS = [
  { clave: 'todas', etiqueta: 'Todas', icono: 'fa-layer-group' },
  { clave: 'comentarios', etiqueta: 'Comentarios', icono: 'fa-comments' },
]

/** Nombre público y si es anónimo (sin cuenta → logo + "Corralejo Cliente"). */
const autorDe = (opinion) =>
  opinion.usuario
    ? { nombre: nombrePublico(opinion.nombre ?? opinion.usuario), anonimo: false }
    : { nombre: AUTOR_ANONIMO, anonimo: true }

/**
 * "Lo que dicen nuestros clientes": un solo componente para los comentarios
 * del muro y las valoraciones de pedidos.
 *
 * TARJETA
 * Autor (avatar + nombre) arriba y, debajo, solo los valores sin etiquetas:
 * la valoración 1-10 en 5 estrellas (cada unidad = media estrella) con "N/10",
 * la fecha y la descripción. Al pie, el "me gusta" con su contador.
 *
 * QUIÉN VE QUÉ
 * - Admin y Owner (PERMISO.VER_DETALLE_OPINIONES): además, los productos
 *   calificados y el ticket/QR, para auditar que hubo compra.
 * - Visitante y Cliente: solo la opinión general. Los productos ni siquiera
 *   llegan al componente (opinionesApi.listar los quita).
 * - Sin cuenta: el autor es "Corralejo Cliente" con el logo de la casa.
 *
 * Aquí no se califica: la valoración se da al escanear el QR del tiquete
 * (/calificar/:qr, CalificarPedido), con o sin cuenta.
 *
 * Los comentarios SOLO se escriben desde el QR del tiquete: `puedeComentar` muestra un
 * botón que lleva a /calificar. `ancla` es el id al que enlaza la Lista Top (`…#ancla`).
 */
export default function OpinionesClientes({ puedeComentar = false, ancla = 'muro-comentarios' }) {
  const { usuario, puede } = useAuth()
  const avisos = useAvisos()
  const { hash } = useLocation()

  const conDetalle = puede(PERMISO.VER_DETALLE_OPINIONES)

  const cargarOpiniones = useCallback(() => opinionesApi.listar({ conDetalle }), [conDetalle])
  const { datos: opiniones, cargando, error, recargar } = useRecurso(cargarOpiniones, [])

  const [filtro, setFiltro] = useState('todas')
  const [verTodas, setVerTodas] = useState(false)
  const [pendiente, setPendiente] = useState(null) // id con el me gusta en vuelo

  const correo = usuario?.email ?? null

  // La Lista Top enlaza aquí desde cualquier pantalla; el router no desplaza solo.
  useEffect(() => {
    if (hash === `#${ancla}`) {
      document.getElementById(ancla)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [hash, ancla])

  // "Me gusta" de cada opinión: el contador y si YO ya lo di vienen del backend.
  const meGusta = useMemo(
    () => new Map(opiniones.map((opinion) => [opinion.id, { total: opinion.likes, mio: opinion.meGusta }])),
    [opiniones]
  )

  const filtradas = useMemo(() => {
    if (filtro === 'comentarios') return opiniones.filter((opinion) => opinion.texto)
    return opiniones
  }, [opiniones, filtro])

  const visibles = verTodas ? filtradas : filtradas.slice(0, VISIBLES_AL_INICIO)

  const promedio = useMemo(() => {
    const valoradas = opiniones.filter((opinion) => opinion.valoracion > 0)
    if (valoradas.length === 0) return null
    const suma = valoradas.reduce((total, opinion) => total + opinion.valoracion, 0)
    return { valor: Math.round((suma / valoradas.length) * 10) / 10, total: valoradas.length }
  }, [opiniones])

  // El mismo botón da o quita el "me gusta"; el backend lleva la cuenta por persona.
  const voto = usePeticion(
    useCallback(
      async (id) => {
        await meGustaApi.alternar(id)
        await recargar()
      },
      [recargar]
    )
  )

  // Sin sesión no hay a quién atribuir el "me gusta".
  const alternarMeGusta = async (opinion) => {
    if (!correo) return
    setPendiente(opinion.id)
    const { ok, error: fallo } = await voto.ejecutar(opinion.id)
    setPendiente(null)
    if (!ok) avisos.fallo('No se pudo guardar tu me gusta', fallo)
  }

  return (
    <section className="card border-0 shadow-sm mb-3" id={ancla} aria-labelledby={`${ancla}-titulo`}>
      <div className="card-header bg-white d-flex flex-wrap justify-content-between align-items-center gap-2">
        <h2 className="h6 fw-bold mb-0" id={`${ancla}-titulo`}>
          <i className="fa-solid fa-comments text-brand me-2" />
          Lo que dicen nuestros clientes
          {opiniones.length > 0 && <span className="badge bg-secondary ms-2">{opiniones.length}</span>}
        </h2>

        {promedio && (
          <span className="d-inline-flex align-items-center gap-2 small">
            <Estrellas valor={estrellasDe(promedio.valor)} />
            <strong>
              {promedio.valor.toLocaleString('es-CO')}/{VALORACION_MAXIMA}
            </strong>
            <span className="text-secondary">· {promedio.total} valoraciones</span>
          </span>
        )}
      </div>

      <div className="card-body">
          <>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
              <div className="btn-group btn-group-sm" role="group" aria-label="Filtrar opiniones">
                {FILTROS.map(({ clave, etiqueta, icono }) => (
                  <button
                    key={clave}
                    type="button"
                    className={`btn ${filtro === clave ? 'btn-primary' : 'btn-outline-secondary'}`}
                    aria-pressed={filtro === clave}
                    onClick={() => setFiltro(clave)}
                  >
                    <i className={`fa-solid ${icono} me-2`} />
                    {etiqueta}
                  </button>
                ))}
              </div>

              {/* Comentar exige el QR del tiquete: el botón lleva a esa pantalla */}
              {puedeComentar && (
                <Link className="btn btn-primary btn-sm" to="/calificar">
                  <i className="fa-solid fa-qrcode me-2" />
                  Calificar mi pedido
                </Link>
              )}
            </div>

            <MensajeError texto={error} onReintentar={recargar} />

            {cargando && opiniones.length === 0 && <Cargando texto="Cargando opiniones…" />}

            {!cargando && filtradas.length === 0 && (
              <Vacio texto="Todavía no hay opiniones aquí." icono="fa-comments" />
            )}

            <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
              {visibles.map((opinion) => {
                const { total = 0, mio = null } = meGusta.get(opinion.id) ?? {}
                const autor = autorDe(opinion)
                const productos = conDetalle ? (opinion.productos ?? []) : []

                return (
                  <div className="col" key={opinion.id}>
                    <article className="card h-100 border-0 shadow-sm cinta-superior p-3 mb-0">
                      <header className="d-flex align-items-center gap-2 mb-3">
                        {autor.anonimo ? (
                          <img
                            className="icon-tile icon-tile-sm rounded-circle flex-shrink-0 object-fit-contain p-1"
                            src={logo}
                            alt=""
                          />
                        ) : (
                          <span
                            className="icon-tile icon-tile-sm d-flex align-items-center justify-content-center flex-shrink-0 rounded-circle fw-bold"
                            aria-hidden="true"
                          >
                            {inicialesDe(autor.nombre)}
                          </span>
                        )}
                        <strong className="small text-truncate min-width-0">{autor.nombre}</strong>
                      </header>

                      {/* Solo los valores, sin etiquetas: valoración, fecha y descripción. */}
                      <div className="flex-grow-1">
                        <div className="mb-2">
                          {opinion.valoracion > 0 ? (
                            <span className="d-inline-flex align-items-center gap-2">
                              <Estrellas valor={estrellasDe(opinion.valoracion)} />
                              <strong className="small">
                                {opinion.valoracion}/{VALORACION_MAXIMA}
                              </strong>
                            </span>
                          ) : (
                            <span className="small text-secondary">Sin valoración</span>
                          )}
                        </div>

                        <time className="d-block small text-secondary mb-2" dateTime={opinion.fecha}>
                          {fechaCorta(opinion.fecha)}
                        </time>

                        <p className="small mb-0">
                          {opinion.texto ? (
                            opinion.texto
                          ) : (
                            <span className="text-secondary fst-italic">
                              {opinion.moderando
                                ? 'Comentario pendiente de aprobación.'
                                : 'Sin descripción.'}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Solo Admin y Owner (PERMISO.VER_DETALLE_OPINIONES). */}
                      {conDetalle && opinion.qr && (
                        <p className="small text-secondary border-top mt-3 pt-3 mb-0">
                          <i className="fa-solid fa-qrcode me-2" />
                          <code>{opinion.qr}</code> · ticket {opinion.ticket} ·{' '}
                          {opinion.usuario ?? 'sin cuenta'}
                          <span className="d-block mt-1">
                            {productos.map((item) => `${item.cantidad}× ${item.producto}`).join(' · ')}
                          </span>
                        </p>
                      )}

                      <footer className="d-flex align-items-center justify-content-end gap-2 border-top mt-3 pt-2">
                        <span className="small text-secondary" aria-live="polite">
                          {total} me gusta
                        </span>
                        <button
                          className={`btn btn-sm btn-link p-0 ${mio ? 'text-danger' : 'text-secondary'}`}
                          onClick={() => alternarMeGusta(opinion)}
                          disabled={!correo || pendiente === opinion.id}
                          aria-pressed={Boolean(mio)}
                          title={correo ? undefined : 'Inicia sesión para dar me gusta'}
                          aria-label={
                            mio
                              ? `Quitar tu me gusta a ${autor.nombre}`
                              : `Me gusta la opinión de ${autor.nombre}`
                          }
                        >
                          <i className={`fa-${mio ? 'solid' : 'regular'} fa-heart fs-5`} />
                        </button>
                      </footer>
                    </article>
                  </div>
                )
              })}
            </div>

            {filtradas.length > VISIBLES_AL_INICIO && (
              <div className="text-center mt-4">
                <button className="btn btn-outline-primary" onClick={() => setVerTodas(!verTodas)}>
                  {verTodas ? 'Ver menos' : `Ver las ${filtradas.length} opiniones`}
                </button>
              </div>
            )}
          </>
      </div>
    </section>
  )
}
