import { CONTACTO, MAPA_EMBED } from '../../data/local'

/** Pie con datos de contacto y mapa; lo comparten las dos pantallas del cliente. */
export default function PieContacto() {
  return (
    <footer className="card border-0 shadow-sm bg-carbon text-white">
      <div className="card-body row g-4 align-items-center">
        <div className="col-12 col-lg-6">
          <h2 className="h6 text-brand text-uppercase mb-3">Contacto</h2>
          <ul className="list-unstyled small mb-0">
            {CONTACTO.map(({ id, icono, texto }) => (
              <li className="mb-2" key={id}>
                <i className={`fa-solid ${icono} text-brand me-2`} />
                {texto}
              </li>
            ))}
          </ul>
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
