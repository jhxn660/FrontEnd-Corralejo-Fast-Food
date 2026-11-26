import Modal from '../../components/ui/Modal'
import { moneda } from '../../utils/format'
import { WHATSAPP_NUMERO } from '../../data/local'
import { imagenDe, tieneImagen, tonoDe } from './esquema'

/**
 * Ficha de un plato para el cliente. Es el paso que faltaba entre "veo una
 * lista de precios" y "quiero pedir esto": muestra el plato en grande, lo que
 * lleva, su calificación y un camino directo para pedirlo.
 *
 * El botón de WhatsApp lleva el pedido ya escrito. No registra nada en la API
 * —el cliente no tiene carrito en esta aplicación— y por eso no promete que el
 * pedido quede hecho: abre la conversación con el local, que es lo que de
 * verdad ocurre al pulsarlo.
 */
export default function DetallePlato({ plato, categoria, vitrina = false, onCerrar }) {
  const tono = tonoDe(plato.nombre, categoria)

  const mensaje = encodeURIComponent(
    `¡Hola Corralejo Fast Food! Quiero pedir: ${plato.nombre} (${moneda(plato.precio)}).`
  )
  const enlace = `https://wa.me/${WHATSAPP_NUMERO}?text=${mensaje}`

  return (
    <Modal
      titulo={plato.nombre}
      icono="fa-utensils"
      tamano="modal-lg"
      onClose={onCerrar}
      footer={
        <>
          <button
            className={`btn ${vitrina ? 'btn-primary' : 'btn-outline-secondary me-auto'}`}
            onClick={onCerrar}
          >
            {vitrina ? 'Volver a la carta' : 'Seguir viendo la carta'}
          </button>
          {!vitrina && (
            <a className="btn btn-primary" href={enlace} target="_blank" rel="noreferrer">
              <i className="fa-brands fa-whatsapp me-2" />
              Pedir por WhatsApp
            </a>
          )}
        </>
      }
    >
      <div className="row g-4 align-items-center">
        <div className="col-12 col-sm-5">
          <div className="plato-foto rounded overflow-hidden" style={{ '--plato-tono': tono }}>
            <img
              className={`plato-foto-img ${tieneImagen(plato) ? '' : 'plato-foto-respaldo'}`}
              src={imagenDe(plato)}
              alt={tieneImagen(plato) ? `Foto de ${plato.nombre}` : ''}
              aria-hidden={tieneImagen(plato) ? undefined : 'true'}
            />
          </div>
        </div>

        <div className="col-12 col-sm-7">
          <span className="badge bg-secondary mb-2">{categoria}</span>
          <p className="display-6 fw-bold text-brand mb-1">{moneda(plato.precio)}</p>
          {plato.precioCombo && (
            <p className="mb-2">
              <span className="badge bg-dark me-2">Combo {moneda(plato.precioCombo)}</span>
              <small className="text-secondary">con papa francesa y gaseosa 250 ml</small>
            </p>
          )}

          {plato.calificacion ? (
            <p className="mb-3">
              <span className="text-warning fs-5" aria-hidden="true">
                {'★'.repeat(plato.calificacion)}
                {'☆'.repeat(Math.max(0, 5 - plato.calificacion))}
              </span>
              <span className="text-secondary small ms-2">
                {plato.calificacion} de 5 según nuestros clientes
              </span>
            </p>
          ) : null}

          <p className="mb-0">
            {plato.descripcion || 'Preparado al momento con los ingredientes de la casa.'}
          </p>
        </div>
      </div>

      <hr className="my-4" />

      <div className="row g-3 text-center small">
        {[
          { icono: 'fa-fire-burner', titulo: 'Preparado al momento', texto: 'Nada precalentado.' },
          { icono: 'fa-motorcycle', titulo: 'Domicilio en la zona', texto: 'Pide y te lo llevamos.' },
          { icono: 'fa-store', titulo: 'También en el local', texto: 'Martes a domingo, 2 a 10 pm.' },
        ].map(({ icono, titulo, texto }) => (
          <div className="col-12 col-sm-4" key={titulo}>
            <div className="border rounded p-3 h-100">
              <i className={`fa-solid ${icono} text-brand fs-4 d-block mb-2`} />
              <strong className="d-block">{titulo}</strong>
              <span className="text-secondary">{texto}</span>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
