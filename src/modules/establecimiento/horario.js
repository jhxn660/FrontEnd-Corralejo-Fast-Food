// Horario de atención: contrato semanal, formato de horas y estado del local.
//
// Vive aparte de la pantalla porque son funciones puras —se pueden razonar y
// probar sin React— y porque las usan tres piezas: la pestaña de Horarios, la
// insignia de "Abierto / Cerrado" y el calendario de días especiales.
//
// CONTRATO (ficha del establecimiento, campo `horarioSemanal`):
//   [{ dia: 'Lunes', abre: null,    cierra: null    },   // cerrado todo el día
//    { dia: 'Martes', abre: '14:00', cierra: '21:30' }, … ]
// Siete entradas, SIEMPRE de lunes a domingo y en ese orden. `abre`/`cierra` en
// formato de 24 horas "HH:MM"; `null` en cualquiera de los dos significa que
// ese día no se abre.
//
// Mientras el back no exponga el horario estructurado, la ficha puede traer
// solo el texto suelto `horario` ("Martes a domingo de 2 pm a 10 pm"): en ese
// caso se usa HORARIO_POR_DEFECTO, que es el horario real del local.

import { partesDe } from './calendario'

export const DIAS_LARGOS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
]

/** Horario real de la sede de Quirigua, en el orden del contrato. */
export const HORARIO_POR_DEFECTO = [
  { dia: 'Lunes', abre: null, cierra: null },
  { dia: 'Martes', abre: '14:00', cierra: '21:30' },
  { dia: 'Miércoles', abre: '14:00', cierra: '21:30' },
  { dia: 'Jueves', abre: '14:00', cierra: '21:30' },
  { dia: 'Viernes', abre: '14:00', cierra: '21:30' },
  { dia: 'Sábado', abre: '14:00', cierra: '21:30' },
  { dia: 'Domingo', abre: '14:00', cierra: '20:45' },
]

/** "14:00" → 840. Devuelve null si la hora no es válida. */
export const aMinutos = (hora) => {
  const [h, m] = String(hora ?? '').split(':').map(Number)
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return h * 60 + m
}

/**
 * "14:00" → "2:00 p. m.", como lo escribe es-CO.
 *
 * Ojo al escribir frases con esto: la cadena YA termina en punto, así que una
 * frase que acabe en una hora no lleva otro ("abrimos a las 2:00 p. m.", no
 * "…p. m..").
 */
export const hora12 = (hora) => {
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
 * `horarioSemanal`, con menos de siete días o con horas inválidas cae en el
 * horario por defecto para ese día en vez de dejar un hueco en la tabla.
 */
export const normalizarHorario = (horarioSemanal) =>
  DIAS_LARGOS.map((dia, indice) => {
    const guardado = Array.isArray(horarioSemanal)
      ? horarioSemanal.find((entrada) => entrada?.dia === dia) ?? horarioSemanal[indice]
      : null
    const base = guardado ?? HORARIO_POR_DEFECTO[indice]

    const abre = aMinutos(base?.abre) === null ? null : base.abre
    const cierra = aMinutos(base?.cierra) === null ? null : base.cierra
    const cerrado = abre === null || cierra === null

    return {
      dia,
      indice,
      abre: cerrado ? null : abre,
      cierra: cerrado ? null : cierra,
      cerrado,
      // Lo que se pinta en la columna derecha de la tabla del wireframe.
      texto: cerrado ? 'CERRADO' : `${hora12(abre)} - ${hora12(cierra)}`,
    }
  })

/** El día especial que cae en una fecha concreta, o null. */
export const diaEspecialDe = (diasEspeciales, fecha = new Date()) => {
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
 * Qué pasa un día CONCRETO del calendario, sea pasado o futuro.
 *
 * No confundir con `estadoDelLocal`, que responde "¿está abierto AHORA?" y por
 * tanto mira la hora. Esto responde "¿abre ese día y en qué franja?", que es lo
 * que necesita el calendario para pintar cada celda y la tarjeta del día que se
 * selecciona.
 *
 * `cierreSemanal` y `cerrado` son cosas distintas a propósito: el primero es
 * "los lunes no abrimos" y el segundo incluye además los días especiales. El
 * calendario los pinta diferente porque un lunes cerrado es la norma y una
 * Nochebuena cerrada es una excepción que conviene que salte a la vista.
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
 * ¿Está abierto el local ahora mismo?
 *
 * El orden de las comprobaciones importa: un día especial marcado como
 * "cerrado" manda sobre el horario semanal —para eso existe—, y solo después se
 * mira la franja del día. Devuelve siempre un motivo legible, porque la
 * insignia sin explicación ("Cerrado" a las tres de la tarde de un martes)
 * genera más dudas de las que resuelve.
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
    const siguiente = semana.find((dia) => dia.indice > hoy.indice && !dia.cerrado) ?? semana.find((dia) => !dia.cerrado)
    return {
      abierto: false,
      etiqueta: 'Cerrado',
      detalle: siguiente
        ? `Los ${hoy.dia.toLowerCase()} no abrimos. Volvemos el ${siguiente.dia.toLowerCase()} a las ${hora12(siguiente.abre)}`
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
      detalle: `Hoy abrimos a las ${hora12(hoy.abre)}`,
      hoy,
      especial,
    }
  }

  if (minutosAhora >= cierra) {
    return {
      abierto: false,
      etiqueta: 'Cerrado',
      detalle: `Hoy atendimos hasta las ${hora12(hoy.cierra)}`,
      hoy,
      especial,
    }
  }

  return {
    abierto: true,
    etiqueta: 'Abierto ahora',
    detalle:
      especial?.tipo === 'evento' && especial.motivo
        ? `${especial.motivo} Cerramos a las ${hora12(hoy.cierra)}`
        : `Cerramos a las ${hora12(hoy.cierra)}`,
    hoy,
    especial,
  }
}
