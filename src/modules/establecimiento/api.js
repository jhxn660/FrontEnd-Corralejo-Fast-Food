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
