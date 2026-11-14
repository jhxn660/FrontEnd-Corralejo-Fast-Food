import { http } from '../../services/http'
import { menuApi } from '../menu/api'

// Rutas del contrato acordado con el back. Viven aquí y en ningún otro sitio:
// el día de la migración se cambian estas constantes y ni los hooks ni las
// pantallas se enteran.
const RUTAS = {
  ficha: '/establecimiento',
  dias: '/diasEspeciales',
  ventas: '/sales',
  comentarios: '/comentarios',
  meGusta: '/meGusta',
}

// En pedidos y ventas el combo es un producto aparte ("X (combo)"). Para el
// podio cuentan juntos: es el mismo plato.
const SUFIJO_COMBO = ' (combo)'
const nombreBase = (producto) => String(producto ?? '').replace(SUFIJO_COMBO, '')

/** Ficha del local y días especiales del calendario de atención. */
export const establecimientoApi = {
  ficha: async ({ senal } = {}) => {
    const { datos } = await http.lista(RUTAS.ficha, { senal })
    return datos[0] ?? null
  },

  actualizarFicha: (id, ficha) => http.put(`${RUTAS.ficha}/${id}`, ficha),

  listarDiasEspeciales: async ({ senal } = {}) => {
    const { datos } = await http.lista(RUTAS.dias, { senal })
    return datos
  },

  crearDiaEspecial: (dia) => http.post(RUTAS.dias, dia),
  actualizarDiaEspecial: (id, dia) => http.put(`${RUTAS.dias}/${id}`, dia),
  eliminarDiaEspecial: (id) => http.delete(`${RUTAS.dias}/${id}`),
}

export const destacadosApi = {
  /**
   * Los tres platos más vendidos que siguen a la venta.
   *
   * La calificación que acompaña a cada plato es la que el administrador
   * mantiene en la carta. Ya no se mezcla con votos de clientes: ese sistema se
   * retiró porque no había forma de comprobar que quien votaba hubiera comprado
   * el plato (ver components/ui/Estrellas.jsx).
   *
   * DEUDA (R17, R49): el ranking se calcula aquí descargando `/sales`, así que
   * las ventas llegan al navegador del cliente. Con el back real esto debe ser
   * un endpoint propio (p. ej. GET /productos/mas-vendidos) que devuelva solo
   * estos tres registros.
   */
  masVendidos: async ({ senal } = {}) => {
    const [ventas, { categorias }] = await Promise.all([
      http.lista(RUTAS.ventas, { senal }),
      menuApi.listarCategorias({ soloDisponibles: true, senal }),
    ])

    const platos = new Map()
    categorias.forEach((categoria) =>
      categoria.productos
        .filter((plato) => plato.estado !== 'Inhabilitado')
        .forEach((plato) => platos.set(plato.nombre, { ...plato, categoria: categoria.nombre }))
    )

    const unidades = new Map()
    ventas.datos
      .filter((venta) => venta.status !== 'Cancelado')
      .forEach((venta) =>
        (venta.items ?? []).forEach((item) => {
          const nombre = nombreBase(item.product)
          if (!platos.has(nombre)) return // ya no está en la carta
          unidades.set(nombre, (unidades.get(nombre) ?? 0) + (Number(item.quantity) || 0))
        })
      )

    return [...unidades.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([nombre, cantidad], indice) => {
        const plato = platos.get(nombre)

        return {
          posicion: indice + 1,
          nombre,
          categoria: plato.categoria,
          descripcion: plato.descripcion,
          precio: plato.precio,
          cantidad,
          calificacion: Number(plato.calificacion) || 0,
          // La imagen que el administrador subió en la carta. El podio no
          // tiene fotos propias: enseña la del plato o el logo (`imagenDe`).
          imagen: plato.imagen ?? null,
        }
      })
  },

  /**
   * El plato que más se vendió UN día concreto, para la tarjeta del día que se
   * selecciona en el calendario.
   *
   * El filtro va al servidor (`?date=`) a propósito: sin él habría que bajar
   * las 361 ventas cada vez que el cliente toca un día del calendario, y el
   * calendario invita a tocar muchos. Devuelve null si ese día no hubo ventas,
   * que es lo normal en un día futuro o en uno que el local no abrió.
   */
  masVendidoDelDia: async (iso, { senal } = {}) => {
    if (!iso) return null

    // La carta viaja con las ventas del día porque el nombre del producto, que
    // es lo único que guarda la venta, no dice nada de su imagen: hay que
    // buscarla en el plato. Son diez categorías, mucho menos que las 361
    // ventas que el filtro `?date=` evita descargar.
    const [{ datos }, { categorias }] = await Promise.all([
      http.lista(RUTAS.ventas, { query: { date: iso }, senal }),
      menuApi.listarCategorias({ senal }),
    ])

    const unidades = new Map()
    datos
      .filter((venta) => venta.status !== 'Cancelado')
      .forEach((venta) =>
        (venta.items ?? []).forEach((item) => {
          const nombre = nombreBase(item.product)
          unidades.set(nombre, (unidades.get(nombre) ?? 0) + (Number(item.quantity) || 0))
        })
      )

    const [mejor] = [...unidades.entries()].sort((a, b) => b[1] - a[1])
    if (!mejor) return null

    const plato = categorias
      .flatMap((categoria) => categoria.productos)
      .find((candidato) => candidato.nombre === mejor[0])

    return {
      nombre: mejor[0],
      cantidad: mejor[1],
      ventas: datos.length,
      // null si ese plato ya no está en la carta: se pinta el logo.
      imagen: plato?.imagen ?? null,
    }
  },

  /**
   * La «Lista top»: los tres platos mejor calificados de la carta.
   *
   * Responde a otra pregunta que `masVendidos`: aquel ordena por unidades
   * vendidas y este por calificación, que es la que mantiene el administrador
   * en la carta. Un plato barato se vende mucho sin ser el mejor, así que
   * mezclarlos daría un ranking que no significa nada.
   *
   * El desempate es por precio ascendente: entre dos platos de cinco estrellas,
   * primero el que menos cuesta.
   */
  mejorValorados: async ({ senal } = {}) => {
    const { categorias } = await menuApi.listarCategorias({ soloDisponibles: true, senal })

    return categorias
      .flatMap((categoria) =>
        categoria.productos
          .filter((plato) => plato.estado !== 'Inhabilitado')
          .map((plato) => ({ ...plato, categoria: categoria.nombre }))
      )
      .filter((plato) => Number(plato.calificacion) > 0)
      .sort((a, b) => b.calificacion - a.calificacion || a.precio - b.precio)
      .slice(0, 3)
      .map((plato, indice) => ({
        posicion: indice + 1,
        nombre: plato.nombre,
        categoria: plato.categoria,
        descripcion: plato.descripcion,
        precio: plato.precio,
        calificacion: Number(plato.calificacion),
        imagen: plato.imagen ?? null,
      }))
  },
}

/**
 * «Me gusta» de los comentarios: un registro por persona y comentario.
 *
 * Por qué un registro y no un contador en el comentario: un número suelto lo
 * sube cualquiera tantas veces como quiera, y ya retiramos una calificación por
 * no poder comprobar quién la daba. Con un registro por persona, el segundo
 * clic quita el suyo en vez de inflar la cuenta.
 *
 * DEUDA (R17, R49): el recuento se arma aquí descargando todos los registros.
 * Con el back real cada comentario debería traer `meGusta` (número) y `miMeGusta`
 * (booleano) ya resueltos, y esta colección deja de viajar al navegador.
 */
export const meGustaApi = {
  listar: async ({ senal } = {}) => {
    const { datos } = await http.lista(RUTAS.meGusta, { senal })
    return datos
  },

  dar: ({ comentario, usuario }) =>
    http.post(RUTAS.meGusta, { comentario, usuario, fecha: new Date().toISOString() }),

  quitar: (id) => http.delete(`${RUTAS.meGusta}/${id}`),
}
/**
 * CALIFICAR UN PEDIDO A PARTIR DEL QR DEL TICKET.
 *
 * El QR identifica la venta, la venta dice qué se compró, y la valoración se
 * guarda contra esos productos. Solo se puede puntuar lo que aparece en el
 * ticket: el código ES la prueba de compra, y por eso no hace falta sesión.
 *
 * Las dos puertas están en `buscarPorQr`: que la venta exista y no esté
 * cancelada, y que ese QR no se haya calificado ya (una valoración por ticket,
 * que es lo que impide votar en bucle con el mismo código).
 *
 * NO comprueba de quién es la venta. Es deliberado: un visitante sin cuenta
 * tiene el ticket en la mano y puede puntuar con él, mientras que exigir que
 * la venta estuviera a su nombre dejaba fuera a todo el que compra en el
 * mostrador sin registrarse.
 *
 * DEUDA (R17, R49): las tres comprobaciones se hacen en el navegador. Con el
 * back real el servidor debe resolver el QR y devolver solo ese ticket.
 */
export const ticketsApi = {
  buscarPorQr: async (qr, { senal } = {}) => {
    const codigo = String(qr ?? '').trim().toUpperCase()
    if (!codigo) throw new Error('Escribe el código del ticket.')

    // `publica`: el visitante que escanea el QR no tiene token (R47).
    const { datos } = await http.lista(RUTAS.ventas, {
      query: { qrCode: codigo },
      publica: true,
      senal,
    })
    const venta = datos[0]

    if (!venta) throw new Error(`El código ${codigo} no corresponde a ninguna compra.`)
    if (venta.status === 'Cancelado') throw new Error('Ese pedido fue cancelado.')

    const { datos: previas } = await http.lista(RUTAS.comentarios, {
      query: { qr: codigo },
      publica: true,
      senal,
    })
    if (previas.length > 0) throw new Error('Este pedido ya fue calificado.')

    return {
      qr: codigo,
      ticket: venta.ticketId,
      fecha: venta.date,
      hora: venta.time,
      total: venta.total,
      entrega: venta.deliveryAddress,
      productos: (venta.items ?? []).map((item) => ({
        producto: item.product,
        cantidad: Number(item.quantity) || 0,
        precio: Number(item.unitPrice) || 0,
      })),
    }
  },
}

/**
 * VALORACIONES: UN COMENTARIO CON QR.
 *
 * No hay colección aparte. Una valoración ES un registro de `comentarios` que
 * además lleva `qr`, `ticket`, `estrellas` y los `productos` del pedido. Esa
 * es la unión que pedía la arquitectura: el QR cuelga del comentario, y de ahí
 * los indicadores sacan la nota de cada producto
 * (`modules/indicadores/calculos.js`, `valoracionesPorProducto`).
 *
 * Tres formas del mismo registro, y cada pantalla mira una:
 *
 * | registro                        | qr | estrellas | texto | dónde se ve          |
 * |---------------------------------|----|-----------|-------|----------------------|
 * | puntuación sola (sin escribir)  | sí | 1-5       | ''    | valoraciones + KPIs  |
 * | puntuación con comentario       | sí | 1-5       | sí    | las dos + el muro    |
 * | comentario del muro, sin ticket | no | 0         | sí    | solo el muro         |
 *
 * `usuario` queda en null cuando lo deja un visitante sin cuenta. La nota no
 * pierde valor por eso: lo que la respalda es el QR, no el correo.
 */
export const valoracionesApi = {
  registrar: ({ ticket, estrellas, texto, correo }) =>
    http.post(
      RUTAS.comentarios,
      {
        qr: ticket.qr,
        ticket: ticket.ticket,
        usuario: correo ?? null,
        nombre: correo ?? null,
        estrellas,
        texto: texto ?? '',
        productos: ticket.productos,
        fecha: new Date().toISOString(),
        // Lo que se modera es el TEXTO, no la nota: una puntuación sin
        // comentario no tiene nada que aprobar y ya cuenta en los indicadores.
        visible: false,
      },
      { publica: true }
    ),

  /**
   * Las valoraciones, de la más reciente a la más antigua.
   *
   * El texto pendiente de aprobación se recorta aquí: hasta que el
   * administrador lo apruebe, de un comentario ajeno solo se enseñan la nota y
   * los productos, que salen del ticket y no son opinión de nadie.
   *
   * DEUDA (R17, R49): el recorte es del navegador, así que el texto sin
   * moderar igual viaja hasta aquí. Con el back real la lista pública debe
   * salir ya recortada del servidor.
   */
  listar: async ({ senal } = {}) => {
    const { datos } = await http.lista(RUTAS.comentarios, { publica: true, senal })
    return datos
      .filter((registro) => Boolean(registro.qr))
      .map((registro) => ({
        ...registro,
        texto: registro.visible === true ? (registro.texto ?? '') : '',
        moderando: registro.visible !== true && Boolean(registro.texto),
      }))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  },
}

/**
 * Muro público de comentarios.
 *
 * Un comentario nuevo nace oculto (`visible: false`) y se publica cuando el
 * administrador lo aprueba en Moderación de PQRS. El filtro `?visible=true`
 * viaja a la API, así que los ocultos no llegan al navegador del cliente.
 *
 * El muro solo enseña los registros CON texto: una puntuación suelta no tiene
 * nada que leer y se queda en la lista de valoraciones y en los indicadores.
 * Las estrellas sí se pintan cuando el registro trae QR, porque entonces hay
 * un ticket detrás (ver components/ui/Estrellas.jsx).
 */
export const comentariosApi = {
  listarPublicados: async ({ senal } = {}) => {
    const { datos } = await http.lista(RUTAS.comentarios, {
      query: { visible: true },
      publica: true,
      senal,
    })
    return datos.filter(
      (comentario) => comentario.visible === true && String(comentario.texto ?? '').trim() !== ''
    )
  },

  /** Comentario del muro sin ticket detrás: no puntúa (ver la tabla de arriba). */
  publicar: ({ texto, nombre, usuario }) =>
    http.post(RUTAS.comentarios, {
      qr: null,
      ticket: null,
      texto,
      nombre,
      usuario,
      estrellas: 0,
      productos: [],
      fecha: new Date().toISOString(),
      visible: false, // lo decide el administrador, nunca el cliente
    }),
}
