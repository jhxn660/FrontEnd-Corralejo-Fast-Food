<<<<<<< HEAD
// LO QUE VE CADA ROL: única fuente del control de acceso.
//
// Cada entrada define una pantalla: `modulo`, `vista`, `ruta`, `etiqueta` del menú, `icono` y
// `elemento`. Si una vista no está en el menú de un rol, ese rol no la ve ni puede abrirla
// escribiendo la URL.
//
// HERENCIA: `MENU_PROPIO` declara lo que aporta cada rol, y el menú final recorre la cadena
// Owner → Administrador → Empleado. Si dos roles tienen el mismo `modulo`, gana el más alto
// (por eso el Menú del Administrador sigue siendo el editable).
// VISITANTE: el menú del cliente sin las entradas con `requiereCuenta`.
// ORDEN: la primera entrada de cada rol es donde aterriza al iniciar sesión.
//
// Las pantallas se cargan bajo demanda (React.lazy); el <Suspense> está en Layout y en App.

import { lazy } from 'react'

import { ROLES, cadenaDe } from './roles.config'

const Establecimiento = lazy(() => import('../modules/establecimiento/Establecimiento'))
const Menu = lazy(() => import('../modules/products/Menu'))
const Inventario = lazy(() => import('../modules/supplies/Inventario'))
const Recetas = lazy(() => import('../modules/recipes/Recetas'))
const Indicadores = lazy(() => import('../modules/indicators/Indicadores'))
const Pedidos = lazy(() => import('../modules/orders/Pedidos'))
const Ventas = lazy(() => import('../modules/sales/Ventas'))
const PqrsEmpleado = lazy(() => import('../modules/pqrs/PqrsEmpleado'))
const PqrsCliente = lazy(() => import('../modules/pqrs/PqrsCliente'))
const PqrsModeracion = lazy(() => import('../modules/pqrs/PqrsModeracion'))
const ModeracionComentarios = lazy(() => import('../modules/comments/ModeracionComentarios'))
const InicioCliente = lazy(() => import('../modules/establecimiento/InicioCliente'))
const CalificarQr = lazy(() => import('../modules/comments/CalificarQr'))
const InicioVisitante = lazy(() => import('../modules/establecimiento/InicioVisitante'))
const GestionUsuarios = lazy(() => import('../modules/users/GestionUsuarios'))

/**
 * GESTIÓN DE USUARIOS (módulo `users`): una sola vista para Owner y Administrador. Cambian
 * los permisos de baja (roles.config.js): el Owner da de baja administradores y empleados; el
 * Administrador, solo empleados.
 */
const GESTION_DE_USUARIOS = {
  modulo: 'users',
  vista: 'gestion-usuarios',
  ruta: '/admin/usuarios',
  etiqueta: 'Gestión de Usuarios',
  icono: 'fa-people-line',
  elemento: <GestionUsuarios />,
}

const MENU_PROPIO = {
  // El Owner hereda todo del Administrador; repite Gestión de Usuarios solo para aterrizar ahí.
  [ROLES.OWNER]: [GESTION_DE_USUARIOS],

  [ROLES.ADMIN]: [
    {
      modulo: 'establecimiento',
      vista: 'admin-establecimiento',
      ruta: '/admin/establecimiento',
      etiqueta: 'Gestión del Establecimiento',
=======
// LO QUE VE CADA ROL. Única fuente de verdad del control de acceso (R16).
//
// Cada entrada reúne las cuatro cosas que definen una pantalla: su ruta, cómo
// se llama en el menú, su icono y el componente que se renderiza. Si una vista
// no está en el menú de un rol, ese rol no la ve ni puede navegar hacia ella,
// ni escribiendo la URL a mano.
//
// Menú y Establecimiento son el MISMO componente para los tres roles: la prop
// `editable` es lo único que cambia, y solo la recibe el administrador.
// Añadir una pantalla = añadir una línea aquí. Nada más.
//
// El orden importa: la primera entrada de cada rol es donde aterriza al
// iniciar sesión (rutaPorDefecto). El cliente empieza en Inicio, que es su
// portada: local, horarios y valoraciones.

import Establecimiento from '../modules/establecimiento/Establecimiento'
import Menu from '../modules/menu/Menu'
import Inventario from '../modules/inventario/Inventario'
import Indicadores from '../modules/indicadores/Indicadores'
import Empleados from '../modules/empleados/Empleados'
import Pedidos from '../modules/pedidos/Pedidos'
import Ventas from '../modules/ventas/Ventas'
import PqrsEmpleado from '../modules/pqrs/PqrsEmpleado'
import PqrsCliente from '../modules/pqrs/PqrsCliente'
import PqrsModeracion from '../modules/pqrs/PqrsModeracion'
import InicioCliente from '../modules/establecimiento/InicioCliente'
import CalificarQr from '../modules/establecimiento/CalificarQr'

export const MENU = {
  admin: [
    {
      vista: 'admin-establecimiento',
      ruta: '/admin/establecimiento',
      titulo: 'Gestión del Establecimiento',
>>>>>>> origin/main
      icono: 'fa-store',
      elemento: <Establecimiento editable />,
    },
    {
<<<<<<< HEAD
      modulo: 'supplies',
      vista: 'admin-inventario',
      ruta: '/admin/inventario',
      etiqueta: 'Gestión de Inventario',
=======
      vista: 'admin-inventario',
      ruta: '/admin/inventario',
      titulo: 'Gestión de Inventario',
>>>>>>> origin/main
      icono: 'fa-paste',
      elemento: <Inventario />,
    },
    {
<<<<<<< HEAD
      modulo: 'products',
      vista: 'admin-menu',
      ruta: '/admin/menu',
      etiqueta: 'Gestión de Menú',
      icono: 'fa-utensils',
      elemento: <Menu editable />,
    },
    // Recetas con CRUD completo (Owner y Administrador): POST/PATCH/DELETE /recipes
    {
      modulo: 'recipes',
      vista: 'admin-recetas',
      ruta: '/admin/recetas',
      etiqueta: 'Gestión de Recetas',
      icono: 'fa-flask',
      elemento: <Recetas editable />,
    },
    GESTION_DE_USUARIOS,
    {
      modulo: 'indicators',
      vista: 'admin-indicadores',
      ruta: '/admin/indicadores',
      etiqueta: 'Gestión de Indicadores',
      icono: 'fa-chart-pie',
      elemento: <Indicadores />,
    },
    // Comentarios (módulo `comments`) y PQRS (módulo `pqrs`) son módulos APARTE, cada uno con
    // su vista: los comentarios son públicos y tienen "me gusta"; las PQRS son privadas.
    {
      modulo: 'comments',
      vista: 'admin-comentarios',
      ruta: '/admin/comentarios',
      etiqueta: 'Moderación de Comentarios',
      icono: 'fa-comments',
      elemento: <ModeracionComentarios />,
    },
    {
      modulo: 'pqrs',
      vista: 'admin-pqrs',
      ruta: '/admin/pqrs',
      etiqueta: 'Moderación de PQRS',
      icono: 'fa-users-rectangle',
      // Sustituye a la PQRS del empleado EN SU SITIO: va dentro del bloque
      // heredado (Pedidos, Ventas, PQRS), no con las vistas propias del admin.
      enPosicionHeredada: true,
=======
      vista: 'admin-menu',
      ruta: '/admin/menu',
      titulo: 'Gestión de Menú',
      icono: 'fa-utensils',
      elemento: <Menu editable />,
    },
    {
      vista: 'admin-indicadores',
      ruta: '/admin/indicadores',
      titulo: 'Gestión de Indicadores',
      icono: 'fa-chart-pie',
      elemento: <Indicadores />,
    },
    {
      vista: 'admin-empleados',
      ruta: '/admin/empleados',
      titulo: 'Gestión de Empleados',
      icono: 'fa-people-line',
      elemento: <Empleados />,
    },
    {
      vista: 'admin-pqrs',
      ruta: '/admin/pqrs',
      titulo: 'Moderación de PQRS',
      icono: 'fa-comments',
>>>>>>> origin/main
      elemento: <PqrsModeracion />,
    },
  ],

<<<<<<< HEAD
  [ROLES.EMPLOYEE]: [
    {
      modulo: 'orders',
      vista: 'empleado-pedidos',
      ruta: '/empleado/pedidos',
      etiqueta: 'Gestión de Pedidos',
=======
  empleado: [
    {
      vista: 'empleado-pedidos',
      ruta: '/empleado/pedidos',
      titulo: 'Gestión de Pedidos',
>>>>>>> origin/main
      icono: 'fa-grip',
      elemento: <Pedidos />,
    },
    {
<<<<<<< HEAD
      modulo: 'products',
      vista: 'empleado-menu',
      listaTop: true,
      ruta: '/empleado/menu',
      etiqueta: 'Menú',
=======
      vista: 'empleado-menu',
      ruta: '/empleado/menu',
      titulo: 'Menú',
>>>>>>> origin/main
      icono: 'fa-utensils',
      // Vitrina: la carta del cliente para enseñarla en el local, sin
      // WhatsApp ni datos de contacto.
      elemento: <Menu vitrina />,
    },
<<<<<<< HEAD
    // Recetas (módulo `recipes`): el Empleado solo las consulta, igual que en el backend
    // (GET /recipes). El Administrador tiene su propia entrada editable.
    {
      modulo: 'recipes',
      vista: 'empleado-recetas',
      ruta: '/empleado/recetas',
      etiqueta: 'Recetas',
      icono: 'fa-flask',
      elemento: <Recetas />,
    },
    {
      modulo: 'sales',
      vista: 'empleado-ventas',
      ruta: '/empleado/ventas',
      etiqueta: 'Gestión de Ventas',
=======
    {
      vista: 'empleado-ventas',
      ruta: '/empleado/ventas',
      titulo: 'Gestión de Ventas',
>>>>>>> origin/main
      icono: 'fa-book-open',
      elemento: <Ventas />,
    },
    {
<<<<<<< HEAD
      modulo: 'pqrs',
      vista: 'empleado-pqrs',
      ruta: '/empleado/pqrs',
      etiqueta: 'Gestión de PQRS',
=======
      vista: 'empleado-pqrs',
      ruta: '/empleado/pqrs',
      titulo: 'Gestión de PQRS',
>>>>>>> origin/main
      icono: 'fa-users-rectangle',
      elemento: <PqrsEmpleado />,
    },
  ],

<<<<<<< HEAD
  [ROLES.CLIENT]: [
    {
      modulo: 'establecimiento',
      vista: 'cliente-inicio',
      listaTopEnPagina: true,
      ruta: '/cliente/inicio',
      etiqueta: 'Inicio',
=======
  cliente: [
    // Tres accesos en la barra lateral, como los otros dos roles. Antes era
    // una sola vista con pestañas: dos navegaciones para lo mismo.
    {
      vista: 'cliente-inicio',
      ruta: '/cliente/inicio',
      titulo: 'Inicio',
>>>>>>> origin/main
      icono: 'fa-house',
      elemento: <InicioCliente />,
    },
    {
<<<<<<< HEAD
      modulo: 'products',
      vista: 'cliente-menu',
      listaTop: true,
      ruta: '/cliente/menu',
      etiqueta: 'Menú',
=======
      vista: 'cliente-menu',
      ruta: '/cliente/menu',
      titulo: 'Menú',
>>>>>>> origin/main
      icono: 'fa-utensils',
      elemento: <Menu />,
    },
    {
<<<<<<< HEAD
      modulo: 'pqrs',
      vista: 'cliente-pqrs',
      ruta: '/cliente/pqrs',
      etiqueta: 'PQRS',
      icono: 'fa-users-rectangle',
      // El visitante sin cuenta no la recibe (PERMISO.PQRS_PROPIAS).
      requiereCuenta: true,
      elemento: <PqrsCliente />,
    },
  ],

  // Panel del visitante: sus rutas sustituyen a las del cliente con el mismo `modulo`
  // (ver componerMenuVisitante).
  [ROLES.VISITOR]: [
    {
      modulo: 'establecimiento',
      vista: 'visitante-inicio',
      ruta: '/visitante/inicio',
      etiqueta: 'Inicio',
      icono: 'fa-house',
      // La pantalla coloca su propia Lista Top; Layout no la pinta encima.
      listaTopEnPagina: true,
      elemento: <InicioVisitante />,
    },
    {
      modulo: 'products',
      vista: 'visitante-menu',
      listaTop: true,
      ruta: '/visitante/menu',
      etiqueta: 'Menú',
      icono: 'fa-utensils',
      elemento: <Menu />,
    },
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
    MENU_PROPIO[ROLES.VISITOR],
    MENU_PROPIO[ROLES.CLIENT].filter((item) => !item.requiereCuenta)
  )

export const MENU = {
  [ROLES.OWNER]: componerMenu(ROLES.OWNER),
  [ROLES.ADMIN]: componerMenu(ROLES.ADMIN),
  [ROLES.EMPLOYEE]: componerMenu(ROLES.EMPLOYEE),
  [ROLES.CLIENT]: componerMenu(ROLES.CLIENT),
  [ROLES.VISITOR]: componerMenuVisitante(),
}

/**
 * RUTAS SIN SESIÓN NI LAYOUT, cada una con su propio cascarón. Van en esta tabla (y no sueltas
 * en App.jsx) para que todo el control de acceso se lea en un solo archivo.
 * Son las del QR del tiquete: quien lo escanea no necesita cuenta, porque el código del
 * tiquete es su comprobante de compra.
=======
      vista: 'cliente-pqrs',
      ruta: '/cliente/pqrs',
      titulo: 'PQRS',
      icono: 'fa-users-rectangle',
      elemento: <PqrsCliente />,
    },
  ],
}

/**
 * RUTAS SIN SESIÓN. La otra mitad de la tabla de acceso.
 *
 * `MENU` dice qué ve cada rol; esto dice lo que se ve sin rol ninguno. Están
 * juntas a propósito: el control de acceso se lee en un archivo (R16), y una
 * ruta pública que naciera suelta en App.jsx sería justo el agujero que esta
 * tabla existe para evitar.
 *
 * Solo hay una, y abre el QR del tiquete: el visitante que escanea no tiene
 * cuenta, y pedirle que se registre para puntuar su pedido dejaba fuera a todo
 * el que compra en el mostrador. Lo que la protege es el propio código del
 * ticket, que es su comprobante de compra (ver modules/establecimiento/api.js).
>>>>>>> origin/main
 */
export const RUTAS_PUBLICAS = [
  { vista: 'publico-calificar', ruta: '/calificar', elemento: <CalificarQr /> },
  { vista: 'publico-calificar-qr', ruta: '/calificar/:qr', elemento: <CalificarQr /> },
]

<<<<<<< HEAD
/** Roles que tienen cada vista en su menú: vista → ['Owner', 'Administrador', …]. */
const ROLES_DE_VISTA = Object.entries(MENU).reduce((indice, [rol, items]) => {
  items.forEach(({ vista }) => indice.set(vista, [...(indice.get(vista) ?? []), rol]))
  return indice
}, new Map())

/**
 * Todas las vistas, una vez cada una, para generar el árbol de rutas. Una vista
 * heredada aparece en varios menús pero se monta en una sola ruta.
 *
 * Esquema de cada ruta: { vista, ruta, etiqueta, icono, roles, elemento }
 *   - `roles`: los roles permitidos (calculados desde MENU, no se escriben a mano).
 *   - `elemento`: la pantalla, cargada bajo demanda (React.lazy).
 */
export const TODAS_LAS_VISTAS = [
  ...new Map(
    Object.values(MENU)
      .flat()
      .map((item) => [item.vista, { ...item, roles: ROLES_DE_VISTA.get(item.vista) }])
  ).values(),
]

export const vistasDe = (rol) => (MENU[rol] ?? []).map((item) => item.vista)

/** ¿El rol puede abrir la vista? (lo que comprueba RutaProtegida) */
export const puedeVer = (rol, vista) => (ROLES_DE_VISTA.get(vista) ?? []).includes(rol)

/** Ruta de aterrizaje del rol: la primera entrada de su menú. */
export const rutaPorDefecto = (rol) => MENU[rol]?.[0]?.ruta ?? '/login'

/**
 * Tras iniciar sesión: vuelve a la ruta que se pidió antes del login si el rol puede
 * verla; si no (o si no había ninguna), al aterrizaje del rol.
 */
export const rutaTrasLogin = (rol, rutaPedida) =>
  TODAS_LAS_VISTAS.some(({ ruta, vista }) => ruta === rutaPedida && puedeVer(rol, vista))
    ? rutaPedida
    : rutaPorDefecto(rol)
=======
/** Todas las entradas de todos los roles, para generar el árbol de rutas. */
export const TODAS_LAS_VISTAS = Object.values(MENU).flat()

export const vistasDe = (rol) => (MENU[rol] ?? []).map((item) => item.vista)

export const puedeVer = (rol, vista) => vistasDe(rol).includes(vista)

/** Ruta de aterrizaje del rol: la primera entrada de su menú. */
export const rutaPorDefecto = (rol) => MENU[rol]?.[0]?.ruta ?? '/login'
>>>>>>> origin/main
