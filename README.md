# Corralejo Fast Food — Frontend

## 1. Descripción y stack tecnológico

Aplicación web (SPA) de gestión para el restaurante Corralejo Fast Food:
pedidos, ventas con ticket y QR, carta, inventario, empleados, indicadores,
PQRS y la portada pública del local, con un panel distinto según el rol.

La sesión (JWT) y los datos del negocio los da la API REST del
proyecto **Backend-Corralejo-Fast-Food** (Express + MongoDB), en la dirección de
`VITE_API_URL`. Este repositorio ya no trae una API ni datos propios.

| Tecnología | Uso |
|---|---|
| **React 19** | Interfaz por componentes y hooks. |
| **Vite 6** | Servidor de desarrollo y empaquetado. |
| **react-router-dom 7** | Una URL por pantalla y guardias de acceso. |
| **Bootstrap 5** (solo CSS) + **Font Awesome 6** | Estilos e iconos, instalados por npm. |
| **Sesión propia (JWT del backend)** | Inicio de sesión, registro y rol del usuario (`/api/auth`). |
| **ESLint 9** *(dev)* | Análisis estático (`npm run lint`). |

Documentación de detalle:

- **[ARQUITECTURA.md](ARQUITECTURA.md)**: patrón, responsabilidad de cada
  carpeta, flujo de datos y las reglas del proyecto.
- **[docs/GUIA-CODIGO-LEGIBLE.md](docs/GUIA-CODIGO-LEGIBLE.md)**: dónde va cada
  cosa, cómo ordenar un componente, nombres, comentarios y recetas paso a paso.
- **[docs/PARTES-COMPLEJAS.md](docs/PARTES-COMPLEJAS.md)**: los flujos que
  cruzan varios archivos (pedido → venta, indicadores, modales, impresión del
  ticket) y las trampas ya conocidas.

---

## 2. Estructura de carpetas

El detalle de cada capa está en
[ARQUITECTURA.md](ARQUITECTURA.md#0-visión-general).

El código se ordena por **módulo de dominio**, no por rol. Un rol no es una
carpeta: es una fila de la tabla de `src/config/navegacion.jsx`. Así una
pantalla que ven dos roles vive en un solo sitio y no hace falta una carpeta
"compartidas" para las excepciones.

```
FrontEnd/
├── ARQUITECTURA.md             Contrato de arquitectura
├── docs/                       Guía para juniors y partes complejas
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
    │   ├── AuthContext.jsx     Sesión: { usuario, rol, cargando, cerrarSesion, puede }
    │   └── AvisosContext.jsx   Avisos de 3 s: useAvisos().exito / error / fallo
    │
    ├── modules/                Un módulo por dominio del negocio
    │   ├── autenticacion/      Login, Register, FormularioAuth, CampoTexto
    │   ├── establecimiento/    Establecimiento, valoraciones por QR, muro, calendario
    │   ├── menu/               Menu (los tres roles), carta, productosVendibles()
    │   ├── pqrs/               PqrsCliente, PqrsEmpleado, PqrsModeracion, esquema.js
    │   ├── pedidos/            Pedidos, CatalogoModal, ConfirmarAccion, gráfica, servicio.js
    │   ├── ventas/             Ventas, EditarVenta, TicketModal, servicio.js
    │   ├── inventario/         Inventario, tarjeta, detalle, formulario, esquema
    │   ├── indicadores/        Indicadores, calculos.js (/sales + /comentarios), meta
    │   ├── usuarios/           Gestión de Usuarios: administradores y empleados (/api/users)
    │   └── visitante/          Portada del visitante sin sesión
    │
    ├── components/             Piezas sin dominio, reutilizables
    │   ├── layout/             Layout, RutaProtegida, LimiteDeError, NoEncontrado…
    │   └── ui/                 Modal, Aviso, Estado, CampoImagen…
    │
    ├── services/               Infraestructura, sin reglas de negocio
    │   ├── config.js           Único lector de import.meta.env
    │   ├── http.js             fetch a la API (VITE_API_URL): timeout, cancelación, errores
    │   ├── errores.js          ErrorApi
    │   ├── api.js              Acceso genérico (list/obtener/get/create/update/patch/remove)
    │   ├── sincronizacion.js   Aviso de cambios entre pantallas, pestañas y roles
    │   └── sesion.js           Token y usuario de la sesión (localStorage + aviso entre pestañas)
    │
    ├── hooks/
    │   ├── useRecurso.js       Leer: {datos, cargando, error, recargar}, sincronizado
    │   ├── useSincronizar.js   Refresco silencioso cuando algo cambia en la API
    │   ├── usePeticion.js      Escribir: {ejecutar, enviando, error}
    │   └── useConfirmacion.js  Borrar con confirmación
    │
    ├── data/                   Contenido estático, fuera del JSX
    │   ├── contenido.js        Textos fijos de interfaz (reglas del muro, pilares, visitante)
    │   ├── local.js            Campos editables de la ficha del local
    │   └── graficas.js         Paletas de las gráficas (citan var(--cff-…))
    │
    ├── utils/
    │   ├── format.js           Moneda, fechas y horas en formato es-CO
    │   ├── id.js               idUnico() para platos y códigos QR
    │   ├── imagen.js           Valida y reduce los JPG/PNG que sube el admin
    │   └── seguridad.js        Validación de la URL del mapa
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

## 3. Instalación y configuración

Requisitos: **Node.js 20 o superior** y el backend (`Backend-Corralejo-Fast-Food`), que da
la sesión y los datos.

```bash
npm install
cp .env.example .env     # en Windows (PowerShell): Copy-Item .env.example .env
```

Revisa en `.env` que `VITE_API_URL` apunte al backend (con `/api` al final).

### Variables de entorno

| Variable | Para qué sirve |
|---|---|
| `VITE_API_URL` | Base de la API REST del backend, con `/api`. Por defecto `http://localhost:3000/api` |
| `VITE_APP_URL` | Dirección pública de la app: es lo que codifica el QR del ticket. Por defecto, el origen actual |
| `VITE_API_TIMEOUT_MS` | Tiempo máximo de espera de la API. Por defecto 15000 |
| `VITE_SYNC_MS` | Cada cuánto se refresca la pantalla visible (cambios hechos desde otro dispositivo). Por defecto 10000; 0 lo desactiva |

Ninguna es obligatoria: todas tienen un valor por defecto para desarrollo. El único
archivo que lee variables de entorno es `src/services/config.js`.

---

## 4. Ejecución y scripts

En desarrollo hacen falta **dos terminales**:

```bash
# terminal 1, en Backend-Corralejo-Fast-Food: API en http://localhost:3000
npm run dev
# terminal 2, en esta carpeta: aplicación en http://localhost:5173
npm run dev
```

Si la aplicación muestra "No se pudo conectar con la API", es que el backend no
está en marcha o `VITE_API_URL` no apunta a él.

| Comando | Qué hace |
|---|---|
| `npm run dev` | **Desarrollo.** Servidor de Vite con recarga en caliente. |
| `npm run build` | **Producción.** Genera la aplicación optimizada en `dist/`. |
| `npm run preview` | Sirve `dist/` en local para revisar el resultado del build. |
| `npm run lint` | Revisa el código con ESLint. Debe terminar sin avisos. |

Para producción se publica el contenido de `dist/` en un servidor de archivos
estáticos, con `VITE_APP_URL` apuntando al dominio real (es lo que codifica el
QR del ticket) y `VITE_API_URL` apuntando al backend publicado.

---

## 5. Guía rápida: mapa de rutas, vistas y servicios

Cada ruta se declara una sola vez, en `src/config/navegacion.jsx`. La columna
"Servicio" es el archivo que habla con la API; "Colecciones" son los recursos
que ese servicio pide hoy (`/<colección>`).

| Ruta | Pantalla (`src/modules/…`) | Rol | Servicio | Rutas del backend (`/api/…`) |
|---|---|---|---|---|
| `/login` · `/registro` | `autenticacion/Login` · `Register` | sin sesión | `autenticacion/api.js` | `auth/login`, `auth/register` |
| `/visitante/inicio` · `/cliente/inicio` | `visitante/InicioVisitante` · `establecimiento/InicioCliente` | visitante · cliente | `establecimiento/api.js` | `ubicaciones`, `horarios`, `comments/public`, `sales` (reducido), `categories`, `products/public` |
| `/visitante/menu` · `/cliente/menu` · `/empleado/menu` | `menu/Menu` (consulta) | visitante · cliente · empleado | `menu/api.js` + `useMenu` | `categories`, `products/public` |
| `/calificar` · `/calificar/:qr` | `establecimiento/CalificarQr` | público (QR del ticket) | `establecimiento/api.js` | `comments` (POST con el código QR) |
| `/cliente/pqrs` | `pqrs/PqrsCliente` | cliente | `pqrs/api.js` | `pqrs` (solo las suyas) |
| `/empleado/pedidos` | `pedidos/Pedidos` | empleado, admin, owner | `pedidos/servicio.js` | `orders`, `sales`, `supplies/availability` |
| `/empleado/ventas` | `ventas/Ventas` | empleado, admin, owner | `ventas/servicio.js` | `sales`, `orders` |
| `/empleado/pqrs` | `pqrs/PqrsEmpleado` (solo consulta) | empleado | `pqrs/api.js` | `pqrs` (todas) |
| `/admin/establecimiento` | `establecimiento/Establecimiento` (editable) | admin, owner | `establecimiento/api.js` | `ubicaciones`, `horarios`, `comments` |
| `/admin/inventario` | `inventario/Inventario` | admin, owner | `inventario/api.js` | `supplies`, `categories` (tipo Insumo) |
| `/admin/menu` | `menu/Menu` (editable) | admin, owner | `menu/api.js` + `useMenu` | `categories`, `products` (incluye la receta) |
| `/admin/usuarios` · `/owner/usuarios` | `usuarios/GestionUsuarios` | admin, owner | `usuarios/api.js` | `users` |
| `/admin/indicadores` | `indicadores/Indicadores` | admin, owner | `indicadores/api.js` + `calculos.js` | `sales`, `comments`, `indicators/goal` |
| `/admin/pqrs` | `pqrs/PqrsModeracion` | admin, owner | `pqrs/api.js` | `pqrs`, `comments` |
| *(botón "Información" del menú)* | `establecimiento/InformacionCasa` (modal) | todos | `establecimiento/api.js` | `establecimiento` |

Toda petición sigue el mismo camino: **pantalla → servicio o `api.js` del módulo →
`services/http.js` → backend (`VITE_API_URL`)**. El recorrido completo
está en [ARQUITECTURA.md](ARQUITECTURA.md#03-flujo-de-datos-de-punta-a-punta).

---

## Roles

El rol es el campo `role` del usuario en el backend: `Owner`, `Administrador`,
`Empleado` o `Cliente`. El frontend lo traduce a `owner`, `admin`, `empleado` y
`cliente` (`normalizarRol` en `src/config/roles.js`). Sin sesión el rol es `usuario`
(visitante).

Toda cuenta del registro público nace como `Cliente`. Las cuentas de Administrador y
Empleado se crean en **Gestión de Usuarios**. El primer Owner hay que crearlo
directamente en la base de datos del backend (no hay registro público para ese rol).

**Jerarquía** (`src/config/roles.js`): `owner` hereda todo lo de `admin`, y
`admin` todo lo de `empleado`. El visitante (`usuario`) tiene lo del cliente
salvo lo que exige cuenta (PQRS, escribir en el muro, "me gusta").

| Rol | Pantallas | Rutas |
|---|---|---|
| `owner` | Todo lo del admin; su Gestión de Usuarios vive en `/owner/usuarios` y además puede eliminar administradores | `/owner/usuarios` + las del admin |
| `admin` | Establecimiento, Inventario, Menú, Gestión de Usuarios, Indicadores, Moderación de PQRS **+ Pedidos y Ventas** (heredados) | `/admin/*`, `/empleado/pedidos`, `/empleado/ventas` |
| `empleado` | Pedidos, Menú, Ventas, PQRS | `/empleado/*` |
| `cliente` | Inicio (local, horarios y valoraciones), Menú, PQRS (solo crear y leer) | `/cliente/*` |
| `usuario` *(sin sesión)* | Inicio, Menú. Sin PQRS | `/visitante/*` |
| *(público, sin panel)* | Calificar un pedido con el QR del tiquete | `/calificar/:qr` |

Sin sesión, la aplicación aterriza en `/visitante/inicio`. Una ruta que el
visitante no tiene (PQRS, paneles del personal) lo manda al login.

Cuando el admin hereda un módulo que ya tiene (Menú, PQRS), se queda con su
versión: su Menú sigue siendo el editable y su PQRS la Moderación, que no
permite modificar lo que escribió el cliente.

**Permisos de acción** (`PERMISO` en `src/config/roles.js`, leídos con
`useAuth().puede(...)`):

| Permiso | owner | admin | empleado | cliente | usuario |
|---|---|---|---|---|---|
| `ELIMINAR_ADMINS` | ✔ | | | | |
| `ELIMINAR_EMPLEADOS` | ✔ | ✔ *(provisional)* | | | |
| `GESTIONAR_PERSONAL` | ✔ | ✔ | | | |
| `PQRS_PROPIAS` | | | | ✔ | |
| `VER_DETALLE_OPINIONES` (productos calificados) | ✔ | ✔ | | | |
| `EDITAR_INFORMACION` (misión, visión, narrativa) | ✔ | ✔ | | | |

La pantalla `/calificar/:qr` es la que abre el QR impreso: quien tiene el
código del tiquete hizo la compra, y eso es lo que le da derecho a puntuar su
pedido. Está declarada en la misma tabla (`RUTAS_PUBLICAS` en
`src/config/navegacion.jsx`), no suelta en `App.jsx`.

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
  `{ usuario, rol, cargando, cerrarSesion, puede }` y se suscribe a
  `onAuthStateChange`: cerrar sesión en una pestaña cierra también las demás.
- Cada pantalla tiene su propia URL, así que se puede compartir, marcar como
  favorita y recargar. El botón Atrás del navegador recorre la aplicación.
- Una URL desconocida muestra la pantalla 404 propia
  (`src/components/layout/NoEncontrado.jsx`), nunca una página en blanco.
- Un usuario que pide una ruta ajena a su rol es redirigido a su propio panel,
  sin pasar por el login.

---

## Capa de red

```
src/services/
├── config.js          único lector de import.meta.env
├── http.js            fetch a la API: timeout, cancelación, errores normalizados
├── errores.js         ErrorApi { mensaje, estado, codigo }
├── api.js             acceso genérico a los recursos de la API
├── sincronizacion.js  anuncia cada escritura (misma pestaña + BroadcastChannel)
└── sesion.js          token y usuario de la sesión
src/hooks/
├── useRecurso.js      lecturas, refrescadas en silencio al sincronizar
├── useSincronizar.js  escritura ajena, foco de la pestaña o sondeo → refrescar
└── usePeticion.js     escrituras: { ejecutar, enviando, error }
src/modules/<dominio>/
├── api.js             rutas de la API + adaptador recurso ↔ UI
├── servicio.js        reglas de negocio que tocan varias colecciones (pedidos, ventas)
└── use<Dominio>.js
```

- `http.js` es el único cliente de la API (`VITE_API_URL`): timeout y errores
  normalizados. Todavía no envía cabecera de sesión: el token del backend
  (`X-Token`) se añadirá al conectar el login con `/api/auth`.
- La persistencia es **solo el backend**: datos del negocio, cuentas y sesión (JWT).
- **Sincronización entre roles**: cada escritura se anuncia y las pantallas
  montadas —de cualquier rol, en esta u otra pestaña— recargan en silencio.
  Desde otro dispositivo los cambios llegan con el sondeo (`VITE_SYNC_MS`) o
  al volver a la pestaña.
- `http.js` envía el token en la cabecera `X-Token`, quita el envoltorio `{ msg, data }`
  de las respuestas y cierra la sesión si el backend responde 401.

---

## Gestión de estado

| Alcance | Herramienta |
|---|---|
| Formulario, modal, filtro | `useState` local |
| Datos del servidor de una pantalla | `useRecurso` o el hook del módulo |
| Sesión | `AuthContext` |
| Avisos de 3 s | `AvisosContext` |

No hay un store global de datos: cada pantalla carga lo suyo de la API con
`useRecurso` (o el hook de su módulo), recarga después de guardar y se refresca
sola cuando otro rol cambia algo (`services/sincronizacion.js`).

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

Lo que ya ocurrió se confirma con avisos de 3 segundos (`AvisosContext` +
`ui/Aviso`) en toda la aplicación, login y registro incluidos; los diálogos
(`ui/Modal`) quedan para lo que pide una decisión.

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
| 22 | Quedaba un endpoint del backend propio (`/menu/productos`) y datos simulados en el front: WhatsApp, contacto del ticket, horario, referencias, misión/visión y un prototipo de QR con `localStorage` | Todo sale de json-server; se borraron `public/qr/`, `visitante.mock.js` y `server/asignar-ventas.mjs` |
| 23 | Un refresco de sincronización que se cruzaba con una carga visible dejaba el spinner encendido para siempre | `useRecurso` y `useMenu` no cancelan una carga visible en curso |
| 24 | Los platos tenían id posicional: una edición concurrente de otro rol pisaba el plato equivocado | `items[].id` persistido en `adminMenu` (db.json migrado) |
| 25 | Los detalles abiertos (venta, insumo, PQRS) guardaban una copia y no veían los cambios de otros roles | Se guarda el id y el registro se busca en los datos sincronizados |
| 26 | Toda venta quedaba a nombre de un empleado fijo (`#E-007`) | `employeeId` = quien factura |
| 27 | Borrar un comentario dejaba sus «me gusta» huérfanos | Se borran con él |
| 28 | El frontend dependía de json-server (`server/db.json`) y de un Express de inventario propio (`server/api`, puerto 3002) | Se retiraron `server/`, el script `npm run api`, `json-server`, `express` y `VITE_INVENTARIO_URL`; un único cliente `http` apunta al backend |

---

## Deuda técnica conocida

- **Los menús por rol son de interfaz.** Esconder una pantalla no protege nada: lo
  que protege los datos es el backend, que comprueba el token y el rol en cada ruta.
- **Campos de la ficha de insumo que el backend no guarda:** stock mínimo,
  vencimiento, peso por unidad, calorías y proveedor. El formulario los muestra pero
  llegan vacíos al recargar.
- **Ventas:** el backend no guarda descuento ni notas; corregir los productos de una
  venta la registra de nuevo (número, tiquete y QR nuevos).
- **Calificar por QR:** el visitante no ve los productos del tiquete antes de calificar
  (el backend no expone la venta sin sesión); el backend valida el QR al guardar.
- **La imagen del QR del ticket la genera un servicio externo**
  (`api.qrserver.com`, en `ventas/servicio.js`): ese servicio ve cada código y
  el ticket no muestra el QR sin conexión a internet.

---

## Pantallas compartidas

| Pantalla | Colecciones | admin | empleado / cliente |
|---|---|---|---|
| Menú | `categories`, `products` | crear, editar, eliminar, habilitar/inhabilitar | consultar, buscar y ordenar por precio |
| Establecimiento | `ubicaciones`, `horarios` | editar la ficha; añadir, editar y eliminar el horario de cada día | consultar ficha, mapa, calendario y narrativa |

Cada una vive en su módulo (`src/modules/menu/`, `src/modules/establecimiento/`)
y se declara dos o tres veces en la tabla de navegación, una por rol. La ficha del local y los días
especiales están en la API, así que lo que el administrador guarda es lo que el
cliente ve: antes la ficha era una constante en el código y el calendario vivía
en `localStorage` de cada navegador.
