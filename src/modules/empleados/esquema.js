// Esquema del módulo de empleados: cargos, estados y manejo del horario.
//
// El registro que guarda la API está en inglés (`name`, `schedule`, `role`,
// `status`) porque así nació la colección. La pantalla consume estos nombres a
// través del módulo y no los traduce por su cuenta: el día que el back cambie,
// se cambia aquí.

/** Cargos del local, cada uno con su icono y su color de cinta. */
export const CARGOS = {
  Jefe: { icono: 'fa-user-tie', color: 'var(--cff-cat-combos)' },
  Cajero: { icono: 'fa-cash-register', color: 'var(--cff-cat-bebidas)' },
  Cocinero: { icono: 'fa-kitchen-set', color: 'var(--cff-cat-salchipapas)' },
  Parrillero: { icono: 'fa-fire-burner', color: 'var(--cff-cat-perros)' },
  Mesero: { icono: 'fa-plate-wheat', color: 'var(--cff-cat-hamburguesas)' },
  Domiciliario: { icono: 'fa-motorcycle', color: 'var(--cff-cat-acompanamientos)' },
}

export const NOMBRES_CARGO = Object.keys(CARGOS)

export const ESTADOS = {
  Trabajando: { etiqueta: 'En turno', color: 'success', icono: 'fa-circle-check' },
  Inactivo: { etiqueta: 'Fuera de turno', color: 'secondary', icono: 'fa-moon' },
}

export const EMPLEADO_VACIO = { name: '', inicio: '08:00', fin: '16:00', role: '', status: 'Trabajando' }

export const iconoDe = (cargo) => `fa-solid ${CARGOS[cargo]?.icono ?? 'fa-user'}`
export const colorDe = (cargo) => CARGOS[cargo]?.color ?? 'var(--cff-cat-otros)'

/** "Carlos Ramírez" → "CR". Un avatar con iniciales distingue mejor que el
 *  mismo icono de usuario repetido en nueve tarjetas. */
export const inicialesDe = (nombre = '') =>
  nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('') || '?'

/** "16:00" → "04:00 PM", el formato con el que la colección guarda el turno. */
export const a12Horas = (hhmm) => {
  const [hora, minuto] = String(hhmm ?? '').split(':').map(Number)
  if (!Number.isFinite(hora) || !Number.isFinite(minuto)) return ''
  const sufijo = hora >= 12 ? 'PM' : 'AM'
  const h12 = hora % 12 || 12
  return `${String(h12).padStart(2, '0')}:${String(minuto).padStart(2, '0')} ${sufijo}`
}

/** "04:00 PM" → "16:00", para poder usar un <input type="time">. */
export const a24Horas = (texto) => {
  const encaje = String(texto ?? '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!encaje) return ''

  let hora = Number(encaje[1])
  const minuto = encaje[2]
  const sufijo = encaje[3]?.toUpperCase()

  if (sufijo === 'PM' && hora < 12) hora += 12
  if (sufijo === 'AM' && hora === 12) hora = 0

  return `${String(hora).padStart(2, '0')}:${minuto}`
}

export const horarioTexto = (inicio, fin) => `${a12Horas(inicio)} - ${a12Horas(fin)}`

/** "08:00 AM - 04:00 PM" → { inicio: '08:00', fin: '16:00' }. */
export const partesHorario = (schedule) => {
  const [inicio, fin] = String(schedule ?? '').split('-')
  return { inicio: a24Horas(inicio) || '08:00', fin: a24Horas(fin) || '16:00' }
}

/**
 * Duración del turno en horas. Un turno que cruza la medianoche (de 6 pm a 2
 * am) daría negativo con una resta directa, así que se le suman las 24 horas.
 */
export const horasDeTurno = (inicio, fin) => {
  const minutos = (hhmm) => {
    const [h, m] = String(hhmm ?? '').split(':').map(Number)
    return Number.isFinite(h) ? h * 60 + (m || 0) : null
  }
  const desde = minutos(inicio)
  const hasta = minutos(fin)
  if (desde === null || hasta === null) return null
  const diferencia = hasta - desde
  return Math.round(((diferencia <= 0 ? diferencia + 1440 : diferencia) / 60) * 10) / 10
}

/** El registro que espera la API, armado desde los campos del formulario. */
export const aEmpleadoApi = ({ id, name, role, status, inicio, fin }) => ({
  ...(id ? { id } : {}),
  name: name.trim(),
  role,
  status,
  schedule: horarioTexto(inicio, fin),
})

/** El registro de la API, convertido a los campos que edita el formulario. */
export const aFormulario = (empleado) => ({
  id: empleado.id,
  name: empleado.name ?? '',
  role: empleado.role ?? '',
  status: empleado.status ?? 'Trabajando',
  ...partesHorario(empleado.schedule),
})
