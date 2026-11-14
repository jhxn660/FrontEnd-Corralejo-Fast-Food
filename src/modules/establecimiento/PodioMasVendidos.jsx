import { useCallback } from 'react'

import { useRecurso } from '../../hooks/useRecurso'
import { moneda } from '../../utils/format'
import Estrellas from '../../components/ui/Estrellas'
import { imagenDe, tieneImagen } from '../menu/esquema'
import { destacadosApi } from './api'

const MEDALLAS = { 1: '🥇', 2: '🥈', 3: '🥉' }

// En escritorio el Top 1 va al centro, el 2 a la izquierda y el 3 a la derecha.
// En móvil se apilan en orden natural: 1, 2, 3.
const ORDEN = {
  1: 'order-1 order-md-2',
  2: 'order-2 order-md-1',
  3: 'order-3',
}

/**
 * Podio de los tres platos más vendidos.
 *
 * Las estrellas son SOLO LECTURA y muestran la calificación que el
 * administrador mantiene en la carta. Antes el cliente podía votar aquí mismo
 * sin haber comprado el plato, así que el voto se retiró entero: una
 * calificación que no se puede verificar no vale nada (ver
 * components/ui/Estrellas.jsx).
 *
 * Si no hay ventas o la carga falla, el podio no se pinta: es un extra de la
 * portada y no debe bloquear ni ensuciar el resto de la pantalla.
 */
export default function PodioMasVendidos() {
  const cargar = useCallback(() => destacadosApi.masVendidos(), [])
  const { datos: podio } = useRecurso(cargar, [])

  if (podio.length === 0) return null

  return (
    <section className="card border-0 shadow-sm bg-carbon text-white mb-3" aria-label="Los más vendidos">
      <div className="card-body px-3 py-4 p-md-4">
        <div className="text-center mb-4">
          <span className="badge bg-brand mb-2">
            <i className="fa-solid fa-fire me-1" />
            Los más pedidos
          </span>
          <h2 className="h4 fw-bold mb-0">El podio de Corralejo</h2>
        </div>

        <div className="row g-3 g-lg-4 align-items-center justify-content-center">
          {podio.map((plato) => (
            <div className={`col-12 col-sm-8 col-md-4 ${ORDEN[plato.posicion]}`} key={plato.nombre}>
              <article
                className={`card h-100 text-body text-center ${
                  plato.posicion === 1 ? 'podio-primero' : ''
                }`}
              >
                <div className="card-body p-3 d-flex flex-column">
                  <span className="badge bg-dark align-self-center mb-2">
                    {MEDALLAS[plato.posicion]} Top {plato.posicion}
                  </span>

                  <h3 className="h6 fw-bold mb-2">{plato.nombre}</h3>

                  {/* La foto que el administrador subió para ese plato en la
                      carta; sin ella, el logo (`imagenDe`). Ya no hay `onError`
                      que ocultar: la imagen es del propio registro o del
                      proyecto, no de un servidor ajeno que pueda fallar. */}
                  <img
                    className={`podio-foto rounded mb-2 ${
                      tieneImagen(plato) ? '' : 'miniatura-respaldo'
                    }`}
                    src={imagenDe(plato)}
                    alt={tieneImagen(plato) ? `Foto de ${plato.nombre}` : ''}
                    aria-hidden={tieneImagen(plato) ? undefined : 'true'}
                    loading="lazy"
                  />

                  <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                    {plato.calificacion > 0 && <Estrellas valor={plato.calificacion} />}
                    <strong className="small">{moneda(plato.precio)}</strong>
                  </div>

                  <p className="small text-secondary recorte-3 mb-0">{plato.descripcion}</p>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
