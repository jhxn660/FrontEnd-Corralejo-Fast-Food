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
// iniciar sesión (rutaPorDefecto). Por eso el cliente empieza en el menú.

import Establecimiento from '../modules/establecimiento/Establecimiento'
import Menu from '../modules/menu/Menu'
import Inventario from '../modules/inventario/Inventario'
import Indicadores from '../modules/indicadores/Indicadores'
import Empleados from '../modules/empleados/Empleados'
import Pedidos from '../modules/pedidos/Pedidos'
import Ventas from '../modules/ventas/Ventas'
import PqrsEmpleado from '../modules/pqrs/PqrsEmpleado'
import PqrsCliente from '../modules/pqrs/PqrsCliente'

export const MENU = {
  admin: [
    {
      vista: 'admin-establecimiento',
      ruta: '/admin/establecimiento',
      titulo: 'Gestión del Establecimiento',
      icono: 'fa-store',
      elemento: <Establecimiento editable />,
    },
    {
      vista: 'admin-inventario',
      ruta: '/admin/inventario',
      titulo: 'Gestión de Inventario',
      icono: 'fa-paste',
      elemento: <Inventario />,
    },
    {
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
  ],

  empleado: [
    {
      vista: 'empleado-pedidos',
      ruta: '/empleado/pedidos',
      titulo: 'Gestión de Pedidos',
      icono: 'fa-grip',
      elemento: <Pedidos />,
    },
    {
      vista: 'empleado-menu',
      ruta: '/empleado/menu',
      titulo: 'Menú',
      icono: 'fa-utensils',
      // Vitrina: la carta del cliente para enseñarla en el local, sin
      // WhatsApp ni datos de contacto.
      elemento: <Menu vitrina />,
    },
    {
      vista: 'empleado-ventas',
      ruta: '/empleado/ventas',
      titulo: 'Gestión de Ventas',
      icono: 'fa-book-open',
      elemento: <Ventas />,
    },
    {
      vista: 'empleado-pqrs',
      ruta: '/empleado/pqrs',
      titulo: 'Gestión de PQRS',
      icono: 'fa-users-rectangle',
      elemento: <PqrsEmpleado />,
    },
  ],

  cliente: [
    {
      vista: 'cliente-menu',
      ruta: '/cliente/menu',
      titulo: 'Menú',
      icono: 'fa-utensils',
      elemento: <Menu />,
    },
    {
      vista: 'cliente-establecimiento',
      ruta: '/cliente/establecimiento',
      titulo: 'Establecimiento',
      icono: 'fa-store',
      elemento: <Establecimiento />,
    },
    {
      vista: 'cliente-pqrs',
      ruta: '/cliente/pqrs',
      titulo: 'PQRS',
      icono: 'fa-users-rectangle',
      elemento: <PqrsCliente />,
    },
  ],
}

/** Todas las entradas de todos los roles, para generar el árbol de rutas. */
export const TODAS_LAS_VISTAS = Object.values(MENU).flat()

export const vistasDe = (rol) => (MENU[rol] ?? []).map((item) => item.vista)

export const puedeVer = (rol, vista) => vistasDe(rol).includes(vista)

/** Ruta de aterrizaje del rol: la primera entrada de su menú. */
export const rutaPorDefecto = (rol) => MENU[rol]?.[0]?.ruta ?? '/login'
