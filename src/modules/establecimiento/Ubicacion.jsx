import { useCallback } from 'react'

import { useRecurso } from '../../hooks/useRecurso'
import { useAvisos } from '../../context/AvisosContext'
import { esMapaDeGoogle } from '../../utils/seguridad'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'
import { PILARES, PUNTOS_CLAVE } from '../../data/contenido'
import { REFERENCIAS_POR_DEFECTO, TIEMPOS_POR_DEFECTO } from '../../data/local'
import NarrativaCreativa from './NarrativaCreativa'
import { establecimientoApi } from './api'

/** wa.me solo acepta dígitos: "+57 311 8370904" → "573118370904". */
const soloDigitos = (valor) => String(valor ?? '').replace(/\D/g, '')

/**
 * Sección «Ubicación» de la portada del cliente: dónde está el local, cómo se
 * llega y cómo contactarlo.
 *
 * Es solo consulta. La edición de la ficha vive en la pantalla del
 * administrador (`Establecimiento` con `editable`), que es la única que
 * escribe: así el cliente y el administrador leen el mismo dato y nadie puede
 * cambiarlo desde aquí ni escribiendo la URL a mano (R44).
 *
 * Los puntos de referencia y los tiempos salen de la ficha si la API los trae
 * y, si no, del respaldo en data/local.js. El back todavía no los expone.
 */
export default function Ubicacion() {
  const cargar = useCallback(() => establecimientoApi.ficha(), [])
  const { datos: ficha, cargando, error, recargar } = useRecurso(cargar, null)
  const avisos = useAvisos()

  if (cargando && !ficha) return <Cargando texto="Cargando información del local…" />

  if (!ficha) {
    return (
      <>
        <MensajeError texto={error} onReintentar={recargar} />
        <div className="card border-0 shadow-sm">
          <Vacio texto="Todavía no hay una ficha del establecimiento." icono="fa-store" />
        </div>
      </>
    )
  }

  const direccionCompleta = [ficha.direccion, ficha.ciudad].filter(Boolean).join(', ')
  const referencias = ficha.referencias?.length ? ficha.referencias : REFERENCIAS_POR_DEFECTO
  const tiempos = ficha.tiempos?.length ? ficha.tiempos : TIEMPOS_POR_DEFECTO
  const whatsapp = soloDigitos(ficha.whatsapp)

  // Enlace de indicaciones de Google Maps por dirección. No se usa la URL del
  // iframe: esa es de inserción y abre un mapa sin ruta.
  const comoLlegar = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    direccionCompleta
  )}`

  /**
   * El portapapeles no está disponible en contextos sin HTTPS ni si el
   * navegador deniega el permiso, y ahí `navigator.clipboard` es undefined. Se
   * comprueba antes y se avisa con la dirección a la vista, para que copiarla a
   * mano siga siendo posible en vez de quedarse sin respuesta.
   */
  const copiarDireccion = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('sin portapapeles')
      await navigator.clipboard.writeText(direccionCompleta)
      avisos.exito('Dirección copiada', direccionCompleta)
    } catch {
      avisos.error('No pudimos copiar la dirección', `Cópiala a mano: ${direccionCompleta}`)
    }
  }

  return (
    <>
      <MensajeError texto={error} onReintentar={recargar} />

      {/* Bloque principal del wireframe: texto y acciones a la izquierda,
          mapa a la derecha. */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="row g-0">
          <div className="col-12 col-lg-6">
            <div className="card-body p-4 h-100 d-flex flex-column">
              <h2 className="h4 fw-bold mb-3">{ficha.nombre}</h2>

              <p className="text-secondary">{ficha.descripcion}</p>

              <p className="text-secondary">
                Estamos en <strong className="text-body">{direccionCompleta}</strong>. Ven a comer
                al local, pide para recoger o pídelo a domicilio: te lo preparamos al momento.
              </p>

              <ul className="list-unstyled small mb-4">
                {[
                  { icono: 'fa-location-dot', texto: direccionCompleta },
                  { icono: 'fa-phone', texto: ficha.telefono },
                  { icono: 'fa-clock', texto: ficha.horario },
                ]
                  .filter(({ texto }) => texto)
                  .map(({ icono, texto }) => (
                    <li className="mb-2 d-flex gap-2" key={icono}>
                      <i className={`fa-solid ${icono} text-brand mt-1`} />
                      <span>{texto}</span>
                    </li>
                  ))}
              </ul>

              <div className="d-flex flex-wrap gap-2 mt-auto">
                <a className="btn btn-primary" href={comoLlegar} target="_blank" rel="noreferrer">
                  <i className="fa-solid fa-diamond-turn-right me-2" />
                  Cómo llegar
                </a>
                <button className="btn btn-outline-primary" onClick={copiarDireccion}>
                  <i className="fa-regular fa-copy me-2" />
                  Copiar dirección
                </button>
                {whatsapp && (
                  <a
                    className="btn btn-outline-secondary"
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <i className="fa-brands fa-whatsapp me-2" />
                    WhatsApp
                  </a>
                )}
                {ficha.telefono && (
                  <a
                    className="btn btn-outline-secondary"
                    href={`tel:${soloDigitos(ficha.telefono)}`}
                  >
                    <i className="fa-solid fa-phone me-2" />
                    Llamar
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-6">
            {/* Solo se incrusta un mapa de Google: la URL viene de la API y se
                pinta en el panel de todos los clientes (ver utils/seguridad.js). */}
            {esMapaDeGoogle(ficha.mapa) ? (
              <div className="ratio ratio-4x3 h-100">
                <iframe
                  src={ficha.mapa}
                  title={`Ubicación de ${ficha.nombre}`}
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            ) : (
              <div className="bg-body-tertiary text-center text-secondary small py-5 h-100 d-flex flex-column justify-content-center">
                <i className="fa-solid fa-map-location-dot fs-3 d-block mb-2 opacity-50" />
                Mapa no disponible
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white">
              <h2 className="h6 fw-bold mb-0">
                <i className="fa-solid fa-map-pin text-brand me-2" />
                Cómo ubicarnos
              </h2>
            </div>
            <ul className="list-group list-group-flush">
              {referencias.map(({ id, icono, texto }) => (
                <li className="list-group-item d-flex gap-2 small" key={id}>
                  <i className={`fa-solid ${icono ?? 'fa-location-crosshairs'} text-brand mt-1`} />
                  <span>{texto}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white">
              <h2 className="h6 fw-bold mb-0">
                <i className="fa-solid fa-stopwatch text-brand me-2" />
                Tiempos aproximados
              </h2>
            </div>
            <ul className="list-group list-group-flush">
              {tiempos.map(({ id, icono, medio, texto }) => (
                <li
                  className="list-group-item d-flex align-items-center gap-2 small"
                  key={id}
                >
                  <i className={`fa-solid ${icono ?? 'fa-clock'} text-brand`} />
                  <span className="min-width-0">{medio}</span>
                  <strong className="ms-auto text-nowrap">{texto}</strong>
                </li>
              ))}
            </ul>
            <div className="card-footer bg-white">
              <p className="small text-secondary mb-0">
                Son estimaciones; en horas pico pueden variar.
              </p>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white">
              <h2 className="h6 fw-bold mb-0">
                <i className="fa-solid fa-circle-check text-brand me-2" />
                Puntos clave
              </h2>
            </div>
            <ul className="list-group list-group-flush">
              {PUNTOS_CLAVE.map(({ id, texto }) => (
                <li className="list-group-item d-flex gap-2 small" key={id}>
                  <i className="fa-solid fa-circle-check text-success mt-1" />
                  <span>{texto}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="row g-3 mb-3">
        {PILARES.map(({ id, titulo, icono, texto }) => (
          <div className="col-12 col-lg-6" key={id}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h2 className="h6 fw-bold text-uppercase mb-3">
                  <i className={`fa-solid ${icono} text-brand me-2`} />
                  {titulo}
                </h2>
                <p className="text-secondary mb-0">{texto}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <NarrativaCreativa />
    </>
  )
}
