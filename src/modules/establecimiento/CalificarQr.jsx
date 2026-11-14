import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import logo from '../../assets/logo.png'
import LimiteDeError from '../../components/layout/LimiteDeError'
import CalificarPedido from './CalificarPedido'
import ListaValoraciones from './ListaValoraciones'

/**
 * Pantalla PÚBLICA de valoración: la que abre el QR impreso en el tiquete.
 *
 * POR QUÉ NO VA DENTRO DE Layout
 * `Layout` dibuja el menú del rol de la sesión, y aquí no hay sesión: un
 * visitante sin cuenta llega desde la cámara del teléfono. Así que esta
 * pantalla trae su propio cascarón —logo, título y poco más— y vive en
 * `RUTAS_PUBLICAS` (config/navegacion.jsx), fuera de `RutaProtegida`.
 *
 * El código del ticket puede venir en la ruta (`/calificar/QR-V1-…`, que es lo
 * que codifica el QR) o escribirse a mano en `/calificar`.
 */
export default function CalificarQr() {
  const { qr = '' } = useParams()
  const [version, setVersion] = useState(0)

  return (
    <>
      <header className="app-header d-flex align-items-center px-3 px-lg-4 gap-3">
        <img src={logo} alt="" width="44" height="44" className="object-fit-contain" />
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
            Cuéntanos qué tal estuvo tu pedido. No hace falta crear una cuenta: con el código del
            tiquete nos basta, y puedes dejar solo las estrellas.
          </p>

          <CalificarPedido codigoInicial={qr} onRegistrada={() => setVersion((n) => n + 1)} />

          {/* `key` fuerza el remontaje —y la recarga— en cuanto se registra una
              valoración, para que el visitante vea aparecer la suya. */}
          <ListaValoraciones key={version} />
        </LimiteDeError>
      </div>
    </>
  )
}
