// Pone las ventas de prueba a nombre de un cliente, para poder calificar un
// pedido con el QR de su ticket.
//
// POR QUÉ HACE FALTA
// Las ventas de `db.json` nacieron sin dueño (`client: "Consumidor Final"`), y
// sin dueño no hay forma de comprobar quién compró qué: es justo lo que obligó
// a retirar la calificación de productos. Este script escribe el campo
// `cliente` en unas cuantas ventas entregadas para que la cuenta con la que
// pruebes tenga tickets propios que calificar.
//
// USO
//   node server/asignar-ventas.mjs tucorreo@gmail.com
//   node server/asignar-ventas.mjs tucorreo@gmail.com 10     (cuántas ventas)
//
// Después reinicia `npm run api` si lo tenías levantado.

import { readFileSync, writeFileSync } from 'node:fs'

const RUTA = new URL('./db.json', import.meta.url)
const [correo, cuantas = '25'] = process.argv.slice(2)

if (!correo || !correo.includes('@')) {
  console.error('Falta el correo.\n  node server/asignar-ventas.mjs tucorreo@gmail.com [cuántas]')
  process.exit(1)
}

const total = Number(cuantas)
if (!Number.isInteger(total) || total < 1) {
  console.error(`"${cuantas}" no es un número de ventas válido.`)
  process.exit(1)
}

const db = JSON.parse(readFileSync(RUTA, 'utf8'))
let asignadas = 0

// Se limpia el dueño de TODAS las ventas antes de repartir: si no, ejecutar
// esto con otro correo dejaría media lista a nombre del anterior y el reparto
// dependería de cuántas se pidieron la vez pasada.
db.sales = db.sales.map((venta) => {
  const { cliente, ...resto } = venta
  const limpia = { ...resto, client: 'Consumidor Final' }

  if (limpia.status !== 'Entregado' || asignadas >= total) return limpia

  asignadas += 1
  return { ...limpia, cliente: correo, client: correo }
})

if (asignadas === 0) {
  console.error('No hay ventas con estado "Entregado" que asignar.')
  process.exit(1)
}

// `$schema` se queda al final, como lo deja json-server.
const { $schema, ...resto } = db
writeFileSync(RUTA, `${JSON.stringify({ ...resto, $schema }, null, 2)}\n`, 'utf8')

const tickets = db.sales
  .filter((venta) => venta.cliente === correo)
  .slice(0, 3)
  .map((venta) => `  ${venta.qrCode}  (${venta.ticketId})`)

console.log(`${asignadas} venta(s) a nombre de ${correo}.`)
console.log('QR para probar:')
console.log(tickets.join('\n'))
