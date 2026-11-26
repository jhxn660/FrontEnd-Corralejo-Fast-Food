import { CONTACTO, MAPA_EMBED, WHATSAPP_NUMERO } from '../../data/local'

/**
 * Pie con datos de contacto y mapa.
 *
 * Vive en components/ui y no dentro del módulo de establecimiento porque lo
 * usan tres pantallas de dos módulos distintos —la carta, las PQRS del cliente
 * y el establecimiento—, y una pantalla no importa de otra pantalla (R45).
 */
export default function PieContacto() {
  return (
    <footer className="card border-0 shadow-sm bg-carbon text-white">
      <div className="card-body row g-4 align-items-center justify-content-center text-center">
        <div className="col-12 col-lg-5">
          <h2 className="h6 text-brand text-uppercase mb-3">Contacto</h2>
          <ul className="list-unstyled small mb-3 mx-auto text-start" style={{ width: 'fit-content' }}>
            {CONTACTO.map(({ id, icono, texto }) => (
              <li className="mb-2" key={id}>
                <i className={`fa-solid ${icono} text-brand me-2`} />
                {texto}
              </li>
            ))}
          </ul>
          <a
            className="btn btn-sm btn-primary"
            href={`https://wa.me/${WHATSAPP_NUMERO}`}
            target="_blank"
            rel="noreferrer"
          >
            <i className="fa-brands fa-whatsapp me-2" />
            Escríbenos por WhatsApp
          </a>
        </div>
        <div className="col-12 col-lg-6">
          <div className="ratio ratio-16x9 rounded overflow-hidden">
            <iframe
              src={MAPA_EMBED}
              title="Ubicación Corralejo Fast Food"
              style={{ border: 0 }}
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </footer>
  )
}
