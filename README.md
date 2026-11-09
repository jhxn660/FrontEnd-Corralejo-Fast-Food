<<<<<<< HEAD
# Corralejo Fast Food — Frontend

Sistema de gestión para el restaurante Corralejo Fast Food. React 19 + Vite +
Bootstrap 5 + react-router-dom. La autenticación usa Supabase; el resto de los
datos vive en una API REST local servida con json-server.

Las reglas de arquitectura del proyecto están en **[ARQUITECTURA.md](ARQUITECTURA.md)**.

---

## Puesta en marcha

```bash
npm install
cp .env.example .env     # completa las credenciales de Supabase
```

Hacen falta **dos terminales**:

```bash
npm run api    # API REST en http://localhost:3000  (json-server)
npm run dev    # aplicación en http://localhost:5173
```

Si la aplicación muestra "No se pudo conectar con la API", es que falta `npm run api`.

### Variables de entorno

| Variable | Para qué sirve |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave pública de Supabase |
| `VITE_API_URL` | Base de la API REST. Por defecto `http://localhost:3000` |

---

## Roles

El rol se escribe en `user_metadata.rol` al registrarse y se lee del mismo
sitio. Valores aceptados: `admin`, `empleado` y `cliente`. Cualquier otro valor
se trata como `cliente`.

Toda cuenta nueva nace como `cliente`. Para elevar a `empleado` o `admin`:
Supabase → Authentication → Users → *Edit user metadata* → `{ "rol": "admin" }`.
Las cuentas creadas antes de este cambio no tienen el campo y entran como
cliente hasta que se les añada.

| Rol | Pantallas | Rutas |
|---|---|---|
| `admin` | Establecimiento, Inventario, Menú, Indicadores, Empleados | `/admin/*` |
| `empleado` | Pedidos, Menú, Ventas, PQRS | `/empleado/*` |
| `cliente` | Establecimiento, Menú, PQRS | `/cliente/*` |

**Menú** y **Establecimiento** son el mismo componente para los tres roles
(`src/modules/menu/` y `src/modules/establecimiento/`). La única diferencia es la prop `editable`, que solo
recibe el administrador: con ella aparecen los botones de crear, actualizar y
eliminar. El empleado y el cliente ven exactamente la misma pantalla, en modo
consulta, y el cliente no ve las categorías inhabilitadas.

El control de acceso vive en un único archivo: **`src/config/navegacion.jsx`**,
y se aplica en tres capas: el guardia de ruta (`RutaProtegida`), el menú lateral
y el render de cada página. Si una vista no aparece en el menú del rol activo,
ni se renderiza ni se puede navegar hacia ella, ni escribiendo la URL a mano.

---

## Sesión y navegación

- La sesión vive en **`src/context/AuthContext.jsx`**, que expone
  `{ usuario, rol, cargando, cerrarSesion }` y se suscribe a
  `onAuthStateChange`: cerrar sesión en una pestaña cierra también las demás.
- Cada pantalla tiene su propia URL, así que se puede compartir, marcar como
  favorita y recargar. El botón Atrás del navegador recorre la aplicación.
- Una URL desconocida muestra la pantalla 404 propia
  (`src/components/layout/NoEncontrado.jsx`), nunca una página en blanco.
- Un usuario que pide una ruta ajena a su rol es redirigido a su propio panel,
  sin pasar por el login.

---

## Estructura

El código se ordena por **módulo de dominio**, no por rol. Un rol no es una
carpeta: es una fila de la tabla de `src/config/navegacion.jsx`. Así una
pantalla que ven dos roles vive en un solo sitio y no hace falta una carpeta
"compartidas" para las excepciones.

```
FrontEnd/
├── ARQUITECTURA.md             Contrato de arquitectura
├── server/db.json              Base de datos de json-server
├── public/favicon.svg
├── index.html
└── src/
    ├── main.jsx                Punto de entrada; Router, AuthProvider y estilos
    ├── App.jsx                 Árbol de rutas (recorre la tabla de navegación)
    │
    ├── config/
    │   ├── navegacion.jsx      LO QUE VE CADA ROL: ruta, título, icono y pantalla
    │   └── roles.js            Roles, títulos de panel y normalizarRol()
    │
    ├── context/
    │   └── AuthContext.jsx     Sesión: { usuario, rol, cargando, cerrarSesion }
    │
    ├── modules/                Un módulo por dominio del negocio
    │   ├── autenticacion/      Login, Register, FormularioAuth, CampoTexto
    │   ├── establecimiento/    Establecimiento (admin y cliente), PieContacto
    │   ├── menu/               Menu (los tres roles)
    │   ├── pqrs/               PqrsCliente, PqrsEmpleado, esquema.js
    │   ├── pedidos/            Pedidos, CatalogoModal, ConfirmarAccion
    │   ├── ventas/             Ventas, servicio.js (QR, venta ↔ pedido)
    │   ├── inventario/         Inventario
    │   ├── indicadores/        Indicadores
    │   └── empleados/          Empleados
    │
    ├── components/             Piezas sin dominio, reutilizables
    │   ├── layout/             Layout, RutaProtegida, AccesoDenegado, NoEncontrado
    │   └── ui/                 Modal, Toast, Estado, EncabezadoPagina
    │
    ├── services/               Infraestructura, sin reglas de negocio
    │   ├── api.js              Cliente REST único (list/get/create/update/patch/remove)
    │   └── supabase.js         Cliente de Supabase
    │
    ├── hooks/
    │   └── useRecurso.js       Carga de datos: {datos, cargando, error, recargar}
    │
    ├── data/                   Contenido estático, fuera del JSX
    │   ├── contenido.js        Misión, visión, historias, valoraciones
    │   ├── local.js            Campos de la ficha y contacto del pie
    │   └── graficas.js         Paletas de las gráficas (citan var(--cff-…))
    │
    ├── utils/format.js         Moneda, fechas y horas en formato es-CO
    ├── styles/theme.css        ÚNICO CSS propio: marca + ajustes de Bootstrap
    └── assets/                 Logo y fondo del login
```

### Por qué no hay carpetas por rol

`src/pages/admin|empleado|cliente/` parecía responder a "qué ve cada rol", pero
dejaba de hacerlo en cuanto dos roles compartían una pantalla: el Menú del
empleado no estaba en `empleado/`, y PQRS quedó partido entre `cliente/`,
`empleado/` y `config/`. La relación rol → pantalla es de muchos a muchos, y una
carpeta solo sabe expresar una de uno. Esa relación vive donde se puede leer
entera de un vistazo: `src/config/navegacion.jsx`.

### Cómo añadir una pantalla

1. Crea el componente en su módulo: `src/modules/<dominio>/`. Si el dominio no
   existe todavía, crea la carpeta.
2. Añade una línea en `MENU`, dentro de `src/config/navegacion.jsx`, al rol o
   los roles que deban verla: `{ vista, ruta, titulo, icono, elemento }`.

Eso es todo: el árbol de rutas, el menú lateral y el guardia de acceso se
generan de esa tabla.

---

## Capa de red

```
src/services/
├── config.js    único lector de import.meta.env
├── http.js      cliente base: interceptores, timeout, JWT, normalización
├── errores.js   ErrorApi { codigo, estado, campos }
├── api.js       compatibilidad con las pantallas aún sin migrar
└── supabase.js
src/hooks/
├── useRecurso.js   lecturas
└── usePeticion.js  escrituras: { ejecutar, enviando, error }
src/modules/<dominio>/
├── api.js       rutas del contrato + adaptador API ↔ UI
└── use<Dominio>.js
```

- El JWT lo inyecta `AuthContext` con `registrarProveedorToken()`; `http.js`
  no conoce Supabase. `{ publica: true }` envía la petición sin cabecera.
- `http.lista()` acepta array plano (json-server) y `{ datos, total, pagina }`
  (contrato del back): migrar no obliga a tocar ningún hook.
- Hooks listos para consumir: `modules/menu/useMenu.js` y
  `modules/ventas/useVentas.js`. Las pantallas los adoptan en la fase 2.
- **`.env` es obligatorio**: sin credenciales de Supabase la aplicación falla
  al arrancar con un mensaje explícito, en lugar de romperse dentro de la
  librería.

---

## Gestión de estado

| Alcance | Herramienta |
|---|---|
| Formulario, modal, filtro | `useState` local |
| Datos del servidor de una pantalla | `useRecurso` o el hook del módulo |
| Sesión | `AuthContext` |
| Pedido en curso y bloqueos | Zustand, en `src/store/` |

```
src/store/
├── carrito.js    pedido en curso: líneas, descuento, versión, divergencia
└── bloqueos.js   versión leída al editar + conflictos 409 (RNF-12)
src/modules/pedidos/
├── calculos.js   matemática pura: subtotales, totales, payload
├── api.js        rutas, adaptador y payloads
└── usePedidos.js red + carrito + bloqueos
```

- Solo dos cosas son globales: el **pedido en curso** (lo escribe el catálogo,
  lo lee el encabezado, lo edita la tabla) y los **bloqueos** (Pedidos y Ventas
  se afectan mutuamente). El resto del estado se queda donde está.
- Los stores **no guardan totales**: se derivan con `useTotalesCarrito()`.
- El carrito persiste en `sessionStorage`: un F5 a mitad de un pedido no lo
  pierde. Es estado de UI; la verdad del pedido es el servidor.
- El total que se muestra es un preview local (RNF-04). El payload solo lleva
  `{productoId, cantidad}`: el precio lo fija el back.

---

## Estilos

Hay **un solo archivo CSS propio**: `src/styles/theme.css`. Define las variables
de marca (naranja `#ff9100`, carbón `#212121`), las paletas de las gráficas y
repinta las variables de Bootstrap. Todo lo demás —rejilla, botones, tablas,
formularios, tarjetas, badges— sale de las clases de Bootstrap 5. Ningún color
hexadecimal se escribe fuera de ese archivo.

Los modales usan el marcado de Bootstrap pero los controla React
(`src/components/ui/Modal.jsx`), montados con un portal en `document.body`:
así ningún contenedor con `overflow` o `z-index` los recorta. Por eso **no** se
importa el JavaScript de Bootstrap, solo su CSS.

Los iconos son Font Awesome 6, instalado por npm
(`@fortawesome/fontawesome-free`) e importado en `main.jsx`: queda fijado en el
lockfile, viaja en el bundle y funciona sin conexión.

Los diálogos de Login y Register usan **sweetalert2**; el resto de la interfaz
usa `ui/Modal` y `ui/Toast`. Unificar ambos caminos sigue pendiente.

---

## Interfaz y validaciones

- **Borrados (RNF-01)**: `components/ui/ConfirmarEliminacion` +
  `hooks/useConfirmacion`. Un único patrón para las seis pantallas que
  eliminan. No queda ningún `window.confirm` en el proyecto.
- **Contraseñas (RNF-15)**: `modules/autenticacion/validaciones.js` declara una
  regla por requisito (8 caracteres, mayúscula, número, especial). El registro
  las muestra en vivo y bloquea el envío; el login solo exige campos presentes.
- **Accesibilidad**: los errores de campo se enlazan con `aria-describedby` y
  `aria-invalid`; los formularios usan `noValidate` para dar mensajes propios
  en lugar de los globos del navegador.
- **Precios numéricos**: el formulario de menú pide `type="number"` y el
  adaptador los escribe como número. Los registros antiguos en texto
  (`"$12.500"`) se siguen leyendo, pero ya no se generan nuevos.

---

## Correcciones aplicadas sobre la versión anterior

| # | Problema | Solución |
|---|---|---|
| 1 | `import './Informacion.css'` con el archivo llamado `informacion.css`, e `indicadores.css` frente a `Indicadores.css`. Funcionaba en Windows, rompía el build en Linux | Se eliminaron los CSS por componente |
| 2 | Gestión de Menú leía de `:3000` y escribía en `:3001`: nada se guardaba | Un solo origen, configurable por `VITE_API_URL` |
| 3 | `bootstrap`, `sweetalert2` y `@supabase/supabase-js` estaban en el `package.json` de la carpeta padre | Un único `package.json` con todas las dependencias |
| 4 | `bootstrap` declarado pero nunca importado | Importado en `main.jsx` y usado en toda la interfaz |
| 5 | Pedidos recibía `onIrAVentas` sin valor y caía a `window.location.assign('/ventas')`, rompiendo la SPA | Navega con `useNavigate()` del router |
| 6 | Cliente y empleado escribían campos distintos (`asunto/descripcion` vs `nombre/texto`) sobre la misma colección `pqrs`: no se veían entre sí | Esquema único en `src/modules/pqrs/esquema.js`; `server/db.json` migrado |
| 7 | La pantalla PQRS del empleado existía pero no estaba enrutada | Añadida al menú del rol `empleado` |
| 8 | Menú del empleado resolvía endpoints con `if` fijos; 6 de 8 categorías quedaban vacías sin aviso | Cada categoría declara su `endpoint` en `db.json`; si no tiene, se avisa |
| 9 | No había script para levantar json-server | `npm run api` |
| 10 | Mezcla de CRLF y LF | Todo en LF |
| 11 | `window.confirm` y `alert` del navegador en flujos críticos | Modal de confirmación propio y avisos flotantes |
| 20 | Quedaban 4 `window.confirm` (Inventario, Empleados y los dos PQRS) pese a lo que afirmaba la corrección 11 | `ui/ConfirmarEliminacion` + `useConfirmacion` en las seis pantallas |
| 21 | Login y registro solo comprobaban que las contraseñas coincidieran | Política RNF-15 con regla por requisito y comprobación antes del submit |
| 12 | Tres layouts duplicados en `App.jsx` (header, sidebar y navegación idénticos) | Un `Layout` dirigido por `config/navegacion.jsx` |
| 13 | El mismo `fetch` + cabeceras + manejo de error repetido en 9 archivos | `services/api.js` |
| 14 | Cuatro modales casi idénticos en Gestión de Menú | Un modal con cuatro modos |
| 15 | El registro escribía el rol en la tabla `profiles` pero la aplicación lo leía de `user_metadata`: **todos** los usuarios entraban como cliente | El rol viaja en `options.data` del `signUp`, un solo lugar |
| 16 | La sesión se leía una vez al montar, sin suscripción: un cierre de sesión en otra pestaña pasaba inadvertido | `AuthContext` con `onAuthStateChange` |
| 17 | La navegación era un `useState` guardado en `localStorage`: ninguna pantalla era compartible y el botón Atrás salía de la aplicación | `react-router-dom`, una URL por pantalla |
| 18 | Los textos largos y las paletas vivían dentro del JSX | `src/data/` |
| 19 | Font Awesome por CDN: sin versión fija y sin funcionar sin red | Instalado por npm |

---

## Deuda técnica conocida

- **El rol se valida solo en el cliente.** Cualquiera con la consola abierta
  puede alterar el estado de React y ver otro panel. Para que el control sea
  real hacen falta políticas RLS en Supabase.
- **`cliente/Pqrs.jsx` filtra en el navegador**: descarga toda la colección
  `pqrs` y se queda con las del usuario, así que los datos ajenos llegan al
  equipo del cliente. Se corrige del lado del servidor, no aquí.
- **json-server es solo para desarrollo.** No valida, no autentica y no tiene
  transacciones. Al pasar a producción, estas colecciones deberían migrar a
  Supabase, con lo que `services/api.js` quedaría como única pieza a reescribir.
- **La colección `categoriasMenu` y sus `endpoint` quedaron sin uso.** Eran un
  duplicado de `adminMenu` con 7 de 8 categorías vacías; la carta ahora sale
  solo de `adminMenu`. Los datos siguen en `db.json` por si hay que recuperar
  algo, pero deberían borrarse.
- **Quedan precios antiguos guardados como texto** (`"$12.500"`). El adaptador
  los convierte al leer y ya se escriben como número, pero los registros viejos
  siguen en texto hasta que se editen.
- **Dos sistemas de diálogos**: sweetalert2 en las pantallas de autenticación y
  `ui/Modal` en el resto.

---

## Pantallas compartidas

| Pantalla | Colecciones | admin | empleado / cliente |
|---|---|---|---|
| Menú | `adminMenu` | crear, editar, eliminar, habilitar/inhabilitar | consultar, buscar y ordenar por precio |
| Establecimiento | `establecimiento`, `diasEspeciales` | editar la ficha; añadir, editar y eliminar días especiales | consultar ficha, mapa, calendario y narrativa |

Cada una vive en su módulo (`src/modules/menu/`, `src/modules/establecimiento/`)
y se declara dos o tres veces en la tabla de navegación, una por rol. La ficha del local y los días
especiales están en la API, así que lo que el administrador guarda es lo que el
cliente ve: antes la ficha era una constante en el código y el calendario vivía
en `localStorage` de cada navegador.
=======
# FrontEnd-Corralejo-Fast-Food
FrontEnd del Sistema de información Corralejo Fast Food
>>>>>>> 6819fce58d1a810b0ed3186de9be9c096469b5a2
