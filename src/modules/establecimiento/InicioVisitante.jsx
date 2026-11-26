import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import OpinionesClientes from '../comments/OpinionesClientes'

import AvisoCuenta from './AvisoCuenta'
import Horarios from './Horarios'
import ListaTop from './ListaTop'
import Ubicacion from './Ubicacion'

const ANCLA_OPINIONES = 'muro-comentarios'

/**
 * Portada del visitante (sin sesión): bienvenida, ficha del local, Lista Top, aviso de cuenta,
 * horarios y opiniones (lleva `listaTopEnPagina`, igual que la del cliente).
 * El muro es de solo lectura: se opina escaneando el QR del tiquete. Sin PQRS.
 */
export default function InicioVisitante() {
  return (
    <>
      <EncabezadoPagina
        titulo="Bienvenido/a a Corralejo"
        descripcion="¡Lo más pedido, dónde estamos, cuándo abrimos y por qué somos los mejores según nuestros clientes!"
      />

      <Ubicacion />
      <ListaTop rutaComentarios={`/visitante/inicio#${ANCLA_OPINIONES}`} rutaMenu="/visitante/menu" />
      <AvisoCuenta />
      <Horarios />
      <OpinionesClientes ancla={ANCLA_OPINIONES} />
    </>
  )
}
