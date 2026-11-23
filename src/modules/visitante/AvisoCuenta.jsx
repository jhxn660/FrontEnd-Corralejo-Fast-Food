import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ACCIONES_VISITANTE, BENEFICIOS_CUENTA } from '../../data/contenido'

/**
 * Tarjeta de bienvenida del visitante: qué puede hacer ya y qué gana con una
 * cuenta (PQRS, sobre todo). Se puede ocultar; es estado local de la sesión de
 * pestaña, no una preferencia que haya que recordar.
 */
export default function AvisoCuenta() {
  const [oculto, setOculto] = useState(false)

  if (oculto) return null

  return (
    <section className="card border-0 shadow-sm mb-4" aria-label="Estás navegando como visitante">
      <div className="card-body">
        <div className="d-flex align-items-start gap-3 mb-3">
          <div className="icon-tile icon-tile-sm d-flex align-items-center justify-content-center flex-shrink-0">
            <i className="fa-solid fa-user" />
          </div>
          <div className="flex-grow-1 min-width-0">
            <h2 className="h6 fw-bold mb-1">Estás navegando como visitante</h2>
            <p className="small text-secondary mb-0">
              No necesitas cuenta para mirar la carta ni para calificar tu pedido con el QR del
              ticket.
            </p>
          </div>
          <button
            type="button"
            className="btn-close flex-shrink-0"
            aria-label="Ocultar aviso"
            onClick={() => setOculto(true)}
          />
        </div>

        <div className="row g-3">
          <div className="col-12 col-md-6">
            <h3 className="h6 text-uppercase text-secondary small fw-bold">Ya puedes</h3>
            <ul className="list-unstyled small mb-0">
              {ACCIONES_VISITANTE.map(({ id, icono, texto }) => (
                <li className="mb-2" key={id}>
                  <i className={`fa-solid ${icono} text-brand me-2`} />
                  {texto}
                </li>
              ))}
            </ul>
          </div>
          <div className="col-12 col-md-6">
            <h3 className="h6 text-uppercase text-secondary small fw-bold">Con una cuenta, además</h3>
            <ul className="list-unstyled small mb-3">
              {BENEFICIOS_CUENTA.map(({ id, icono, texto }) => (
                <li className="mb-2" key={id}>
                  <i className={`fa-solid ${icono} text-secondary me-2`} />
                  {texto}
                </li>
              ))}
            </ul>
            <div className="d-flex flex-wrap gap-2">
              <Link className="btn btn-primary btn-sm" to="/registro">
                <i className="fa-solid fa-user-plus me-2" />
                Crear cuenta
              </Link>
              <Link className="btn btn-outline-secondary btn-sm" to="/login">
                Ya tengo cuenta
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
