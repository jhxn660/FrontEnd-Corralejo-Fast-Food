import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import PieContacto from '../../components/ui/PieContacto'
import Horarios from './Horarios'
import Ubicacion from './Ubicacion'
import Valoraciones from './Valoraciones'

/**
 * Portada del cliente: establecimiento, ubicación, horarios y valoraciones en
 * una sola página.
 *
 * MISMA ESTRUCTURA QUE LA PANTALLA DEL ADMINISTRADOR
 * Secciones una debajo de otra, como en `Establecimiento`, y no las pestañas
 * que había antes: con la barra lateral de vuelta, el cliente ya navega por el
 * menú de la izquierda y una segunda fila de pestañas duplicaba la navegación.
 *
 * SOLO CONSULTA
 * Cada sección es la versión de lectura de su parte: la ficha y los días
 * especiales se editan únicamente en la pantalla del administrador (R44). Lo
 * único que el cliente escribe aquí es su valoración y su comentario, dentro de
 * `Valoraciones`.
 */
export default function InicioCliente() {
  return (
    <>
      <EncabezadoPagina
        titulo="Bienvenido/a"
        descripcion="Conoce el local, mira cuándo abrimos y cuéntanos qué tal estuvo tu pedido."
      />

      <Ubicacion />
      <Horarios />
      <Valoraciones />
      <PieContacto />
    </>
  )
}
