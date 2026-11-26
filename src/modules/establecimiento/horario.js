// Horario de atención: formato de horas y estado del local (funciones puras, sin React).
//
// CONTRATO (`horarioSemanal` de la ficha):
//   [{ dia: 'Lunes', abre: null,    cierra: null    },   // cerrado todo el día
//    { dia: 'Martes', abre: '14:00', cierra: '21:30' }, … ]
// Siempre siete entradas, de lunes a domingo. Horas en formato 24 h «HH:MM»; `null` significa
// que ese día no se abre. Un día que la ficha no traiga se trata como cerrado.

import { partesDe } from './calendario'

/** Días que acepta el backend (enum `dia` del modelo Horario), de lunes a domingo. */
export const DIAS_HORARIO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

/** "14:00" → 840. Devuelve null si la hora no es válida. */
const aMinutos = (hora) => {
  const [h, m] = String(hora ?? '').split(':').map(Number)
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return h * 60 + m
}

/**
 * «14:00» → «2:00 p. m.» (es-CO). La cadena ya termina en punto: una frase que acabe en una
 * hora no lleva otro.
 */
export const horaLegible = (hora) => {
  const minutos = aMinutos(hora)
  if (minutos === null) return '—'
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  const sufijo = h >= 12 ? 'p. m.' : 'a. m.'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${sufijo}`
}

/** Lunes = 0 … domingo = 6, igual que DIAS_SEMANA del calendario. */
export const indiceDelDia = (fecha = new Date()) => (fecha.getDay() + 6) % 7

/**
 * Deja el horario de la ficha en la forma del contrato, pase lo que pase:
 * siete entradas en orden, con `cerrado` ya calculado. Una ficha sin
 * `horarioSemanal`, con menos de siete días o con horas inválidas deja ese día
 * como CERRADO en vez de dejar un hueco en la tabla.
 */
export const normalizarHorario = (horarioSemanal) =>
  DIAS_HORARIO.map((dia, indice) => {
    const guardado = Array.isArray(horarioSemanal)
      ? horarioSemanal.find((entrada) => entrada?.dia === dia) ?? horarioSemanal[indice]
      : null

    const abre = aMinutos(guardado?.abre) === null ? null : guardado.abre
    const cierra = aMinutos(guardado?.cierra) === null ? null : guardado.cierra
    const cerrado = abre === null || cierra === null

    return {
      dia,
      indice,
      abre: cerrado ? null : abre,
      cierra: cerrado ? null : cierra,
      cerrado,
      // Texto de la columna derecha de la tabla de horarios.
      texto: cerrado ? 'CERRADO' : `${horaLegible(abre)} - ${horaLegible(cierra)}`,
    }
  })

/** El día especial que cae en una fecha concreta, o null. */
const diaEspecialDe = (diasEspeciales, fecha = new Date()) => {
  const año = fecha.getFullYear()
  const mes = fecha.getMonth()
  const dia = fecha.getDate()

  return (
    (diasEspeciales ?? []).find((especial) => {
      const partes = partesDe(especial.fecha)
      return partes.año === año && partes.mes === mes && partes.dia === dia
    }) ?? null
  )
}

/**
 * Qué pasa un día CONCRETO del calendario: ¿abre y en qué franja? No mira la hora (para
 * «¿está abierto AHORA?» está `estadoDelLocal`).
 * `cierreSemanal` («los lunes no abrimos») y `cerrado` (que incluye los días especiales) se
 * pintan distinto: un cierre especial debe saltar a la vista.
 */
export const resumenDelDia = ({ horarioSemanal, diasEspeciales, fecha } = {}) => {
  const dia = normalizarHorario(horarioSemanal)[indiceDelDia(fecha)]
  const especial = diaEspecialDe(diasEspeciales, fecha)
  const cerradoPorEspecial = especial?.tipo === 'cerrado'

  return {
    fecha,
    dia: dia.dia,
    indice: dia.indice,
    abre: dia.abre,
    cierra: dia.cierra,
    cierreSemanal: dia.cerrado,
    cerrado: dia.cerrado || cerradoPorEspecial,
    especial,
    texto: cerradoPorEspecial ? 'CERRADO' : dia.texto,
    motivo: cerradoPorEspecial
      ? especial.motivo || 'El local no abre ese día.'
      : dia.cerrado
        ? `Los ${dia.dia.toLowerCase()} el local no abre.`
        : especial?.motivo || '',
  }
}

/**
 * ¿Está abierto el local ahora mismo? Un día especial cerrado manda sobre el horario semanal.
 * Devuelve siempre un motivo legible para la insignia.
 */
export const estadoDelLocal = ({ horarioSemanal, diasEspeciales, ahora = new Date() } = {}) => {
  const semana = normalizarHorario(horarioSemanal)
  const hoy = semana[indiceDelDia(ahora)]
  const especial = diaEspecialDe(diasEspeciales, ahora)

  if (especial?.tipo === 'cerrado') {
    return {
      abierto: false,
      etiqueta: 'Cerrado hoy',
      detalle: especial.motivo || 'El local no abre hoy.',
      hoy,
      especial,
    }
  }

  if (hoy.cerrado) {
    // El próximo día abierto de esta semana; si no queda ninguno, el primero de la siguiente
    const siguiente =
      semana.find((dia) => dia.indice > hoy.indice && !dia.cerrado) ?? semana.find((dia) => !dia.cerrado)
    return {
      abierto: false,
      etiqueta: 'Cerrado',
      detalle: siguiente
        ? `Los ${hoy.dia.toLowerCase()} no abrimos. Volvemos el ${siguiente.dia.toLowerCase()} a las ${horaLegible(siguiente.abre)}`
        : `Los ${hoy.dia.toLowerCase()} no abrimos.`,
      hoy,
      especial,
    }
  }

  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes()
  const abre = aMinutos(hoy.abre)
  const cierra = aMinutos(hoy.cierra)

  if (minutosAhora < abre) {
    return {
      abierto: false,
      etiqueta: 'Cerrado',
      detalle: `Hoy abrimos a las ${horaLegible(hoy.abre)}`,
      hoy,
      especial,
    }
  }

  if (minutosAhora >= cierra) {
    return {
      abierto: false,
      etiqueta: 'Cerrado',
      detalle: `Hoy atendimos hasta las ${horaLegible(hoy.cierra)}`,
      hoy,
      especial,
    }
  }

  return {
    abierto: true,
    etiqueta: 'Abierto ahora',
    detalle:
      especial?.tipo === 'evento' && especial.motivo
        ? `${especial.motivo} Cerramos a las ${horaLegible(hoy.cierra)}`
        : `Cerramos a las ${horaLegible(hoy.cierra)}`,
    hoy,
    especial,
  }
}
