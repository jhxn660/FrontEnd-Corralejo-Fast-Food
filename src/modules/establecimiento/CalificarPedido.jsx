import { useCallback, useEffect, useRef, useState } from 'react'

import { usePeticion } from '../../hooks/usePeticion'
import { useAuth } from '../../context/AuthContext'
import { useAvisos } from '../../context/AvisosContext'
import { moneda } from '../../utils/format'
import Estrellas from '../../components/ui/Estrellas'
import { ticketsApi, valoracionesApi } from './api'

const LARGO_MINIMO = 10
const LARGO_MAXIMO = 300

/**
 * Calificar un pedido a partir del QR del ticket.
 *
 * ES LA ÚNICA PANTALLA DONDE SE VOTA
 * El voto se había retirado de toda la aplicación porque cualquiera podía
 * puntuar un plato sin haberlo comprado: un listado público no demuestra nada.
 * El QR sí, así que aquí —y solo aquí— las estrellas son interactivas, y lo
 * que se califica es el pedido que aparece en el ticket.
 *
 * SIN CUENTA Y SIN ESCRIBIR
 * No pide sesión: quien tiene el código tiene el ticket, y eso es la prueba de
 * compra. Tampoco obliga a redactar nada —la nota sola basta y es lo que llega
 * a los indicadores—; el texto es opcional y, si lo hay, pasa por la
 * moderación del muro como cualquier otro comentario.
 *
 * `codigoInicial` llega desde la ruta pública /calificar/:qr, la que abre el
 * QR impreso: con él la pantalla busca el ticket sola, sin un paso intermedio.
 * `onRegistrada` avisa a la pantalla de arriba para que recargue la lista.
 */
export default function CalificarPedido({ codigoInicial = '', onRegistrada }) {
  const { usuario } = useAuth()
  const avisos = useAvisos()
  const correo = usuario?.email ?? null

  const [codigo, setCodigo] = useState(codigoInicial)
  const [ticket, setTicket] = useState(null)
  const [estrellas, setEstrellas] = useState(0)
  const [texto, setTexto] = useState('')

  // Se desestructuran los dos hooks porque `abrirTicket` depende de `ejecutar`:
  // el objeto que devuelve usePeticion es nuevo en cada render y arrastraría al
  // efecto de abajo a reevaluarse sin parar.
  const { ejecutar: buscarTicket, enviando: buscando } = usePeticion(
    useCallback((qr) => ticketsApi.buscarPorQr(qr), [])
  )

  const { ejecutar: enviarValoracion, enviando } = usePeticion(
    useCallback((datos) => valoracionesApi.registrar({ ...datos, correo }), [correo])
  )

  const abrirTicket = useCallback(
    async (qr) => {
      const { ok, datos, error } = await buscarTicket(qr)
      if (!ok) {
        avisos.error('No pudimos abrir ese ticket', error?.message ?? '')
        return
      }
      setTicket(datos)
      setEstrellas(0)
      setTexto('')
    },
    [buscarTicket, avisos]
  )

  // Búsqueda automática del código que venía en la URL, una sola vez: el
  // cliente acaba de escanear el QR, no tiene por qué pulsar "Buscar" para ver
  // su propio pedido.
  const yaBuscado = useRef(false)
  useEffect(() => {
    if (!codigoInicial || yaBuscado.current) return
    yaBuscado.current = true
    abrirTicket(codigoInicial)
  }, [codigoInicial, abrirTicket])

  const buscar = (evento) => {
    evento.preventDefault()
    abrirTicket(codigo)
  }

  const registrar = async (evento) => {
    evento.preventDefault()
    const contenido = texto.trim()

    if (estrellas === 0) {
      avisos.error('Falta la valoración', 'Toca entre 1 y 5 estrellas.')
      return
    }
    // El comentario es opcional, pero uno de dos palabras no aporta nada: o se
    // deja en blanco o se escribe algo que se pueda leer.
    if (contenido.length > 0 && contenido.length < LARGO_MINIMO) {
      avisos.error(
        'Comentario muy corto',
        `Escribe al menos ${LARGO_MINIMO} caracteres o déjalo en blanco.`
      )
      return
    }

    const { ok, error } = await enviarValoracion({ ticket, estrellas, texto: contenido })
    if (!ok) {
      avisos.fallo('No se pudo registrar tu valoración', error)
      return
    }

    avisos.exito(
      '¡Gracias por tu valoración!',
      contenido
        ? `${estrellas} de 5 para el ticket ${ticket.ticket}. Tu comentario saldrá en el muro cuando el restaurante lo apruebe.`
        : `${estrellas} de 5 para el ticket ${ticket.ticket}.`
    )
    setTicket(null)
    setCodigo('')
    setEstrellas(0)
    setTexto('')
    onRegistrada?.()
  }

  return (
    <section className="card border-0 shadow-sm mb-3">
      <div className="card-header bg-white">
        <h2 className="h6 fw-bold mb-0">
          <i className="fa-solid fa-qrcode text-brand me-2" />
          Califica tu pedido con el QR del ticket
        </h2>
      </div>

      <div className="card-body">
        {!ticket ? (
          <form className="row g-2 align-items-end" onSubmit={buscar}>
            <div className="col-12 col-sm">
              <label className="form-label" htmlFor="codigo-qr">
                Código del ticket
              </label>
              <input
                id="codigo-qr"
                className="form-control"
                placeholder="QR-V0-000000000"
                autoComplete="off"
                spellCheck="false"
                value={codigo}
                onChange={(evento) => setCodigo(evento.target.value)}
                disabled={buscando}
              />
              <div className="form-text">
                Está al pie del tiquete. No necesitas cuenta: el código es tu comprobante.
              </div>
            </div>
            <div className="col-12 col-sm-auto">
              <button className="btn btn-primary w-100" type="submit" disabled={buscando}>
                <i className="fa-solid fa-magnifying-glass me-2" />
                {buscando ? 'Buscando…' : 'Buscar mi pedido'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={registrar}>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <span className="badge bg-secondary">
                Ticket {ticket.ticket} · {ticket.fecha} · {ticket.hora}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setTicket(null)}
                disabled={enviando}
              >
                Otro ticket
              </button>
            </div>

            <label className="form-label fw-semibold d-block">
              Valoración <span className="text-danger">*</span>
            </label>
            <div className="d-flex align-items-center gap-3 mb-3">
              <Estrellas
                valor={estrellas}
                miVoto={estrellas}
                onCalificar={setEstrellas}
                deshabilitado={enviando}
              />
              <small className="text-secondary">
                {estrellas > 0 ? `${estrellas} de 5` : 'Toca una estrella'}
              </small>
            </div>

            <label className="form-label fw-semibold" htmlFor="comentario-pedido">
              Descripción <span className="text-secondary fw-normal">(opcional)</span>
            </label>
            <textarea
              id="comentario-pedido"
              className="form-control"
              rows="4"
              maxLength={LARGO_MAXIMO}
              placeholder="Si quieres, cuéntanos qué tal estuvo la comida, el servicio y la entrega."
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              disabled={enviando}
            />
            <div className="form-text mb-3">
              {texto.trim().length === 0
                ? 'Puedes dejarlo en blanco: con las estrellas ya nos ayudas.'
                : `${texto.length}/${LARGO_MAXIMO} caracteres${
                    texto.trim().length < LARGO_MINIMO ? ` · mínimo ${LARGO_MINIMO}` : ''
                  }`}
            </div>

            {/* Lo comprado, en pequeño: son los productos que reciben la nota. */}
            <div className="border rounded p-3 mb-3 bg-body-tertiary">
              <p className="small fw-semibold text-uppercase text-secondary mb-2">
                <i className="fa-solid fa-basket-shopping me-2" />
                Lo que estás calificando
              </p>
              <ul className="list-unstyled small mb-2">
                {ticket.productos.map((item) => (
                  <li
                    className="d-flex justify-content-between gap-2 border-bottom py-1"
                    key={item.producto}
                  >
                    <span className="min-width-0">
                      <span className="badge bg-secondary me-2">{item.cantidad}×</span>
                      {item.producto}
                    </span>
                    <span className="text-secondary flex-shrink-0">
                      {moneda(item.cantidad * item.precio)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="small text-secondary mb-0">
                {ticket.entrega} · Total {moneda(ticket.total)}
              </p>
            </div>

            <div className="d-flex justify-content-end">
              <button className="btn btn-primary" type="submit" disabled={enviando}>
                <i className="fa-solid fa-paper-plane me-2" />
                {enviando ? 'Registrando…' : 'Registrar valoración'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
