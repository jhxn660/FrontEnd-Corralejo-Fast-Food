// LO QUE VE CADA ROL. Única fuente de verdad del control de acceso (R16).
//
// Cada entrada reúne lo que define una pantalla: su ruta, cómo se llama en el
// menú, su icono y el componente que se renderiza. Si una vista no está en el
// menú de un rol, ese rol no la ve ni puede navegar hacia ella, ni escribiendo
// la URL a mano.
//
// HERENCIA (config/roles.js)
// `MENU_PROPIO` declara solo lo que cada rol aporta. El menú efectivo se
// compone recorriendo la cadena del rol: owner → admin → empleado. Cada entrada
// lleva un `modulo`; cuando dos roles de la cadena tienen el mismo módulo, gana
// el más alto. Así el admin hereda Pedidos y Ventas del empleado, pero su Menú
// sigue siendo el editable y su PQRS la Moderación (que no permite modificar lo
// que escribió el cliente), no el formulario completo del empleado.
//
// VISITANTE (rol 'usuario', sin sesión)
// Se deriva del cliente quitando las entradas con `requiereCuenta: true`.
//
// El orden importa: la primera entrada de cada rol es donde aterriza al
// iniciar sesión (rutaPorDefecto). Las heredadas van detrás de las propias.
//
// Cada pantalla se carga bajo demanda (React.lazy): un rol solo descarga el
// código de las vistas que abre. El <Suspense> que las espera está en Layout
// (paneles) y en App (rutas públicas).

import { lazy } from 'react'

import { ROL, cadenaDe } from './roles'

const Establecimiento = lazy(() => import('../modules/establecimiento/Establecimiento'))
const Menu = lazy(() => import('../modules/menu/Menu'))
const Inventario = lazy(() => import('../modules/inventario/Inventario'))
const Indicadores = lazy(() => import('../modules/indicadores/Indicadores'))
const Empleados = lazy(() => import('../modules/empleados/Empleados'))
const Pedidos = lazy(() => import('../modules/pedidos/Pedidos'))
const Ventas = lazy(() => import('../modules/ventas/Ventas'))
const PqrsEmpleado = lazy(() => import('../modules/pqrs/PqrsEmpleado'))
const PqrsCliente = lazy(() => import('../modules/pqrs/PqrsCliente'))
const PqrsModeracion = lazy(() => import('../modules/pqrs/PqrsModeracion'))
const InicioCliente = lazy(() => import('../modules/establecimiento/InicioCliente'))
const CalificarQr = lazy(() => import('../modules/establecimiento/CalificarQr'))
const InicioVisitante = lazy(() => import('../modules/visitante/InicioVisitante'))
const GestionUsuarios = lazy(() => import('../modules/usuarios/GestionUsuarios'))

const MENU_PROPIO = {
  // Lo único propio del Owner; el resto lo hereda del administrador. Es su
  // primera entrada, así que es donde aterriza al iniciar sesión.
  [ROL.OWNER]: [
    {
      modulo: 'usuarios',
      vista: 'owner-usuarios',
      ruta: '/owner/usuarios',
      titulo: 'Gestión de Usuarios',
      icono: 'fa-user-shield',
      elemento: <GestionUsuarios />,
    },
  ],

  [ROL.ADMIN]: [
    {
      modulo: 'establecimiento',
      vista: 'admin-establecimiento',
      ruta: '/admin/establecimiento',
      titulo: 'Gestión del Establecimiento',
      icono: 'fa-store',
      elemento: <Establecimiento editable />,
    },
    {
      modulo: 'inventario',
      vista: 'admin-inventario',
      ruta: '/admin/inventario',
      titulo: 'Gestión de Inventario',
      icono: 'fa-paste',
      elemento: <Inventario />,
    },
    {
      modulo: 'menu',
      vista: 'admin-menu',
      ruta: '/admin/menu',
      titulo: 'Gestión de Menú',
      icono: 'fa-utensils',
      elemento: <Menu editable />,
    },
    {
      modulo: 'empleados',
      vista: 'admin-empleados',
      ruta: '/admin/empleados',
      titulo: 'Gestión de Empleados',
      icono: 'fa-people-line',
      elemento: <Empleados />,
    },
    {
      modulo: 'indicadores',
      vista: 'admin-indicadores',
      ruta: '/admin/indicadores',
      titulo: 'Gestión de Indicadores',
      icono: 'fa-chart-pie',
      elemento: <Indicadores />,
    },
    {
      modulo: 'pqrs',
      vista: 'admin-pqrs',
      ruta: '/admin/pqrs',
      titulo: 'Moderación de PQRS',
      icono: 'fa-comments',
      // Sustituye a la PQRS del empleado EN SU SITIO: va dentro del bloque
      // heredado (Pedidos, Ventas, PQRS), no con las vistas propias del admin.
      enPosicionHeredada: true,
      elemento: <PqrsModeracion />,
    },
  ],

  [ROL.EMPLEADO]: [
    {
      modulo: 'pedidos',
      vista: 'empleado-pedidos',
      ruta: '/empleado/pedidos',
      titulo: 'Gestión de Pedidos',
      icono: 'fa-grip',
      elemento: <Pedidos />,
    },
    {
      modulo: 'menu',
      vista: 'empleado-menu',
      listaTop: true,
      ruta: '/empleado/menu',
      titulo: 'Menú',
      icono: 'fa-utensils',
      // Vitrina: la carta del cliente para enseñarla en el local, sin
      // WhatsApp ni datos de contacto.
      elemento: <Menu vitrina />,
    },
    {
      modulo: 'ventas',
      vista: 'empleado-ventas',
      ruta: '/empleado/ventas',
      titulo: 'Gestión de Ventas',
      icono: 'fa-book-open',
      elemento: <Ventas />,
    },
    {
      modulo: 'pqrs',
      vista: 'empleado-pqrs',
      ruta: '/empleado/pqrs',
      titulo: 'Gestión de PQRS',
      icono: 'fa-users-rectangle',
      elemento: <PqrsEmpleado />,
    },
  ],

  [ROL.CLIENTE]: [
    // Tres accesos en la barra lateral, como los otros dos roles. Antes era
    // una sola vista con pestañas: dos navegaciones para lo mismo.
    {
      modulo: 'inicio',
      vista: 'cliente-inicio',
      // Mismo orden que el Inicio del visitante: bienvenida, ficha, Lista Top.
      listaTopEnPagina: true,
      ruta: '/cliente/inicio',
      titulo: 'Inicio',
      icono: 'fa-house',
      elemento: <InicioCliente />,
    },
    {
      modulo: 'menu',
      vista: 'cliente-menu',
      listaTop: true,
      ruta: '/cliente/menu',
      titulo: 'Menú',
      icono: 'fa-utensils',
      elemento: <Menu />,
    },
    {
      modulo: 'pqrs',
      vista: 'cliente-pqrs',
      ruta: '/cliente/pqrs',
      titulo: 'PQRS',
      icono: 'fa-users-rectangle',
      // El visitante sin cuenta no la recibe (PERMISO.PQRS_PROPIAS).
      requiereCuenta: true,
      elemento: <PqrsCliente />,
    },
  ],

  // Panel del visitante. Sus propias rutas (/visitante/*) sustituyen a las del
  // cliente con el mismo `modulo`; cualquier vista nueva del cliente sin
  // `requiereCuenta` le llega sola (ver componerMenuVisitante).
  [ROL.USUARIO]: [
    {
      modulo: 'inicio',
      vista: 'visitante-inicio',
      ruta: '/visitante/inicio',
      titulo: 'Inicio',
      icono: 'fa-house',
      // La pantalla coloca su propia Lista Top (tercera, tras la bienvenida y
      // la ficha del local); Layout no la pinta encima en esta vista.
      listaTopEnPagina: true,
      elemento: <InicioVisitante />,
    },
    {
      modulo: 'menu',
      vista: 'visitante-menu',
      listaTop: true,
      ruta: '/visitante/menu',
      titulo: 'Menú',
      icono: 'fa-utensils',
      elemento: <Menu />,
    },
    // Sin "Mi ticket": la calificación se hace al escanear el QR del tiquete
    // (/calificar/:qr, RUTAS_PUBLICAS), no escribiendo el código en un panel.
  ],
}

/** Une listas de entradas por `modulo`: la primera que aparece gana. */
const unirPorModulo = (...listas) => {
  const modulos = new Set()
  return listas.flat().filter((item) => {
    if (modulos.has(item.modulo)) return false
    modulos.add(item.modulo)
    return true
  })
}

/**
 * Menú efectivo de un rol con herencia: propio primero, heredado después.
 *
 * Una entrada con `enPosicionHeredada` no va en el bloque propio: ocupa el
 * lugar de la vista heredada con su mismo `modulo` (la Moderación de PQRS del
 * admin, donde estaría la PQRS del empleado). Si no hay nada que sustituir,
 * va al final.
 */
const componerMenu = (rol) => {
  const listas = cadenaDe(rol).map((eslabon) => MENU_PROPIO[eslabon] ?? [])

  const sustitutos = new Map()
  listas.flat().forEach((item) => {
    if (item.enPosicionHeredada && !sustitutos.has(item.modulo)) sustitutos.set(item.modulo, item)
  })

  const base = unirPorModulo(...listas.map((lista) => lista.filter((item) => !item.enPosicionHeredada)))
  const usados = new Set()
  const menu = base.map((item) => {
    const sustituto = sustitutos.get(item.modulo)
    if (!sustituto) return item
    usados.add(item.modulo)
    return sustituto
  })

  return [...menu, ...[...sustitutos.values()].filter((item) => !usados.has(item.modulo))]
}

/** Visitante: sus vistas, más las del cliente que no exigen cuenta (nunca PQRS). */
const componerMenuVisitante = () =>
  unirPorModulo(
    MENU_PROPIO[ROL.USUARIO],
    MENU_PROPIO[ROL.CLIENTE].filter((item) => !item.requiereCuenta)
  )

export const MENU = {
  [ROL.OWNER]: componerMenu(ROL.OWNER),
  [ROL.ADMIN]: componerMenu(ROL.ADMIN),
  [ROL.EMPLEADO]: componerMenu(ROL.EMPLEADO),
  [ROL.CLIENTE]: componerMenu(ROL.CLIENTE),
  [ROL.USUARIO]: componerMenuVisitante(),
}

/**
 * RUTAS SIN SESIÓN NI LAYOUT. La otra mitad de la tabla de acceso.
 *
 * `MENU` dice qué ve cada rol (incluido el visitante, dentro del Layout); esto
 * son pantallas sueltas con su propio cascarón. Están juntas a propósito: el
 * control de acceso se lee en un archivo (R16), y una ruta pública que naciera
 * suelta en App.jsx sería justo el agujero que esta tabla existe para evitar.
 *
 * Abren el QR del tiquete: el visitante que escanea no tiene cuenta, y pedirle
 * que se registre para puntuar su pedido dejaba fuera a todo el que compra en
 * el mostrador. Lo que la protege es el propio código del ticket, que es su
 * comprobante de compra (ver modules/establecimiento/api.js).
 */
export const RUTAS_PUBLICAS = [
  { vista: 'publico-calificar', ruta: '/calificar', elemento: <CalificarQr /> },
  { vista: 'publico-calificar-qr', ruta: '/calificar/:qr', elemento: <CalificarQr /> },
]

/**
 * Todas las vistas, una vez cada una, para generar el árbol de rutas. Una vista
 * heredada aparece en varios menús pero se monta en una sola ruta.
 */
export const TODAS_LAS_VISTAS = [
  ...new Map(
    Object.values(MENU)
      .flat()
      .map((item) => [item.vista, item])
  ).values(),
]

export const vistasDe = (rol) => (MENU[rol] ?? []).map((item) => item.vista)

export const puedeVer = (rol, vista) => vistasDe(rol).includes(vista)

/** Ruta de aterrizaje del rol: la primera entrada de su menú. */
export const rutaPorDefecto = (rol) => MENU[rol]?.[0]?.ruta ?? '/login'
