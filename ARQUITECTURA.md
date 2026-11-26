# Arquitectura del frontend de Corralejo Fast Food

Este documento explica **cómo está organizado el código y por qué**. Cada regla dice cómo se
hacen las cosas en este proyecto. Si una propuesta choca con una regla, primero se discute la
regla y después se cambia el código.

Regla de oro: **el backend es la fuente de verdad.** Nombres de módulos, roles, campos y
permisos se copian del backend. Si el frontend y el backend no coinciden, se corrige el
frontend.

---

## 1. Patrón: módulos y capas

El código se organiza en dos niveles:

1. **Por módulo del negocio** (`src/modules/orders`, `sales`, `products`…), con el mismo nombre
   que su módulo en el backend. Todo lo de "pedidos" está junto, lo vea el rol que lo vea.
2. **Por capa dentro del módulo**: el nombre del archivo dice su responsabilidad. La pantalla
   no sabe cómo se guardan los datos, y los datos no saben cómo se pintan (separación de
   responsabilidades).

| Capa | Dónde | Qué hace | Qué NO hace |
|---|---|---|---|
| **Pantalla** | `Pedidos.jsx`, `Ventas.jsx`… (las que aparecen en `config/navegacion.jsx`) | Estado de la interfaz (filtros, modales), eventos y JSX. | No escribe rutas HTTP ni reglas del negocio. |
| **Componentes** | `FormularioX.jsx`, `DetalleX.jsx`, `TarjetaX.jsx` | Piezas visuales: reciben props y avisan con callbacks (`onGuardar`, `onCerrar`). | No cargan datos por su cuenta (salvo piezas autónomas como `ListaTop`). |
| **Servicio** | `servicio.js` | Reglas del negocio que encadenan llamadas: facturar, reabrir, cancelar. | No usa React. |
| **Adaptador** | `modules/<modulo>/api.js` | Traduce backend ↔ pantalla (`_id` → `id`, `price` → `precio`…). | No decide reglas del negocio. |
| **Rutas HTTP** | `src/api/<modulo>.api.js` | Una función por ruta del backend (`list`, `create`, `update`…). | No transforma datos. |
| **Funciones puras** | `calculos.js`, `esquema.js`, `validaciones.js`, `horario.js` | Cálculos, constantes y validaciones: entra un dato, sale un resultado. | No tocan la red ni React. |

---

## 2. Responsabilidad de cada carpeta de `src/`

| Carpeta | Responsabilidad |
|---|---|
| `main.jsx` | Punto de entrada: monta React, el router, `AvisosProvider` y `AuthProvider`. |
| `App.jsx` | Árbol de rutas. Solo **recorre** la tabla de navegación; no decide quién ve qué. |
| `api/` | `client.js` (la instancia de axios) y un archivo de rutas por módulo del backend. |
| `config/` | `navegacion.jsx`: qué pantallas ve cada rol (única fuente del control de acceso). `roles.config.js`: copia de los roles del backend, herencia y permisos de botones. |
| `context/` | Lo único global: la sesión (`AuthContext`) y los avisos (`AvisosContext`). |
| `modules/` | Un módulo por módulo del backend, con sus capas (tabla de arriba). |
| `components/` | Lo que no es de ningún módulo: `layout/` (cascarón, guardia de ruta, errores) y `ui/` (Modal, Estrellas, Paginacion…). |
| `hooks/` | Hooks que usa cualquier módulo: `useRecurso` (leer), `usePeticion` (escribir), `useConfirmacion` (borrar), `useSincronizar` (refrescar). |
| `services/` | Infraestructura sin reglas de negocio: `config.js` (variables de entorno) y `sincronizacion.js` (aviso de cambios entre pantallas y pestañas). |
| `data/` | Contenido fijo de interfaz: textos y paletas. **Nunca** datos del negocio. |
| `utils/` | Funciones sin módulo: moneda y fechas, ids, imágenes, validación de URL. |
| `styles/` | `theme.css`, el único CSS propio. |

---

## 3. Flujo de datos de punta a punta

### Leer (ejemplo: abrir Gestión de Inventario)

```
URL /admin/inventario
  → App.jsx             la ruta sale de config/navegacion.jsx
  → RutaProtegida       ¿el rol de la sesión tiene esta vista?        (AuthContext)
  → Layout              cabecera + menú del rol + <Inventario />
  → Inventario.jsx      useRecurso(cargar)
  → supplies/api.js     insumosApi.listar(): pide y traduce cada insumo
  → api/supplies.api.js suppliesApi.list()  →  GET /supplies
  → api/client.js       axios añade X-Token; si falla, deja el `msg` del backend en error.message
  → backend             GET http://localhost:3000/api/supplies  →  { msg, data }
  ← datos() saca `data`, el adaptador lo traduce y useRecurso lo deja en `datos`
  ← Inventario.jsx      React vuelve a pintar
```

### Escribir (ejemplo: "Finalizar y generar venta" en Pedidos)

```
Pedidos.jsx           comprueba que el pedido tenga productos y llama a facturarPedido(pedido)
  → orders/servicio.js  POST /sales { orderId }
  → backend             crea la venta, descuenta los insumos de las recetas y
                        pasa el pedido a "Finalizado" (409 si no alcanzan los insumos)
  → api/client.js       la respuesta es una escritura: notificarCambio()
  → useSincronizar      las demás pantallas abiertas (de cualquier rol o pestaña)
                        vuelven a pedir sus datos en silencio
  ← Pedidos.jsx         aviso verde y navega a Gestión de Ventas, que abre la venta nueva
```

### Sesión

```
Login.jsx → AuthContext.iniciarSesion() → authApi.login() → POST /auth/login
  → se guardan JUNTOS en localStorage: 'token' (JWT) y 'User' (datos del usuario)
  → rol = normalizarRol(usuario.role)  → App.jsx redirige a la primera vista del rol
```

---

## 4. Reglas

### Roles y sesión

- El rol vive en **un solo lugar**: el campo `role` del usuario en el backend. El frontend lo
  lee (`normalizarRol(usuario.role)`) y nunca lo guarda en un estado propio.
- `src/config/roles.config.js` copia los nombres y grupos del backend (`ROLES`, `ADMIN_ROLES`,
  `STAFF_ROLES`…). Si el backend cambia, se cambia aquí igual.
- Hay un solo `AuthContext` y se usa con el hook `useAuth()`. Ningún componente lee el token
  por su cuenta: lo guarda `api/auth.api.js` y lo envía `api/client.js`.
- Con un token guardado y vigente, `cargando` empieza en `true` hasta que el backend confirma
  la cuenta (`GET /auth/renew-token`). Ninguna pantalla protegida se pinta antes.
- La sesión dura 2 horas y el token se renueva con cada petición al backend: vence 2 horas
  después de la última petición y se cierra con un aviso. No hay temporizadores que renueven
  ni que consulten el backend por su cuenta.

### Navegación y control de acceso

- Toda pantalla tiene su propia URL: se puede recargar, compartir y volver atrás.
- Las rutas se declaran **en un solo archivo**: `src/config/navegacion.jsx`. Añadir una
  pantalla = crear el componente y añadir una entrada al rol que debe verla. El árbol de
  rutas, el menú lateral y el guardia salen de esa tabla.
- Las rutas sin sesión (`/calificar/:qr`) también están en esa tabla (`RUTAS_PUBLICAS`), nunca
  sueltas en `App.jsx`.
- Existe una ruta comodín que muestra un 404 propio, y las redirecciones usan `replace`.
- El control de acceso del frontend es **de interfaz**. La seguridad real la pone el backend,
  que revisa el token y el rol en cada ruta. Una pantalla nueva que muestre datos ajenos
  necesita primero su regla en el backend.

### Datos y red

- Ningún componente llama a `fetch` ni a `axios` directamente. Toda petición pasa por
  `src/api/<modulo>.api.js`, que usa `apiClient` de `src/api/client.js`.
- Las pantallas usan **siempre** la forma de la pantalla, nunca la del backend. La traducción
  vive en el `api.js` del módulo; si el backend cambia un campo, se cambia ahí y nada más.
- Una operación que encadena varias llamadas o toca varios módulos (facturar, reabrir un
  pedido) vive en `servicio.js`, no en el componente.
- Las URLs y valores de entorno no se escriben en el código: van en `.env` con prefijo `VITE_`.
- Ningún dato del negocio se inventa en el frontend: lo que el backend no trae se muestra como
  ausente (un producto sin imagen, un día sin horario, una meta sin definir).
- Los errores llegan a la pantalla con el `msg` del backend en `error.message`.

### Estado

| Alcance | Dónde vive |
|---|---|
| Un formulario, un modal, un filtro | `useState` del componente |
| Datos del backend que lee una pantalla | `useRecurso` o el hook del módulo (`useMenu`) |
| Sesión y rol | `AuthContext` → `useAuth()` |
| Avisos de 3 segundos | `AvisosContext` → `useAvisos()` |

- No hay un "store" global: cada dato del backend tiene un solo dueño, el hook que lo carga.
- **No se guardan datos que se pueden calcular** (subtotales, totales, contadores): se
  calculan a partir de las líneas cada vez.
- Tras una escritura se recarga el recurso completo. Es más lento que tocar el array local,
  pero nunca queda desincronizado.
- Un detalle abierto guarda el **id** del registro, no una copia: así ve los cambios que llegan
  por sincronización. Solo los formularios trabajan sobre una copia (su borrador).

### Interfaz

- No se usan `window.confirm`, `alert` ni `prompt`. Todo borrado pasa por
  `components/ui/ConfirmarEliminacion` + `hooks/useConfirmacion`: el foco arranca en
  **Cancelar** y, si el borrado falla, el modal sigue abierto con el error.
- Todos los modales usan `components/ui/Modal.jsx`. Nunca se escribe un fondo oscuro a mano.
- Toda acción confirmada (guardar, eliminar, iniciar sesión…) emite un aviso con
  `useAvisos()`: verde si salió bien, rojo si se borró algo o falló.
- El aviso **no reemplaza** al error en pantalla: si un recurso no carga, se muestra
  `MensajeError` con "Reintentar".
- Las validaciones de formulario se ejecutan antes de llamar al backend y repiten sus reglas,
  para avisar en el campo. Son ayuda, no seguridad: la validación que cuenta es la del backend.
- Cada input con error enlaza su mensaje con `aria-describedby` y `aria-invalid`.

### Estilos y dependencias

- Un solo archivo CSS propio: `src/styles/theme.css`. Lo demás sale de las clases de
  Bootstrap. Ningún componente importa su propio CSS.
- Ningún color en hexadecimal fuera de `theme.css`: en JSX se usa `var(--cff-…)`. (La única
  excepción es el blanco con que `utils/imagen.js` pinta el lienzo de una foto: no es CSS.)
- No se importa el JavaScript de Bootstrap (los modales los controla React), así que no se
  usan atributos `data-bs-*`.
- Ninguna dependencia se declara como `latest`; las de desarrollo van en `devDependencies`.
- Font Awesome y Bootstrap se instalan por npm, no por CDN.

### Higiene del código

- No se dejan `console.log`, variables sin usar ni imports sin usar (`npm run lint`).
- Los imports van en tres grupos separados por una línea en blanco: librerías
  (`react`, `axios`…); código compartido del proyecto, en este orden: `api`, `config`,
  `context`, `services`, `hooks`, `utils`, `data`, `assets`, `components` y otros módulos;
  y por último los archivos de la misma carpeta (`./…`).
- Una constante o una ayuda se escribe **una sola vez** y se importa donde haga falta
  (por ejemplo, `DIAS_HORARIO` y `horaLegible` viven en `establecimiento/horario.js`).
- Los comentarios explican el **porqué** de cómo funciona hoy; la historia de los cambios va
  en los commits.
- Todo el código usa finales de línea LF.
- Un componente por archivo. Si un componente interno pasa de ~30 líneas, va a su archivo.
- Ninguna pantalla importa de otra pantalla: lo compartido baja al `api.js` o `esquema.js` del
  módulo dueño, a `components/`, a `hooks/` o a `data/`. Sí se puede usar una **pieza** de
  otro módulo: las portadas de `establecimiento` muestran `comments/OpinionesClientes`.
- Nombres en español y con la palabra del negocio (`insumo`, `pedido`, `venta`). Los métodos
  de `src/api/*.api.js` usan los verbos del backend en inglés (`list`, `create`, `update`).
- Nunca se llama a un componente `Error`, `Map` o `Date`: tapa el objeto global de JavaScript.
