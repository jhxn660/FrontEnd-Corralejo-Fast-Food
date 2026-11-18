import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import Horarios from './Horarios'
import ListaTop from './ListaTop'
import OpinionesClientes from './OpinionesClientes'
import Ubicacion from './Ubicacion'

const ANCLA_OPINIONES = 'muro-comentarios'

/**
 * Portada del cliente: bienvenida, establecimiento, Lista Top, horarios y
 * opiniones.
 *
 * ORDEN
 * El mismo que el Inicio del visitante: 1) bienvenida, 2) la ficha del local
 * ("Corralejo Fast Food", Ubicacion), 3) la Lista Top con "Ver nuestro menú".
 * La vista lleva `listaTopEnPagina` (config/navegacion.jsx), así que Layout no
 * la pinta encima. Las opiniones (comentarios + valoraciones de pedidos) cierran la página en
 * un solo bloque. Ya no hay formulario de calificar por código: la valoración
 * se hace al escanear el QR del tiquete (/calificar/:qr), sin sesión. Tampoco
 * pie de contacto al final ni narrativa institucional, que vive en el botón
 * "Información" del menú lateral.
 *
 * SOLO CONSULTA
 * La ficha y los días especiales se editan únicamente en la pantalla del
 * administrador (R44). Lo único que el cliente escribe aquí es su comentario.
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
