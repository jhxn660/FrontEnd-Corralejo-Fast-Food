import { http } from '../../services/http'
import { menuApi } from '../menu/api'

// Rutas del backend que usa el módulo Establecimiento. Viven aquí y en ningún otro sitio
// (R48): ni los hooks ni las pantallas escriben una ruta.
const RUTAS = {
  // Ficha del local: dirección, teléfono, ciudad y mapa (un documento)
  ubicaciones: '/ubicaciones',
  // Horario de atención: un documento por día de la semana
  horarios: '/horarios',
  // Misión, visión y narrativa: un documento por sección (campo `categoria`)
  informacion: '/establecimiento',
  ventas: '/sales',
  comentarios: '/comments',
  comentariosPublicos: '/comments/public',
}

/* ───────────────────────── Ficha y horarios ───────────────────────── */

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const aHorarioUi = (horario) => ({
  id: horario._id,
  dia: horario.dia,
  horaApertura: horario.horaApertura,
  horaCierre: horario.horaCierre,
  estaAbierto: horario.estaAbierto !== false,
  estadoNota: horario.estadoNota ?? '',
})

/**
 * Horario del backend → `horarioSemanal` de la ficha, el formato que entienden el calendario
 * y el aviso "abierto / cerrado ahora" (ver horario.js): siete días, de lunes a domingo.
 * Un día sin registro o marcado como cerrado queda con abre/cierra en null.
 */
const aHorarioSemanal = (horarios) =>
  DIAS.map((dia) => {
    const registro = horarios.find((horario) => horario.dia === dia)
    const abierto = registro && registro.estaAbierto !== false
    return {
      dia,
      abre: abierto ? registro.horaApertura : null,
      cierra: abierto ? registro.horaCierre : null,
      nota: registro?.estadoNota ?? '',
    }
  })

/** Texto corto del horario para la ficha ("Martes: 14:00 – 21:30 · …"). */
const horarioEnTexto = (semana) =>
  semana
    .filter((dia) => dia.abre)
    .map((dia) => `${dia.dia}: ${dia.abre} – ${dia.cierra}`)
    .join(' · ')

/**
 * Ubicación del backend + horarios → ficha que pintan las pantallas.
 * El backend no tiene WhatsApp aparte: se usa el teléfono del local.
 */
const aFichaUi = (ubicacion, horarios) => {
  const horarioSemanal = aHorarioSemanal(horarios)
  return {
    id: ubicacion._id,
    nombre: ubicacion.titulo,
    descripcion: ubicacion.descripcion ?? '',
    ciudad: ubicacion.ciudad ?? '',
    direccion: ubicacion.direccion ?? '',
    telefono: ubicacion.telefono ?? '',
    whatsapp: ubicacion.telefono ?? '',
    mapa: ubicacion.enlaceMapa ?? '',
    horario: horarioEnTexto(horarioSemanal),
    horarioSemanal,
    referencias: ubicacion.referencia
      ? [{ id: 'referencia', icono: 'fa-location-dot', texto: ubicacion.referencia }]
      : [],
    tiempos: [],
  }
}

// El modelo Ubicacion exige título, descripción, dirección y teléfono.
const aUbicacionApi = (ficha) => ({
  titulo: ficha.nombre,
  descripcion: ficha.descripcion || ficha.nombre,
  direccion: ficha.direccion,
  telefono: ficha.telefono,
  ciudad: ficha.ciudad ?? '',
  enlaceMapa: ficha.mapa ?? '',
})

export const establecimientoApi = {
  /** La ficha del local, o null si todavía no hay ninguna ubicación registrada. */
  ficha: async ({ senal } = {}) => {
    const [ubicaciones, horarios] = await Promise.all([
      http.get(RUTAS.ubicaciones, { senal }),
      http.get(RUTAS.horarios, { senal }),
    ])
    return ubicaciones[0] ? aFichaUi(ubicaciones[0], horarios) : null
  },

  /** Sin id la crea (primera vez); con id la actualiza. */
  actualizarFicha: (id, ficha) =>
    id
      ? http.patch(`${RUTAS.ubicaciones}/${id}`, aUbicacionApi(ficha))
      : http.post(RUTAS.ubicaciones, aUbicacionApi(ficha)),

  listarHorarios: async ({ senal } = {}) => (await http.get(RUTAS.horarios, { senal })).map(aHorarioUi),

  /** Sin id lo crea; con id lo actualiza. */
  guardarHorario: ({ id, ...horario }) =>
    id ? http.patch(`${RUTAS.horarios}/${id}`, horario) : http.post(RUTAS.horarios, horario),

  eliminarHorario: (id) => http.delete(`${RUTAS.horarios}/${id}`),
}

/* ───────────────────────── Misión, visión y narrativa ───────────────────────── */

// Secciones que acepta el backend (enum `categoria` del modelo Establecimiento)
const MISION = 'Misión'
const VISION = 'Visión'
const NARRATIVA = 'Narrativa Creativa'
const SECCIONES_HISTORIA = ['El Origen', 'El Secreto del Banquete', 'La Comunidad Gastronómica', 'El Lema de la Casa']

// El backend no guarda iconos: cada sección tiene el suyo aquí.
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

/** Una historia nueva usa su título como sección si coincide con una del backend. */
const seccionDe = (historia) => (SECCIONES_HISTORIA.includes(historia.titulo) ? historia.titulo : NARRATIVA)

/**
 * Contenido institucional (botón "Información"): misión, visión y las historias.
 * En el backend cada una es un documento de /api/establecimiento.
 */
export const informacionApi = {
  obtener: async ({ senal } = {}) => {
    const secciones = await http.get(RUTAS.informacion, { senal })
    const de = (categoria) => secciones.find((seccion) => seccion.categoria === categoria)
    return {
      // Sin id: la pantalla trata la información como un solo bloque
      id: 'informacion',
      mision: de(MISION)?.contenido ?? '',
      vision: de(VISION)?.contenido ?? '',
      historias: secciones
        .filter((seccion) => seccion.categoria !== MISION && seccion.categoria !== VISION)
        .map(aHistoriaUi),
    }
  },

  /**
   * Guarda misión, visión e historias comparando con lo que hay en el backend: lo que existe
   * se actualiza, lo nuevo se crea y las historias que ya no están se borran.
   */
  guardar: async ({ mision, vision, historias = [] }) => {
    const secciones = await http.get(RUTAS.informacion)

    const guardarSeccion = async (categoria, titulo, contenido) => {
      if (!contenido?.trim()) return
      const existente = secciones.find((seccion) => seccion.categoria === categoria)
      if (existente) await http.patch(`${RUTAS.informacion}/${existente._id}`, { contenido })
      else await http.post(RUTAS.informacion, { titulo, contenido, categoria })
    }
    await guardarSeccion(MISION, 'Misión', mision)
    await guardarSeccion(VISION, 'Visión', vision)

    const actuales = secciones.filter((seccion) => seccion.categoria !== MISION && seccion.categoria !== VISION)
    for (const historia of historias) {
      const cuerpo = { titulo: historia.titulo, subtitulo: historia.resumen, contenido: historia.texto }
      const existente = actuales.find((seccion) => String(seccion._id) === String(historia.id))
      if (existente) await http.patch(`${RUTAS.informacion}/${existente._id}`, cuerpo)
      else await http.post(RUTAS.informacion, { ...cuerpo, categoria: seccionDe(historia) })
    }

    const quedan = new Set(historias.map((historia) => String(historia.id)))
    for (const seccion of actuales.filter((s) => !quedan.has(String(s._id)))) {
      await http.delete(`${RUTAS.informacion}/${seccion._id}`)
    }
  },
}

/* ───────────────────────── Destacados de la portada ───────────────────────── */

// En pedidos y ventas el combo es un producto aparte ("X (combo)"). Para el
// más vendido del día cuentan juntos: es el mismo plato.
const SUFIJO_COMBO = ' (combo)'
const nombreBase = (producto) => String(producto ?? '').replace(SUFIJO_COMBO, '')

export const destacadosApi = {
  /**
   * El plato que más se vendió UN día concreto. El filtro va al servidor (?from=día&to=día):
   * sin él habría que bajar todas las ventas. Para clientes y visitantes el backend solo manda
   * fecha, estado y productos vendidos. Devuelve null si ese día no hubo ventas.
   */
  masVendidoDelDia: async (iso, { senal } = {}) => {
    if (!iso) return null

    const [ventas, { categorias }] = await Promise.all([
      http.get(RUTAS.ventas, { query: { from: iso, to: iso }, senal }),
      menuApi.listarCategorias({ soloDisponibles: true, senal }),
    ])

    const unidades = new Map()
    ventas
      .filter((venta) => venta.estadoPedido !== 'Cancelado')
      .forEach((venta) =>
        (venta.detalles ?? []).forEach((detalle) => {
          const nombre = nombreBase(detalle.producto)
          unidades.set(nombre, (unidades.get(nombre) ?? 0) + (Number(detalle.cantidad) || 0))
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
      ventas: ventas.length,
      // null si ese plato ya no está en la carta: se pinta el logo.
      imagen: plato?.imagen ?? null,
    }
  },

  /**
   * La «Lista top»: los tres platos mejor calificados de la carta. Desempate por precio
   * ascendente: entre dos platos de cinco estrellas, primero el que menos cuesta.
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

/* ───────────────────────── Opiniones, QR y "me gusta" ───────────────────────── */

/**
 * CALIFICAR UN PEDIDO A PARTIR DEL QR DEL TICKET.
 * El backend no expone la venta a quien no es del personal, así que aquí solo se prepara el
 * código. Las comprobaciones (que el QR exista y que no se haya calificado ya) las hace el
 * backend al registrar la valoración, y su mensaje es el que ve la persona.
 */
export const ticketsApi = {
  buscarPorQr: async (qr) => {
    const codigo = String(qr ?? '').trim().toUpperCase()
    if (!codigo) throw new Error('Escribe el código del ticket.')
    return { qr: codigo, ticket: codigo, productos: [], sinDetalle: true }
  },
}

/**
 * Valoración desde el QR del ticket (CalificarPedido). `valoracion`: entero 1-10.
 * Los comentarios SOLO se crean así: el QR es la prueba de compra. Si hay sesión, el token
 * viaja solo y el backend asocia el comentario al cliente.
 */
export const valoracionesApi = {
  registrar: ({ ticket, valoracion, texto }) =>
    http.post(RUTAS.comentarios, { codigo: ticket.qr, comentario: texto ?? '', valoracion }),
}

/** Comentario del backend → tarjeta de "Lo que dicen nuestros clientes". */
const aOpinionUi = (comentario) => ({
  id: comentario._id,
  // Nombre público del autor; null = lo dejó un visitante sin cuenta
  usuario: comentario.usuario?.name ?? null,
  nombre: comentario.usuario?.name ?? null,
  valoracion: comentario.valoracion ?? (comentario.calificacion ? comentario.calificacion * 2 : 0),
  texto: comentario.comentario ?? '',
  fecha: comentario.createdAt,
  likes: comentario.likes ?? 0,
  meGusta: Boolean(comentario.meGusta),
  moderando: false,
})

export const opinionesApi = {
  /**
   * Comentarios visibles, del más reciente al más antiguo. `conDetalle` (Admin y Owner)
   * añade el código QR, el ticket y los productos de la venta, que solo da la ruta del personal.
   */
  listar: async ({ conDetalle = false, senal } = {}) => {
    const publicos = (await http.get(RUTAS.comentariosPublicos, { senal })).map(aOpinionUi)
    if (!conDetalle) return publicos

    const completos = await http.get(RUTAS.comentarios, { senal })
    const detalleDe = new Map(completos.map((comentario) => [String(comentario._id), comentario]))
    return publicos.map((opinion) => {
      const completo = detalleDe.get(String(opinion.id))
      return {
        ...opinion,
        qr: completo?.codigo ?? null,
        ticket: completo?.venta?.ticketId ? `#T-${String(completo.venta.ticketId).padStart(4, '0')}` : '',
        productos: (completo?.venta?.detalles ?? []).map((detalle) => ({
          producto: detalle.producto,
          cantidad: detalle.cantidad,
        })),
      }
    })
  },
}

/**
 * «Me gusta»: un contador dentro del comentario. El mismo botón lo da o lo quita; el backend
 * sabe quién lo pulsa por el token. Pueden darlo Cliente, Administrador y Owner.
 */
export const meGustaApi = {
  alternar: (comentarioId) => http.patch(`${RUTAS.comentarios}/${comentarioId}/like`),
}
