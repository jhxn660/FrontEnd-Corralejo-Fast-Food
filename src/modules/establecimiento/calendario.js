// Calendario de días especiales: tipos, meses y aritmética de fechas.
//
// Vive aparte de la pantalla porque lo usan tres piezas del módulo (la
// pantalla, el formulario del día y el modal de borrado) y porque son funciones
// puras que se pueden razonar sin React.

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const DIAS_SEMANA = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO']

export const TIPOS_DIA = {
  cerrado: {
    etiqueta: 'Cerrado',
    icono: 'fa-ban',
    color: 'danger',
    ayuda: 'El local no abre ese día.',
  },
  evento: {
    etiqueta: 'Evento',
    icono: 'fa-star',
    color: 'brand',
    ayuda: 'Se abre con algo especial: promoción, fiesta, aniversario.',
  },
}

export const diaVacio = () => ({ fecha: '', tipo: 'cerrado', motivo: '' })

/**
 * "2026-12-24" → { año: 2026, mes: 11, dia: 24 }, SIN pasar por la zona
 * horaria. `new Date('2026-12-24')` se interpreta como medianoche UTC, y en
 * Colombia (UTC-5) eso cae el día 23: el calendario pintaría el día anterior.
 */
export const partesDe = (fecha) => {
  const [año, mes, dia] = String(fecha ?? '').split('-').map(Number)
  return { año, mes: mes - 1, dia }
}

export const fechaLegible = (fecha) => {
  const { año, mes, dia } = partesDe(fecha)
  return Number.isNaN(dia) ? fecha : `${dia} de ${MESES[mes] ?? ''} de ${año}`
}

/** Fecha ISO de un día concreto del mes visible, sin tocar la zona horaria. */
export const isoDe = (año, mes, dia) =>
  `${año}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

/** Mes siguiente o anterior, cambiando de año cuando toca. */
export const mesDesplazado = ({ año, mes }, delta) => {
  let nuevoMes = mes + delta
  let nuevoAño = año
  if (nuevoMes < 0) [nuevoMes, nuevoAño] = [11, año - 1]
  if (nuevoMes > 11) [nuevoMes, nuevoAño] = [0, año + 1]
  return { año: nuevoAño, mes: nuevoMes }
}

/** Cuántas celdas vacías van antes del día 1 con la semana empezando en lunes. */
export const desplazamientoDe = (año, mes) => (new Date(año, mes, 1).getDay() + 6) % 7

export const diasDelMes = (año, mes) => new Date(año, mes + 1, 0).getDate()
