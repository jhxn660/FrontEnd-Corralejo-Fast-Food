import { useState } from 'react'

import CalificarPedido from './CalificarPedido'
import ListaTop from './ListaTop'
import ListaValoraciones from './ListaValoraciones'
import MuroComentarios from './MuroComentarios'

const ANCLA_COMENTARIOS = 'muro-comentarios'

/**
 * Sección «Valoraciones» de la portada del cliente.
 *
 * Cuatro piezas: la lista top de la casa, calificar un pedido con el QR del
 * ticket, las valoraciones ya registradas y el muro de comentarios. El voto
 * vive solo en la segunda, donde el tiquete demuestra la compra (ver
 * CalificarPedido.jsx).
 *
 * El mismo formulario se abre sin sesión en /calificar, la ruta que codifica
 * el QR impreso (modules/establecimiento/CalificarQr.jsx). Aquí se deja igual
 * para el cliente que ya entró y no quiere volver a escanear nada.
 *
 * `version` fuerza a `ListaValoraciones` a montarse de nuevo —y por tanto a
 * recargar— en cuanto se registra una valoración, para que el cliente la vea
 * aparecer sin recargar la página.
 */
export default function Valoraciones() {
  const [version, setVersion] = useState(0)

  return (
    <>
      <ListaTop anclaComentarios={ANCLA_COMENTARIOS} />
      <CalificarPedido onRegistrada={() => setVersion((n) => n + 1)} />
      <ListaValoraciones key={version} />
      <MuroComentarios puedeComentar ancla={ANCLA_COMENTARIOS} />
    </>
  )
}
