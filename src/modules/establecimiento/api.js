<<<<<<< HEAD
import { datos } from '../../api/client'
import { establecimientoApi as backend } from '../../api/establecimiento.api'
import { salesApi } from '../../api/sales.api'
import { menuApi } from '../products/api'

import { DIAS_HORARIO } from './horario'

// Módulos del backend que usa Establecimiento:
//   establecimiento, con sus tres recursos: /ubicaciones (ficha del local), /horarios (uno por
//   día) y /establecimiento (misión, visión, narrativa). Su lectura es pública.
//   sales (el más vendido del día).
// Las opiniones del muro, la calificación por QR y los "me gusta" son del módulo comments
// (modules/comments), no de este.

/* ───────────── Ficha: ubicación + horarios ───────────── */

const aHorarioUi = (horario) => ({
  id: horario._id,
  dia: horario.dia,
  horaApertura: horario.horaApertura,
  horaCierre: horario.horaCierre,
  estaAbierto: horario.estaAbierto !== false,
  estadoNota: horario.estadoNota ?? '',
})

/** Horario del backend → los siete días de lunes a domingo que usa horario.js. */
const aHorarioSemanal = (horarios) =>
  DIAS_HORARIO.map((dia) => {
    const registro = horarios.find((h) => h.dia === dia)
    const abierto = registro && registro.estaAbierto !== false
    return {
      dia,
      abre: abierto ? registro.horaApertura : null,
      cierra: abierto ? registro.horaCierre : null,
      nota: registro?.estadoNota ?? '',
    }
  })

/** "Cerca de X · Junto a Y" (un solo texto en el backend) → una línea por referencia. */
const aReferencias = (referencia = '') =>
  referencia
    .split('·')
    .map((texto) => texto.trim())
    .filter(Boolean)
    .map((texto, indice) => ({ id: `referencia-${indice}`, icono: 'fa-location-dot', texto }))

/** Ubicación + horarios del backend → la ficha que usan las pantallas. */
const aFichaUi = (ubicacion, horarios) => {
  const horarioSemanal = aHorarioSemanal(horarios)
  return {
    id: ubicacion._id,
    nombre: ubicacion.titulo,
    descripcion: ubicacion.descripcion ?? '',
    ciudad: ubicacion.ciudad ?? '',
    direccion: ubicacion.direccion ?? '',
    telefono: ubicacion.telefono ?? '',
    // El backend guarda un solo número: el WhatsApp del local es su teléfono.
    whatsapp: ubicacion.telefono ?? '',
    // El texto tal cual (para editarlo) y partido en líneas (para la tarjeta "Cómo ubicarnos").
    referencia: ubicacion.referencia ?? '',
    referencias: aReferencias(ubicacion.referencia),
    mapa: ubicacion.enlaceMapa ?? '',
    // El horario no es un campo de la ubicación: se arma con los registros de /horarios.
    horario: horarioSemanal.filter((d) => d.abre).map((d) => `${d.dia}: ${d.abre} – ${d.cierra}`).join(' · '),
    horarioSemanal,
    // Los registros tal cual, para la tabla editable de Gestión del Establecimiento.
    horarios: horarios.map(aHorarioUi),
  }
}

/** Ficha del formulario → ubicación del backend: solo los campos que el backend guarda. */
const aUbicacionApi = (ficha) => ({
  titulo: (ficha.nombre ?? '').trim(),
  descripcion: (ficha.descripcion ?? '').trim(),
  direccion: (ficha.direccion ?? '').trim(),
  telefono: (ficha.telefono ?? '').trim(),
  ciudad: (ficha.ciudad ?? '').trim(),
  referencia: (ficha.referencia ?? '').trim(),
  enlaceMapa: (ficha.mapa ?? '').trim(),
})

/* ───────────── Misión, visión y narrativa ───────────── */

const MISION = 'Misión'
const VISION = 'Visión'
const NARRATIVA = 'Narrativa Creativa'
const SECCIONES_HISTORIA = ['El Origen', 'El Secreto del Banquete', 'La Comunidad Gastronómica', 'El Lema de la Casa']
const ICONO_HISTORIA = {
  'El Origen': 'fa-dungeon',
  'El Secreto del Banquete': 'fa-utensils',
  'La Comunidad Gastronómica': 'fa-people-group',
  'El Lema de la Casa': 'fa-quote-left',
  [NARRATIVA]: 'fa-book-open',
}

const aHistoriaUi = (seccion) => ({
  id: seccion._id,
  titulo: seccion.titulo,
  icono: ICONO_HISTORIA[seccion.categoria] ?? ICONO_HISTORIA[NARRATIVA],
  resumen: seccion.subtitulo ?? '',
  texto: seccion.contenido ?? '',
})

const esHistoria = (seccion) => seccion.categoria !== MISION && seccion.categoria !== VISION

/* ───────────── El módulo establecimiento completo ───────────── */

// Lectura de la ficha en curso: las pantallas que la piden a la vez esperan la MISMA petición.
// Al terminar se suelta, así la siguiente lectura (por ejemplo, tras guardar) trae datos nuevos.
let fichaEnCurso = null

const leerFicha = async () => {
  const [ubicaciones, horarios] = await Promise.all([datos(backend.ubicaciones.list()), datos(backend.horarios.list())])
  return ubicaciones[0] ? aFichaUi(ubicaciones[0], horarios) : null
}

/**
 * Un solo adaptador para los tres recursos del módulo establecimiento del backend, como allí:
 * - ficha (ubicaciones + horarios), guardarFicha, guardarHorario y eliminarHorario.
 * - informacion y guardarInformacion (/establecimiento: misión, visión y narrativa).
 */
export const establecimientoApi = {
  /**
   * La ficha del local: la ubicación y sus horarios en UNA lectura. Trae el horario resumido
   * (`horario`), la semana para el calendario (`horarioSemanal`) y los registros (`horarios`).
   */
  ficha: () => {
    fichaEnCurso ??= leerFicha().finally(() => {
      fichaEnCurso = null
    })
    return fichaEnCurso
  },

  /** Con id actualiza la ubicación; sin id (base de datos nueva) la crea. */
  guardarFicha: (id, ficha) =>
    id ? backend.ubicaciones.update(id, aUbicacionApi(ficha)) : backend.ubicaciones.create(aUbicacionApi(ficha)),

  /** Con id actualiza el horario de ese día; sin id lo crea. */
  guardarHorario: ({ id, ...horario }) => {
    if (id) return backend.horarios.update(id, horario)
    return backend.horarios.create(horario)
  },

  eliminarHorario: (id) => backend.horarios.remove(id),

  informacion: async () => {
    const secciones = await datos(backend.list())
    const de = (categoria) => secciones.find((s) => s.categoria === categoria)
    return {
      id: 'informacion',
      mision: de(MISION)?.contenido ?? '',
      vision: de(VISION)?.contenido ?? '',
      historias: secciones.filter(esHistoria).map(aHistoriaUi),
    }
  },

  /** Lo que existe se actualiza, lo nuevo se crea y las historias quitadas se borran. */
  guardarInformacion: async ({ mision, vision, historias = [] }) => {
    const secciones = await datos(backend.list())
    const guardarSeccion = async (categoria, contenido) => {
      if (!contenido?.trim()) return
      const existente = secciones.find((s) => s.categoria === categoria)
      if (existente) await backend.update(existente._id, { contenido })
      else await backend.create({ titulo: categoria, contenido, categoria })
    }
    await guardarSeccion(MISION, mision)
    await guardarSeccion(VISION, vision)

    const actuales = secciones.filter(esHistoria)
    for (const historia of historias) {
      const cuerpo = { titulo: historia.titulo, subtitulo: historia.resumen, contenido: historia.texto }
      const existente = actuales.find((s) => String(s._id) === String(historia.id))
      if (existente) await backend.update(existente._id, cuerpo)
      else {
        // Una historia con título conocido conserva esa categoría; cualquier otra es narrativa
        const categoria = SECCIONES_HISTORIA.includes(historia.titulo) ? historia.titulo : NARRATIVA
        await backend.create({ ...cuerpo, categoria })
      }
    }
    const quedan = new Set(historias.map((h) => String(h.id)))
    for (const seccion of actuales.filter((s) => !quedan.has(String(s._id)))) await backend.remove(seccion._id)
  },
}

/* ───────────── Destacados de la portada ───────────── */

export const destacadosApi = {
  /** El plato más vendido de un día. Sin sesión del personal, el backend no da ventas: null. */
  masVendidoDelDia: async (iso) => {
    if (!iso) return null
    const [ventas, { categorias }] = await Promise.all([
      datos(salesApi.list({ from: iso, to: iso })).catch(() => []),
      menuApi.listarCategorias({ soloDisponibles: true }),
    ])

    const unidades = new Map()
    ventas
      .filter((venta) => venta.estadoPedido !== 'Cancelado')
      .forEach((venta) => (venta.detalles ?? []).forEach((d) => {
        const nombre = String(d.producto ?? '')
        unidades.set(nombre, (unidades.get(nombre) ?? 0) + (Number(d.cantidad) || 0))
      }))

    const [mejor] = [...unidades.entries()].sort((a, b) => b[1] - a[1])
    if (!mejor) return null
    const plato = categorias.flatMap((c) => c.productos).find((p) => p.nombre === mejor[0])
    return { nombre: mejor[0], cantidad: mejor[1], ventas: ventas.length, imagen: plato?.imagen ?? null }
  },

  /**
   * «Lista top»: los tres productos con más estrellas. La calificación (1-5) la calcula el
   * backend con las valoraciones de las compras (comentarios por QR) que incluían el producto.
   * Orden: más estrellas primero; si empatan, el que tiene más valoraciones (es más confiable
   * un 4,5 de 20 clientes que un 5 de uno solo); si siguen empatados, el nombre.
   */
  mejorValorados: async () => {
    const { categorias } = await menuApi.listarCategorias({ soloDisponibles: true })
    return categorias
      .flatMap((c) => c.productos.map((p) => ({ ...p, categoria: c.nombre })))
      .filter((p) => p.calificacion > 0)
      .sort(
        (a, b) =>
          b.calificacion - a.calificacion ||
          b.totalCalificaciones - a.totalCalificaciones ||
          a.nombre.localeCompare(b.nombre, 'es')
      )
      .slice(0, 3)
      .map((p, i) => ({
        posicion: i + 1,
        nombre: p.nombre,
        categoria: p.categoria,
        descripcion: p.descripcion,
        precio: p.precio,
        calificacion: p.calificacion,
        totalCalificaciones: p.totalCalificaciones,
        imagen: p.imagen ?? null,
      }))
  },
}
=======
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
>>>>>>> origin/main
