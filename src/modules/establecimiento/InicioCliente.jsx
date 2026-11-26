import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import OpinionesClientes from '../comments/OpinionesClientes'

import Horarios from './Horarios'
import ListaTop from './ListaTop'
import Ubicacion from './Ubicacion'

const ANCLA_OPINIONES = 'muro-comentarios'

/**
 * Portada del cliente, en este orden: bienvenida, ficha del local (Ubicacion), Lista Top con
 * «Ver nuestro menú», horarios y opiniones. La vista lleva `listaTopEnPagina`
 * (config/navegacion.jsx), así que Layout no pinta la Lista Top encima.
 * Solo consulta: la ficha se edita en Gestión del Establecimiento.
 */
export default function InicioCliente() {
  return (
    <>
      <EncabezadoPagina
        titulo="Bienvenido/a"
        descripcion="Lo más pedido, dónde estamos, cuándo abrimos y qué opinan nuestros clientes."
      />

      <Ubicacion />
      <ListaTop rutaComentarios={`/cliente/inicio#${ANCLA_OPINIONES}`} rutaMenu="/cliente/menu" />
      <Horarios />
      <OpinionesClientes puedeComentar ancla={ANCLA_OPINIONES} />
    </>
  )
}
