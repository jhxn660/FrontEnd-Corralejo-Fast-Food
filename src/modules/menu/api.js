import { http } from '../../services/http'
import { idUnico } from '../../utils/id'

// La carta vive en la colección `adminMenu` de json-server: cada categoría
// lleva sus platos anidados en `items`. La ruta se declara aquí y en ningún
// otro sitio (R48).
const RUTA = '/adminMenu'

/**
 * ADAPTADOR json-server ↔ UI. La colección guarda `categoria` e `items`; la UI
 * trabaja con `nombre`, `productos`, `disponible` y precios numéricos. La
 * diferencia se absorbe en estas dos funciones y la pantalla nunca ve la forma
 * cruda ni un precio con formato.
 */
const aNumero = (precio) =>
  typeof precio === 'number' ? precio : Number(String(precio ?? '').replace(/\D/g, '')) || 0

const aCategoriaUi = (cruda) => ({
  id: cruda.id,
  nombre: cruda.nombre ?? cruda.categoria ?? '',
  descripcion: cruda.descripcion ?? '',
  icono: cruda.icono ?? 'fa-solid fa-utensils',
  estado: cruda.estado ?? 'Disponible',
  disponible: (cruda.estado ?? 'Disponible') !== 'Inhabilitado',
  productos: (cruda.items ?? cruda.productos ?? []).map((item, i) => ({
    // Id propio y persistido: con uno posicional, editar un plato mientras
    // otro rol añadía o quitaba otro de la misma categoría guardaba los
    // cambios sobre el plato equivocado.
    id: item.id ?? `${cruda.id}-${i}`,
    nombre: item.nombre,
    precio: aNumero(item.precio),
    // Precio con papa francesa y gaseosa 250 ml. null = el plato no tiene combo.
    precioCombo: item.precioCombo ? aNumero(item.precioCombo) : null,
    descripcion: item.descripcion ?? '',
    calificacion: item.calificacion ?? null,
    // Imagen subida por el administrador, guardada como `data:` URL en el
    // propio registro. null = sin imagen propia, se pinta el logo (`imagenDe`
    // en esquema.js).
    imagen: item.imagen ?? null,
    estado: item.estado ?? 'Disponible',
  })),
})

/** Vuelta a la forma de la colección; se descartan los campos derivados. */
const aCategoriaApi = (ui) => ({
  ...(ui.id ? { id: ui.id } : {}),
  categoria: ui.nombre,
  descripcion: ui.descripcion,
  icono: ui.icono,
  estado: ui.estado,
  items: ui.productos.map(
    ({ id, nombre, precio, precioCombo, descripcion, calificacion, imagen, estado }) => ({
      id: id ?? idUnico(),
      nombre,
      precio,
      ...(Number(precioCombo) > 0 ? { precioCombo: Number(precioCombo) } : {}),
      ...(descripcion ? { descripcion } : {}),
      ...(calificacion ? { calificacion } : {}),
      // El campo se omite cuando no hay imagen, no se guarda en null: así
      // quitarla deja el registro como si nunca hubiera tenido una.
      ...(imagen ? { imagen } : {}),
      estado,
    })
  ),
})

/**
 * Lo que se puede vender: un producto por plato y, si tiene combo, otro más
 * con " (combo)" en el nombre. Es la ÚNICA fuente del catálogo de Pedidos y de
 * la edición de ventas, así que un plato nuevo, un precio cambiado o una
 * categoría oculta por el administrador se reflejan allí sin tocar nada más.
 * Los platos agotados y las categorías ocultas no se venden.
 */
export const productosVendibles = (categorias) =>
  categorias
    .filter((categoria) => categoria.disponible)
    .map((categoria) => ({
      id: categoria.id,
      nombre: categoria.nombre,
      icono: categoria.icono,
      productos: categoria.productos
        .filter((plato) => plato.estado !== 'Inhabilitado')
        .flatMap((plato) => [
          {
            id: plato.id,
            nombre: plato.nombre,
            precio: plato.precio,
            descripcion: plato.descripcion,
            imagen: plato.imagen,
          },
          ...(plato.precioCombo
            ? [
                {
                  id: `${plato.id}-combo`,
                  nombre: `${plato.nombre} (combo)`,
                  precio: plato.precioCombo,
                  descripcion: 'Con papa francesa y gaseosa 250 ml.',
                  // El combo es el mismo plato con acompañamiento: se queda
                  // con su imagen.
                  imagen: plato.imagen,
                  combo: true,
                },
              ]
            : []),
        ]),
    }))
    .filter((categoria) => categoria.productos.length > 0)

export const menuApi = {
  // `soloDisponibles` filtra en json-server (?estado=Disponible): las
  // categorías ocultas no llegan al navegador del cliente.
  listarCategorias: async ({ soloDisponibles = false, senal } = {}) => {
    const { datos, total } = await http.lista(RUTA, {
      query: soloDisponibles ? { estado: 'Disponible' } : undefined,
      senal,
    })
    return { categorias: datos.map(aCategoriaUi), total }
  },

  crearCategoria: (ui) => http.post(RUTA, aCategoriaApi(ui)),
  actualizarCategoria: (id, ui) => http.put(`${RUTA}/${id}`, aCategoriaApi(ui)),
  cambiarEstadoCategoria: (id, estado) => http.patch(`${RUTA}/${id}`, { estado }),
  eliminarCategoria: (id) => http.delete(`${RUTA}/${id}`),
}
