import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import Horarios from '../establecimiento/Horarios'
import ListaTop from '../establecimiento/ListaTop'
import OpinionesClientes from '../establecimiento/OpinionesClientes'
import Ubicacion from '../establecimiento/Ubicacion'
import AvisoCuenta from './AvisoCuenta'

const ANCLA_OPINIONES = 'muro-comentarios'

/**
 * Portada del visitante (rol 'usuario', sin sesión).
 *
 * ORDEN PROPIO (solo visitante): 1) bienvenida, 2) la ficha del local
 * ("Corralejo Fast Food", Ubicacion), 3) la Lista Top. Por eso la vista lleva
 * `listaTopEnPagina` en config/navegacion.jsx y Layout no la pinta encima.
 * Después, el aviso de cuenta, los horarios y las opiniones.
 *
 * El muro es de solo lectura: el visitante opina escaneando el QR del
 * tiquete (/calificar/:qr), que demuestra la compra.
 *
 * Nada de PQRS: ni enlace, ni acceso (ver BENEFICIOS_CUENTA en data/contenido.js).
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
