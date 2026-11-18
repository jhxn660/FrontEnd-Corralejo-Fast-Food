import { Link, useParams } from 'react-router-dom'

import logo from '../../assets/logo.png'
import LimiteDeError from '../../components/layout/LimiteDeError'
import CalificarPedido from './CalificarPedido'
import OpinionesClientes from './OpinionesClientes'

/**
 * Pantalla PÚBLICA de valoración: la que abre el QR impreso en el tiquete.
 *
 * POR QUÉ NO VA DENTRO DE Layout
 * `Layout` dibuja el menú del rol de la sesión, y aquí no hay sesión: un
 * visitante sin cuenta llega desde la cámara del teléfono. Así que esta
 * pantalla trae su propio cascarón —logo, título y poco más— y vive en
 * `RUTAS_PUBLICAS` (config/navegacion.jsx), fuera de `RutaProtegida`.
 *
 * El código del ticket llega en la ruta (`/calificar/QR-V1-…`, que es lo que
 * codifica el QR). Ya no se escribe a mano: `/calificar` sin código solo pide
 * escanear el QR.
 */
export default function CalificarQr() {
  const { qr = '' } = useParams()

  return (
    <>
      <header className="app-header d-flex align-items-center px-3 px-lg-4 gap-3">
        <img src={logo} alt="" width="34" height="34" className="object-fit-contain" />
        <h1 className="h5 text-white mb-0 me-auto">
          Corralejo <span className="text-brand">Fast Food</span>
          <small className="d-block d-sm-inline text-secondary ms-sm-2 fs-6">Valoraciones</small>
        </h1>

        <Link className="btn btn-outline-light btn-sm" to="/login">
          <i className="fa-solid fa-right-to-bracket" />
          <span className="d-none d-sm-inline ms-2">Entrar</span>
        </Link>
      </header>

      <div className="container py-4" style={{ maxWidth: '56rem' }}>
        <LimiteDeError clave={qr}>
          <p className="text-secondary">
            Cuéntanos qué tal estuvo tu pedido. No hace falta crear una cuenta: el QR de tu
            tiquete nos basta, y puedes dejar solo las estrellas.
          </p>

          {/* Sin código en la URL (/calificar a secas) no hay formulario manual:
              CalificarPedido pide escanear el QR. `key` lo reinicia si cambia
              el código sin desmontar la ruta. */}
          <CalificarPedido key={qr} codigo={qr} />

          {/* La valoración recién registrada aparece sola: useRecurso refresca
              tras cada escritura (services/sincronizacion.js). */}
          <OpinionesClientes ancla="opiniones-calificar" />
        </LimiteDeError>
      </div>
    </>
  )
}
