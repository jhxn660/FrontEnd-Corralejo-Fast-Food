import { useAvisos } from '../../context/AvisosContext'
import { soloDigitos } from '../../utils/format'
import { esMapaDeGoogle } from '../../utils/seguridad'
import { PUNTOS_CLAVE } from '../../data/contenido'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'

import { useFicha } from './useFicha'

/**
 * Sección «Ubicación» de las portadas: dónde está el local, cómo llegar y cómo contactarlo.
 * Solo consulta: la ficha se edita en Gestión del Establecimiento. Los puntos de referencia
 * salen de `referencia` (una línea por cada « · »); si no hay, su tarjeta no se pinta.
 */
export default function Ubicacion() {
  const { datos: ficha, cargando, error, recargar } = useFicha()
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
  const referencias = ficha.referencias ?? []
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

      <div className="card border-0 shadow-sm mb-3">
        <div className="row g-0">
          <div className="col-12 col-lg-aureo-mayor">
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

          <div className="col-12 col-lg-aureo-menor">
            {/* Solo se incrusta un mapa de Google (ver utils/seguridad.js). */}
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
        {referencias.length > 0 && (
          <div className="col-12 col-lg">
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
        )}

        <div className="col-12 col-lg">
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

    </>
  )
}
