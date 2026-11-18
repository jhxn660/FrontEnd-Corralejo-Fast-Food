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
 * SOLO DESDE EL QR
 * Se monta únicamente en la ruta pública /calificar/:qr, la que abre el QR
 * impreso en el tiquete. Ya no hay formulario para escribir el código a mano
 * ni se incrusta en los paneles: el flujo real es escanear y calificar, sin
 * cuenta y sin pasos intermedios. `codigo` es el que trae la URL.
 *
 * ES LA ÚNICA PANTALLA DONDE SE VOTA
 * Cualquiera podía puntuar un plato sin haberlo comprado desde un listado
 * público. El QR demuestra la compra, así que aquí —y solo aquí— las estrellas
 * son interactivas. El texto es opcional y pasa por la moderación del muro.
 */
export default function CalificarPedido({ codigo }) {
  const { usuario } = useAuth()
  const avisos = useAvisos()
  const correo = usuario?.email ?? null

  // 'buscando' → 'listo' (ticket abierto) → 'registrada'; o 'error'.
  const [estado, setEstado] = useState(codigo ? 'buscando' : 'error')
  const [mensajeError, setMensajeError] = useState('')
  const [ticket, setTicket] = useState(null)
  const [valoracion, setValoracion] = useState(0) // entero 1-10 (valoracion.js)
  const [texto, setTexto] = useState('')

  // Se desestructura porque `abrirTicket` depende de `ejecutar`: el objeto que
  // devuelve usePeticion es nuevo en cada render y reevaluaría el efecto.
  const { ejecutar: buscarTicket } = usePeticion(
    useCallback((qr) => ticketsApi.buscarPorQr(qr), [])
  )

  const { ejecutar: enviarValoracion, enviando } = usePeticion(
    useCallback((datos) => valoracionesApi.registrar({ ...datos, correo }), [correo])
  )

  const abrirTicket = useCallback(
    async (qr) => {
      setEstado('buscando')
      const { ok, datos, error } = await buscarTicket(qr)
      if (!ok) {
        setMensajeError(error?.message ?? '')
        setEstado('error')
        return
      }
      setTicket(datos)
      setEstado('listo')
    },
    [buscarTicket]
  )

  // Búsqueda automática, una sola vez: quien escaneó no tiene que pulsar nada.
  const yaBuscado = useRef(false)
  useEffect(() => {
    if (!codigo || yaBuscado.current) return
    yaBuscado.current = true
    abrirTicket(codigo)
  }, [codigo, abrirTicket])

  const registrar = async (evento) => {
    evento.preventDefault()
    const contenido = texto.trim()

    if (valoracion === 0) {
      avisos.error('Falta la valoración', 'Elige de 1 a 10: cada mitad de estrella suma un punto.')
      return
    }
    if (contenido.length > 0 && contenido.length < LARGO_MINIMO) {
      avisos.error(
        'Comentario muy corto',
        `Escribe al menos ${LARGO_MINIMO} caracteres o déjalo en blanco.`
      )
      return
    }

    const { ok, error } = await enviarValoracion({ ticket, valoracion, texto: contenido })
    if (!ok) {
      avisos.fallo('No se pudo registrar tu valoración', error)
      return
    }

    avisos.exito(
      '¡Gracias por tu valoración!',
      contenido
        ? `${valoracion}/10 para el ticket ${ticket.ticket}. Tu comentario saldrá en el muro cuando el restaurante lo apruebe.`
        : `${valoracion}/10 para el ticket ${ticket.ticket}.`
    )
    setEstado('registrada')
  }

  return (
    <section className="card border-0 shadow-sm mb-3">
      <div className="card-header bg-white">
        <h2 className="h6 fw-bold mb-0">
          <i className="fa-solid fa-qrcode text-brand me-2" />
          Califica tu pedido
        </h2>
      </div>

      <div className="card-body">
        {estado === 'buscando' && (
          <p className="text-secondary mb-0" role="status">
            <span className="spinner-border spinner-border-sm me-2" />
            Abriendo tu ticket…
          </p>
        )}

        {estado === 'error' && (
          <div className="text-center py-3">
            <i className="fa-solid fa-qrcode fs-1 text-secondary opacity-50 d-block mb-3" />
            <p className="fw-semibold mb-1">No pudimos abrir este ticket.</p>
            <p className="small text-secondary mb-0">
              {mensajeError || 'Escanea con la cámara del teléfono el QR impreso al pie de tu tiquete.'}
            </p>
          </div>
        )}

        {estado === 'registrada' && (
          <div className="text-center py-3">
            <i className="fa-solid fa-circle-check fs-1 text-success d-block mb-3" />
            <p className="fw-semibold mb-1">¡Valoración registrada!</p>
            <p className="small text-secondary mb-0">
              Ticket {ticket.ticket} · {valoracion}/10. Gracias por contarnos.
            </p>
          </div>
        )}

        {estado === 'listo' && ticket && (
          <form onSubmit={registrar}>
            <span className="badge bg-secondary mb-3">
              Ticket {ticket.ticket} · {ticket.fecha} · {ticket.hora}
            </span>

            <label className="form-label fw-semibold d-block">
              Valoración <span className="text-danger">*</span>
            </label>
            <div className="d-flex align-items-center gap-3 mb-3">
              <Estrellas
                miVoto={valoracion}
                onCalificar={setValoracion}
                deshabilitado={enviando}
              />
              <small className="text-secondary">
                {valoracion > 0 ? `${valoracion}/10` : 'Toca una estrella (cada mitad = 1 punto)'}
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
