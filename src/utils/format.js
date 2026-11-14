export const moneda = (valor) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(valor) || 0)

export const numero = (valor) => Number(valor || 0).toLocaleString('es-CO')

export const fechaCorta = (iso) => {
  if (!iso) return '---'
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  return fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const fechaISO = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const hora12 = (date = new Date()) => {
  const h = date.getHours()
  return `${h % 12 || 12}:${String(date.getMinutes()).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

/** "Carlos Ramírez" → "CR". Para avatares con iniciales. */
export const inicialesDe = (nombre = '') =>
  String(nombre)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('') || '?'
