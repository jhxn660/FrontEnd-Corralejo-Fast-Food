import { http } from '../../services/http'
import { menuApi } from '../menu/api'
import { estrellasDe, valoracionDe } from './valoracion'

// Colecciones de json-server del módulo. Viven aquí y en ningún otro sitio
// (R48): ni los hooks ni las pantallas escriben una ruta.
const RUTAS = {
  ficha: '/establecimiento',
  dias: '/diasEspeciales',
  ventas: '/sales',
  comentarios: '/comentarios',
  meGusta: '/meGusta',
  informacion: '/informacion',
}

/**
 * Contenido institucional (botón "Información" / "Gestión de Información"):
 * misión, visión y las historias de la narrativa. Un solo documento en la
 * colección `informacion`; lo editan Admin y Owner (PERMISO.EDITAR_INFORMACION).
 */
export const informacionApi = {
  obtener: async ({ senal } = {}) => {
    const { datos } = await http.lista(RUTAS.informacion, { senal })
    const doc = datos[0]
    return {
      id: doc?.id ?? null,
      mision: doc?.mision ?? '',
      vision: doc?.vision ?? '',
      historias: Array.isArray(doc?.historias) ? doc.historias : [],
    }
  },

  /** Sin documento previo lo crea; con él, lo reemplaza. */
  guardar: ({ id, ...datos }) =>
    id ? http.put(`${RUTAS.informacion}/${id}`, { id, ...datos }) : http.post(RUTAS.informacion, datos),
}

// En pedidos y ventas el combo es un producto aparte ("X (combo)"). Para el
// más vendido del día cuentan juntos: es el mismo plato.
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
   * Ordena por calificación (la que mantiene el administrador en la carta), no
   * por unidades vendidas: un plato barato se vende mucho sin ser el mejor.
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
 * DEUDA (R17): el recuento se arma aquí descargando todos los registros, porque
 * json-server no agrega ni sabe quién pregunta.
 */
export const meGustaApi = {
  listar: async ({ senal } = {}) => {
    const { datos } = await http.lista(RUTAS.meGusta, { senal })
    return datos
  },

  dar: ({ comentario, usuario }) =>
    http.post(RUTAS.meGusta, { comentario, usuario, fecha: new Date().toISOString() }),

  quitar: (id) => http.delete(`${RUTAS.meGusta}/${id}`),

  /** Al borrar un comentario se van con él sus «me gusta»: sin dueño no cuentan. */
  quitarDeComentario: async (comentario) => {
    const { datos } = await http.lista(RUTAS.meGusta, { query: { comentario } })
    await Promise.all(datos.map((voto) => http.delete(`${RUTAS.meGusta}/${voto.id}`).catch(() => null)))
  },
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
 * DEUDA (R17): las tres comprobaciones se hacen en el navegador; json-server
 * no impide escribir en `comentarios` saltándoselas.
 */
export const ticketsApi = {
  buscarPorQr: async (qr, { senal } = {}) => {
    const codigo = String(qr ?? '').trim().toUpperCase()
    if (!codigo) throw new Error('Escribe el código del ticket.')

    const { datos } = await http.lista(RUTAS.ventas, {
      query: { qrCode: codigo },
      senal,
    })
    const venta = datos[0]

    if (!venta) throw new Error(`El código ${codigo} no corresponde a ninguna compra.`)
    if (venta.status === 'Cancelado') throw new Error('Ese pedido fue cancelado.')

    const { datos: previas } = await http.lista(RUTAS.comentarios, {
      query: { qr: codigo },
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
 * OPINIONES: COMENTARIOS Y VALORACIONES EN UNA SOLA COLECCIÓN.
 *
 * No hay colección aparte. Una valoración ES un registro de `comentarios` que
 * además lleva `qr`, `ticket`, `valoracion` (1-10), `estrellas` (= valoracion
 * / 2, ver valoracion.js) y los `productos` del pedido. De ahí los indicadores
 * sacan la nota de cada producto (`indicadores/calculos.js`).
 *
 * | registro                        | qr | valoracion | texto | se ve en Opiniones          |
 * |---------------------------------|----|------------|-------|-----------------------------|
 * | puntuación sola (sin escribir)  | sí | 1-10       | ''    | sí (sin descripción)        |
 * | puntuación con comentario       | sí | 1-10       | sí    | sí; el texto tras aprobarse |
 * | comentario del muro, sin ticket | no | 0          | sí    | solo cuando se aprueba      |
 *
 * `usuario` queda en null cuando lo deja un visitante sin cuenta. La nota no
 * pierde valor por eso: lo que la respalda es el QR, no el correo.
 */
export const valoracionesApi = {
  /** Desde el QR del ticket (CalificarPedido). `valoracion`: entero 1-10. */
  registrar: ({ ticket, valoracion, texto, correo }) =>
    http.post(
      RUTAS.comentarios,
      {
        qr: ticket.qr,
        ticket: ticket.ticket,
        usuario: correo ?? null,
        nombre: correo ?? null,
        valoracion,
        estrellas: estrellasDe(valoracion),
        texto: texto ?? '',
        productos: ticket.productos,
        fecha: new Date().toISOString(),
        // Lo que se modera es el TEXTO, no la nota: una puntuación sin
        // comentario no tiene nada que aprobar y ya cuenta en los indicadores.
        visible: false,
      }
    ),
}

export const opinionesApi = {
  /**
   * La lista unificada de OpinionesClientes, de la más reciente a la más antigua.
   *
   * Entra todo registro con QR (la nota cuenta desde que se registra) y todo
   * comentario del muro ya aprobado. El texto pendiente de aprobación se
   * recorta: de una opinión ajena sin moderar solo se enseña la nota.
   *
   * `conDetalle` (PERMISO.VER_DETALLE_OPINIONES: Admin y Owner) conserva los
   * productos calificados, el ticket y el QR. Sin él se quitan del registro, no
   * solo de la pantalla: Visitante y Cliente reciben la opinión general.
   *
   * DEUDA (R17): el recorte es del navegador, así que el texto sin moderar y
   * los productos igual viajan hasta aquí (json-server no filtra por rol).
   */
  listar: async ({ conDetalle = false, senal } = {}) => {
    const { datos } = await http.lista(RUTAS.comentarios, { senal })
    return datos
      .filter((registro) => {
        const aprobadoConTexto =
          registro.visible === true && String(registro.texto ?? '').trim() !== ''
        return Boolean(registro.qr) || aprobadoConTexto
      })
      .map(({ productos, qr, ticket, ...registro }) => ({
        ...registro,
        ...(conDetalle ? { productos: productos ?? [], qr, ticket } : {}),
        valoracion: valoracionDe(registro),
        texto: registro.visible === true ? (registro.texto ?? '') : '',
        moderando: registro.visible !== true && Boolean(registro.texto),
      }))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  },
}

/**
 * Comentario del muro, sin ticket detrás: no puntúa (ver la tabla de arriba).
 * Nace oculto (`visible: false`) y se publica cuando el administrador lo
 * aprueba en Moderación de PQRS.
 */
export const comentariosApi = {
  publicar: ({ texto, nombre, usuario }) =>
    http.post(RUTAS.comentarios, {
      qr: null,
      ticket: null,
      texto,
      nombre,
      usuario,
      valoracion: 0,
      estrellas: 0,
      productos: [],
      fecha: new Date().toISOString(),
      visible: false, // lo decide el administrador, nunca el cliente
    }),
}
