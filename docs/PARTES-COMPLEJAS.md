# Partes complejas del proyecto

Este documento explica lo que **no se entiende leyendo un solo archivo**: flujos que cruzan
varios módulos, decisiones que parecen raras hasta que se conoce el problema que resuelven, y
trampas en las que ya se cayó una vez.

Si vas a tocar algo de esta lista, lee su sección antes. Si es tu primera vez en el proyecto,
empieza por [GUIA-CODIGO-LEGIBLE.md](GUIA-CODIGO-LEGIBLE.md).

Índice:

1. [Cómo viaja una petición](#1-cómo-viaja-una-petición)
2. [La sesión: 2 horas y renovación con cada petición](#2-la-sesión-2-horas-y-renovación-con-cada-petición)
3. [Roles y quién ve qué](#3-roles-y-quién-ve-qué)
4. [Los hooks de datos y la sincronización](#4-los-hooks-de-datos-y-la-sincronización)
5. [El modal: por qué es tan largo](#5-el-modal-por-qué-es-tan-largo)
6. [Avisos de 3 segundos](#6-avisos-de-3-segundos)
7. [La carta, los combos y las imágenes](#7-la-carta-los-combos-y-las-imágenes)
8. [Recetas e inventario](#8-recetas-e-inventario)
9. [De pedido a venta](#9-de-pedido-a-venta)
10. [Calificaciones: del QR a las estrellas](#10-calificaciones-del-qr-a-las-estrellas)
11. [Comentarios y PQRS son módulos distintos](#11-comentarios-y-pqrs-son-módulos-distintos)
12. [Indicadores](#12-indicadores)
13. [Dinero y fechas](#13-dinero-y-fechas)
14. [Imprimir el tiquete](#14-imprimir-el-tiquete)
15. [Trampas de CSS ya resueltas](#15-trampas-de-css-ya-resueltas)

---

## 1. Cómo viaja una petición

```
Pantalla (Inventario.jsx)
  └─ useRecurso / usePeticion            ← estado: datos, cargando, error
<<<<<<< HEAD
       └─ modules/supplies/api.js        ← traduce backend ↔ pantalla
            └─ api/supplies.api.js       ← una función por ruta del backend
                 └─ api/client.js        ← axios: token, renovación, errores, aviso de cambio
                      └─ backend         ← http://localhost:3000/api/supplies
```

Lo que hace `api/client.js` en cada petición:

- **Antes de salir:** añade el token en la cabecera `X-Token` (es la que lee el backend).
- **Respuesta correcta:** si fue una escritura (`POST`, `PATCH`, `PUT`, `DELETE`), avisa a las
  demás pantallas (`notificarCambio`, sección 4). Después pide un token nuevo (sección 2).
- **Respuesta con error:** si es 401 con sesión abierta (token vencido o cuenta desactivada),
  borra la sesión; con otro error que el backend respondió (400, 403, 409…) también pide un
  token nuevo. Después copia el `msg` del backend en `error.message`, para que la pantalla
  muestre "No alcanzan los insumos…" y no "Request failed with status code 409".
- **`datos(peticion)`:** el backend responde `{ msg, data }`. Esta función devuelve solo
  `data`, así los adaptadores escriben `await datos(suppliesApi.list())`.

> **Trampa:** la meta anual (`GET /indicators/goal`) responde **sin** envoltorio `{ msg, data }`.
> Por eso `indicators/api.js` la lee con `.then((r) => r.data)` y no con `datos()`.

## 2. La sesión: 2 horas y renovación con cada petición

Vive en `context/AuthContext.jsx`, `api/client.js`, `api/auth.api.js` y `utils/jwt.js`.

- **Login:** `authApi.login()` guarda **juntos** en `localStorage` el `'token'` (JWT) y el
  `'User'` (datos del usuario). `clearToken()` borra los dos.
- **La sesión dura 2 horas:** el backend firma el token por 2 h (`TOKEN_TTL` en
  `jwt.helper.js`). El token trae su vencimiento (`exp`) y el navegador lo lee con
  `vencimientoDe()` (`utils/jwt.js`): el payload de un JWT no va cifrado.
- **Se renueva con cada petición al backend:** después de cada petición que el backend atiende
  (crear, leer, actualizar o eliminar; también si la rechaza con 400, 403 o 409),
  `renovarTrasPeticion()` pide un token nuevo (`GET /auth/renew-token`) que vuelve a durar 2 h.
  Así la sesión vence 2 horas después de la ÚLTIMA petición. Las peticiones que terminan casi
  juntas (al abrir una pantalla) comparten una sola renovación (300 ms), y las rutas de `/auth`
  no disparan otra (evita un bucle). No hay temporizadores que renueven por su cuenta.
- **Sin peticiones durante 2 horas, la sesión vence:** un temporizador espera hasta el `exp` del token y cierra la
  sesión con el aviso «Sesión expirada». Antes de cerrar vuelve a mirar el token guardado: si
  otra pestaña lo renovó, espera al nuevo vencimiento.
- **Al abrir la app con una sesión guardada:** si el token ya venció, se borra sin llamar al
  backend. Si sigue vigente, `cargando` empieza en `true` y se confirma con
  `GET /auth/renew-token`, que comprueba la cuenta y entrega un token nuevo. Si el backend la
  rechaza, se borra la sesión; si no hay conexión, se conserva.
- **Renovar no repinta la aplicación:** el contexto guarda solo `_id`, `name`, `email` y `role`, y
  si no cambiaron se queda con el mismo objeto (React no vuelve a pintar). El valor del contexto
  va en `useMemo`.
- **El rol** sale de `usuario.role` con `normalizarRol()`. Un valor desconocido se trata como
  `Cliente` (el de menor privilegio con cuenta). Sin sesión, el rol es `Usuario` (visitante).

## 3. Roles y quién ve qué

- **Todo lo que ve cada rol está en `src/config/navegacion.jsx`.** Esa tabla genera las rutas
  (`App.jsx`), el menú lateral (`Layout.jsx`) y el guardia (`RutaProtegida.jsx`).
- **Herencia:** `MENU_PROPIO` declara solo lo que aporta cada rol; el menú final recorre la
  cadena Owner → Administrador → Empleado. Cada entrada tiene un `modulo`; si dos roles de la
  cadena tienen el mismo, **gana el más alto**. Así el Administrador hereda Pedidos y Ventas,
  pero su Menú y sus Recetas siguen siendo los editables.
- **`enPosicionHeredada`:** la Moderación de PQRS del Administrador ocupa el lugar de la PQRS
  del Empleado dentro del bloque heredado (Pedidos, Ventas, PQRS), no al principio del menú.
- **El visitante** (sin sesión) se arma con sus propias vistas más las del cliente que **no**
  tienen `requiereCuenta` (por eso no ve PQRS).
- **El orden importa:** la primera entrada de cada rol es donde aterriza al iniciar sesión. El
  Owner repite la entrada de Gestión de Usuarios al principio solo para aterrizar ahí.
- **Una misma pantalla para varios roles** se declara varias veces con props distintas:
  `<Menu editable />` (admin), `<Menu vitrina />` (empleado), `<Menu />` (cliente).
- **`RUTAS_PUBLICAS`:** `/calificar/:qr` se abre sin sesión y sin `Layout` (no hay rol cuyo menú
  dibujar), así que `CalificarQr.jsx` trae su propio cascarón.
- **Los permisos de botones** (`PERMISO` en `roles.config.js`) copian las reglas del backend:
  `useAuth().puede(PERMISO.GESTIONAR_VENTAS)` muestra el botón solo a quien el backend le va a
  aceptar la petición.
- **Esto es control de interfaz, no seguridad.** Cualquiera puede llamar a la API a mano: lo que
  decide es el backend, que revisa el token y el rol en cada ruta.

## 4. Los hooks de datos y la sincronización

| Hook | Para qué | Devuelve |
|---|---|---|
| `useRecurso(cargar, inicial)` | **Leer** al montar la pantalla | `{ datos, cargando, error, recargar }` |
| `usePeticion(accion)` | **Escribir** (crear, guardar) | `{ ejecutar, enviando, error }` |
| `useConfirmacion(accion)` | **Borrar con confirmación** | `{ objetivo, pedir, confirmar, cancelar, enviando, error }` |
| `useSincronizar(refrescar)` | Lo usan `useRecurso` y `useMenu` por dentro | — |

Trampas:

- **`cargar` debe ir en `useCallback`.** `useRecurso` vuelve a cargar cada vez que cambia esa
  función; una función escrita en línea es nueva en cada render y la pantalla pediría los datos
  sin parar.
- **`usePeticion.ejecutar` no lanza errores:** devuelve `{ ok, datos, error }`, así se escribe
  `if (!ok) avisar…` sin `try/catch`. Además bloquea el doble clic: dos clics seguidos en
  "Guardar" no crean dos registros.
- **`useConfirmacion.confirmar()` devuelve `true` o `false`.** No intentes saber si funcionó
  leyendo `objetivo` después del `await`: ese valor es el del render anterior.
- **Si dos cargas se cruzan, gana la última que se lanzó:** una respuesta vieja que llega tarde
  no pisa a una nueva (`turno` en `useRecurso`).

**Sincronización entre pantallas, pestañas y roles** (`services/sincronizacion.js`). El backend
no avisa de los cambios, así que el frontend se avisa a sí mismo:

- Cada escritura llama a `notificarCambio()` (lo hace `api/client.js`).
- **Misma pestaña:** un `EventTarget` local; otra pantalla montada a la vez (como la Lista Top)
  se entera al instante.
- **Otras pestañas del mismo navegador:** `BroadcastChannel`.
- **Otros dispositivos:** no hay canal; `useSincronizar` vuelve a pedir los datos al volver
  a la pestaña (foco o visibilidad). No hay sondeo con temporizador: cada petición sale del uso
  real del sistema.
- Varias escrituras seguidas se agrupan en una sola recarga (150 ms), y **un refresco
  silencioso nunca interrumpe una carga visible**: si lo hacía, nadie apagaba `cargando` y la
  pantalla se quedaba en el spinner.

## 5. El modal: por qué es tan largo

`components/ui/Modal.jsx` parece mucho código para "una caja encima de la página". Cada parte
resuelve un error real:

1. **La clase `modal` en el contenedor.** Bootstrap declara las variables `--bs-modal-*`
   (fondo, relleno, radio, ancho de `modal-lg`) dentro de `.modal`. Sin esa clase el diálogo
   sale transparente.
2. **Portal a `document.body`.** Así ningún contenedor con `overflow` o `z-index` lo recorta.
3. **`onClose` guardado en una ref (`cerrarRef`).** Si el efecto dependiera de `onClose`, cada
   render del padre lo desmontaría y montaría de nuevo, y el foco saltaría con cada tecla.
4. **Pila de modales (`pila`).** Cuando un modal abre otro encima (detalle → confirmar
   borrado), solo el de arriba responde a Escape y a Tab, y el scroll de la página no se
   libera hasta que se cierra el último.
5. **Trampa de foco y foco de vuelta.** Tab no sale del modal, y al cerrarlo el foco vuelve al
   botón que lo abrió.

Los formularios largos pasan `cerrarAlPulsarFuera={false}` para no perder lo escrito con un
clic fuera.

## 6. Avisos de 3 segundos

- `AvisosProvider` (`context/AvisosContext.jsx`) envuelve toda la app en `main.jsx`, **por
  encima de la sesión**: por eso el aviso "Sesión cerrada" sobrevive a la redirección al login.
- Uso: `const avisos = useAvisos()` y luego `avisos.exito(titulo, mensaje)`,
  `avisos.error(…)`, `avisos.informacion(…)` o `avisos.fallo(titulo, err)`, que muestra
  `err.message` (el `msg` del backend).
- **El aviso no sustituye al error en pantalla:** si un recurso no carga, se muestra
  `MensajeError` con "Reintentar".

## 7. La carta, los combos y las imágenes

La carta usa dos módulos del backend: `categories` y `products`. El adaptador
`modules/products/api.js` los junta en **categorías que llevan sus platos dentro**, que es lo
que usan las pantallas.

```
categories + products ── products/api.js ── useMenu ──┬─ GestionCategorias (admin)
                                                      └─ CartaCliente (cliente, visitante, vitrina)
                     └─ productosVendibles() ─────────── CatalogoModal (Pedidos)
```

- **Dos formas de leer la carta.** Con `soloDisponibles` (cliente, visitante, empleado y
  Pedidos) se usa la ruta pública `GET /products/public`, que no pide sesión y trae las
  estrellas (`rating`). La Gestión de Menú lee `categories` y `products` completos, incluido lo
  inhabilitado.
- **Guardar una categoría sincroniza sus platos** (`sincronizarPlatos`): compara la pantalla
  con el backend; los nuevos se crean, los existentes se actualizan y los que ya no están se
  borran.
- **`productosVendibles()` es la única fuente del catálogo de Pedidos:** solo categorías y
  platos disponibles, y los combos como un producto más.

### Combos

Un **combo** es un producto que agrupa productos ya hechos (`comboItems` no vacío), por
ejemplo 1 hamburguesa + 1 papas + 1 gaseosa. Se crea en `FormularioCombo.jsx`.

- **Dos modos de precio** (`comboPriceMode`):
  - `'sum'` → **"Sumar Precio Productos"**: el backend calcula el precio y lo recalcula solo si
    cambia el precio de uno de sus productos.
  - `'custom'` → **"Determinar Precio"**: lo escribe la administración; la carta muestra cuánto
    se ahorra el cliente (`ahorroDe` en `esquema.js`).
- **Reglas del backend:** un combo no puede incluir otro combo ni a sí mismo, un combo no tiene
  receta propia, y un producto que está dentro de un combo no se puede eliminar (409).
- **Al venderse, un combo gasta las recetas de los productos que agrupa** (sección 8).

### La imagen de un producto

- Se elige en un solo sitio (`FormularioPlato.jsx` / `FormularioCombo.jsx`, con
  `ui/CampoImagen.jsx`) y **todo lo que la pinta pasa por `imagenDe(plato)`**
  (`products/esquema.js`). Sin imagen propia se pinta el logo del Corralejo.
- **Se reduce antes de guardar** (`utils/imagen.js`): 800 px de ancho y JPEG de calidad 0,72. La
  imagen viaja dentro del producto como `data:` URL, y una foto de teléfono sin reducir serían
  megabytes en la base de datos.
- El tipo se comprueba con `archivo.type` (`utils/imagen.js`), no con la extensión: el
  arrastre no respeta el `accept` del input.

## 8. Recetas e inventario

Una **receta** dice qué insumos gasta **una unidad** de un producto (módulo `recipes` del
backend). Owner y Administrador la editan en **Gestión de Recetas**; el Empleado solo la
consulta.

```
recipes (qué gasta cada producto) + supplies (cuánto hay)
  └─ recetasApi.disponibilidad()          recipes/api.js
       └─ crearSimulador()                orders/disponibilidad.js
            └─ Pedidos y CatalogoModal    cuántas unidades caben todavía en ESTE pedido
```

- **Un combo no tiene receta:** su receta es la suma de las de sus productos × la cantidad de
  cada uno (`recetaDe` en `recipes/api.js`).
- **El simulador descuenta lo que ya lleva el pedido.** 3 hamburguesas y 2 perros comparten pan
  o salsa: añadir unas reduce lo que queda para los otros. Usa las mismas fórmulas de
  `recipes/calculos.js` que aplica el backend al vender.
- **El descuento real lo hace el backend al facturar** (`POST /sales`): primero comprueba que
  alcancen todos los insumos (si no, responde 409 con `missingSupplies`), descuenta todo o nada
  y guarda en la venta lo que gastó (`suppliesUsed`). Al cancelar o eliminar esa venta, el
  backend devuelve los insumos una sola vez.
- **Stock mínimo** (`minStock`): el inventario marca "Stock bajo" cuando el stock llega al
  mínimo (`nivelDe` en `supplies/esquema.js`).

## 9. De pedido a venta

```
Pedidos.jsx  "Nuevo pedido"
  1. crearPedido(): un BORRADOR que vive solo en pantalla      orders/servicio.js
     (el backend no deja guardar un pedido vacío)
  2. al añadir el primer producto → POST /orders (deja de ser borrador)
  3. añadir, quitar o cambiar cantidades → PUT /orders/:id/items con la lista COMPLETA
Pedidos.jsx  "Finalizar y generar venta"
  4. facturarPedido() → POST /sales { orderId }
     el backend crea la venta, descuenta insumos y pasa el pedido a "Finalizado"
  5. aviso y navega a /empleado/ventas con { state: { ventaReciente } }
Ventas.jsx
  6. carga la lista (cargarVentas) y abre esa venta
```

- **Si no alcanzan los insumos**, `facturarPedido` arma un mensaje con lo que falta y cuánto
  ("Pan: se necesitan 4 und y hay 2"), con `describirFaltante` de `recipes/calculos.js`.
- **Un pedido guardado no puede quedar vacío:** para quitarlo se cancela.
- **Quitar un pedido depende de su estado** (`eliminarPedido`): un borrador se descarta en
  pantalla; uno sin venta se **cancela** (cualquier persona del personal); uno facturado se
  elimina con su venta (solo administración, con casilla de confirmación).
- **Reabrir un pedido facturado elimina su venta** (solo administración). Por eso se confirma.
- **Una venta registrada solo cambia cliente y dirección** (`EditarVenta`, `PATCH /sales/:id`).
  Los productos se corrigen reabriendo el pedido.
- **La ventana de 75 minutos para modificar una venta** se calcula con el reloj del navegador
  (`minutosRestantes`). Es una ayuda, no una regla de seguridad.
- **El detalle abierto guarda el id, no la venta:** se busca en cada render entre los datos
  sincronizados, así se ve una corrección hecha desde otro rol.

## 10. Calificaciones: del QR a las estrellas

```
QR del tiquete → /calificar/:qr (CalificarQr, sin sesión)
  → POST /comments { codigo, comentario, valoracion }      el backend valida el código
  → el backend promedia las calificaciones por producto     (rating de /products/public)
  → products/api.js: calificacion y totalCalificaciones
  → ListaTop (los 3 mejores) y las estrellas de cada producto en la carta
```

- **Lo que habilita a calificar es el código del tiquete, no la sesión:** quien tiene el QR
  hizo la compra. Por eso `/calificar` es pública y el texto es opcional (la nota sola cuenta).
- **La nota es de la compra, no de un plato:** cuenta una vez para cada producto del tiquete.
  Por eso `totalCalificaciones` es el número de compras calificadas que incluían ese producto.
- **Lista Top** (`establecimiento/ListaTop.jsx`): gana el promedio más alto; si empatan, el que
  tiene más calificaciones; si siguen empatados, por nombre. El primero va al centro y más
  grande.
- **Se modera el texto, no la nota:** la calificación cuenta desde que se registra; `visible`
  solo decide si el texto se lee en el muro.

## 11. Comentarios y PQRS son módulos distintos

| | Comentarios (`modules/comments`) | PQRS (`modules/pqrs`) |
|---|---|---|
| Qué es | Opinión pública sobre una compra | Petición, queja, reclamo o sugerencia privada |
| Quién la crea | Cualquiera con el QR del tiquete | Solo el Cliente con sesión |
| Quién la ve | Todos, si la administración la deja visible | El Cliente que la escribió y el personal |
| "Me gusta" | **Sí** (Cliente y administración) | **No** |
| Qué hace la administración | Mostrar/ocultar y eliminar (Moderación de Comentarios) | Responder `{ estado, respuesta }` y eliminar (Moderación de PQRS) |

- **"Me gusta":** `POST` / `DELETE /comments/:id/like`. El backend responde
  `{ likes, likedByMe }` y repetir la acción no suma ni resta dos veces. `likedByMe` lo calcula
  el backend con el token: sin sesión siempre es `false`.
- **El Cliente lee solo sus PQRS** con `GET /pqrs/mine`, con la respuesta del restaurante.
  Lo que escribió el Cliente no se edita: la administración solo cambia estado y respuesta.

## 12. Indicadores

- Las cifras se calculan en `modules/indicators/calculos.js` como **funciones puras**: reciben
  ventas y valoraciones y devuelven números, sin React ni red.
- La materia prima sale de `GET /sales` y `GET /comments`; en el backend solo se guarda la
  **meta anual** (`PUT /indicators/goal/:year`).
- **Las ventas canceladas no cuentan** (`ventasValidas`).
- "Productos mejor valorados" (`valoracionesPorProducto`) solo usa los comentarios con QR.

## 13. Dinero y fechas

- **El dinero se opera en enteros de pesos** (`12000`, no `"$12.000"` ni `12000.5`). El formato
  `$12.000` se aplica solo al mostrar, con `moneda()` de `utils/format.js`.
- **Nunca uses `new Date('2026-12-24')` para una fecha de calendario:** se interpreta como
  medianoche UTC y en Colombia (UTC−5) cae el día 23. Usa `partesDe()` de
  `establecimiento/calendario.js`, que separa año, mes y día sin pasar por la zona horaria.

## 14. Imprimir el tiquete

`window.print()` imprime la página entera. Para que solo salga el tiquete:

1. `TicketModal` añade la clase `imprimiendo-ticket` a `<body>` mientras está abierto y la
   quita al cerrarse.
2. En `theme.css`, dentro de `@media print`, esa clase oculta todo lo que no es el modal, su
   cabecera y su pie.
3. Lo que se imprime es el bloque `.ticket-impresion`, a 76 mm y centrado.

Si añades algo al modal del tiquete que **no** debe salir en papel, ponlo fuera de
`.ticket-impresion` o con la clase `no-imprimir`.

## 15. Trampas de CSS ya resueltas

- **`--bs-body-bg` es blanco a propósito.** Bootstrap usa esa variable también como fondo de
  listas, tablas e inputs. El gris de la página se pinta en `body { background-color }`.
- **El menú lateral acompaña el scroll.** En escritorio el `<aside>` (`.app-sidebar`) es
  `sticky`, alineado arriba (`align-self: flex-start`) y pegado justo debajo de la cabecera
  (que también es `sticky`). Ningún ancestro puede tener `overflow` ni `transform`: eso rompe
  un `sticky`. En móvil el menú abierto flota fijo bajo la cabecera.
- **La estética translúcida** (`cff-aero`) solo la añade `Layout` para cliente y visitante; en
  las tablas densas del personal el efecto cristal resta legibilidad.
=======
       └─ api.js del módulo o services/api.js
            └─ services/http.js          ← interceptores, timeout, JWT, errores
                 └─ fetch → json-server (http://localhost:3000)
```

Lo que no es obvio:

- **El token lo pone `AuthContext`, no `http.js`.** Al montarse, `AuthContext`
  llama a `registrarProveedorToken(fn)`. `http.js` llama a esa función antes de
  cada petición y añade `Authorization: Bearer …`. Se hace así para que
  `http.js` no importe Supabase: habría dos dueños de la sesión y un ciclo de
  imports.
- **Un 401 cierra la sesión** (`registrarManejadorNoAutorizado`).
- **Todo error llega como `ErrorApi`** (`services/errores.js`) con `mensaje`,
  `estado` y `codigo`. En pantalla se usa `err.message`; nunca se lee el
  `Response` de `fetch`.
- **Timeout de 15 s** (`VITE_API_TIMEOUT_MS`): `fetch` no trae ninguno y una
  API caída dejaría la pantalla cargando para siempre.
- **json-server ignora el token.** Se envía porque el back real lo validará;
  hoy no protege nada (ver [Deuda](#14-deuda-conocida)).

## 2. `api.list()` frente a `api.obtener()`

`db.json` tiene dos tipos de claves:

| Tipo | Ejemplo | Cómo se pide |
|---|---|---|
| Colección (array) | `insumos`, `sales`, `pqrs` | `api.list('insumos')` |
| Objeto suelto | `goal` | `api.obtener('goal')` o `http.get('/goal')` |

`api.list()` pasa la respuesta por `normalizarLista()`, que acepta un array o
`{ datos, total }`. **Ante un objeto cualquiera devuelve `[]` sin avisar.** Ese
fue el motivo de dos errores graves: Indicadores en blanco (leía
`comparison.previous` de un `[]`) y la gráfica de Pedidos al 100 % (el catálogo
llegaba vacío). Regla R70.

> Si una pantalla recibe un array vacío y en `db.json` sí hay datos, mira
> primero si la clave es un objeto.

## 3. Sesión, roles y quién ve qué

- **El rol vive en Supabase**, en `user_metadata.rol`. Se lee en
  `AuthContext` con `normalizarRol()`: cualquier valor desconocido se trata
  como `cliente` (el de menor privilegio).
- **Todo lo que ve cada rol está en `src/config/navegacion.jsx`.** Esa tabla
  genera las rutas (`App.jsx`), el menú lateral (`Layout.jsx`) y el guardia
  (`RutaProtegida.jsx`). Añadir una pantalla = añadir una línea ahí.
- **El orden importa:** la primera entrada de cada rol es donde aterriza al
  iniciar sesión. El cliente empieza en Establecimiento, que es su portada.
- **Una misma pantalla para varios roles** se declara varias veces con props
  distintas: `<Menu editable />` (admin), `<Menu vitrina />` (empleado),
  `<Menu />` (cliente).
- **El cliente tiene tres entradas** (Inicio, Menú, PQRS), igual que los otros
  roles. Antes era una sola vista con pestañas (`?vista=`): con la barra
  lateral de vuelta eran dos navegaciones para lo mismo. `InicioCliente.jsx`
  compone las secciones de solo lectura: ubicación, horarios y valoraciones.
- **La estética translúcida del cliente** es la clase `cff-aero`, que añade
  `Layout` solo cuando el rol es cliente. No alcanza al administrador ni al
  empleado: ahí las tablas densas pierden legibilidad con el cristal. Los
  campos y las tablas se quedan opacos y las tarjetas oscuras no se aclaran,
  para no romper el contraste del texto.
- **Lo que se ve sin sesión también está en esa tabla**, en `RUTAS_PUBLICAS`:
  hoy solo `/calificar/:qr`, la pantalla que abre el QR del tiquete. No pasa
  por `RutaProtegida` ni por `Layout` —no hay rol cuyo menú dibujar— así que
  `CalificarQr.jsx` trae su propio cascarón.
- **Esto es control de interfaz, no seguridad (R17).** Esconde botones y
  rutas, pero cualquiera con el token —o sin él, con json-server— puede llamar
  a la API directamente. La seguridad real llegará con las políticas RLS de
  Supabase.

## 4. Los tres hooks de datos

| Hook | Para qué | Devuelve |
|---|---|---|
| `useRecurso(cargar, inicial)` | **Leer** datos al montar | `{ datos, cargando, error, recargar }` |
| `usePeticion(accion)` | **Escribir** (crear, guardar, borrar) | `{ ejecutar, enviando, error }` |
| `useConfirmacion(accion)` | **Borrar con confirmación** | `{ objetivo, pedir, confirmar, cancelar, enviando, error }` |

Trampas:

- **`cargar` debe ir en `useCallback`.** `useRecurso` recarga cada vez que
  cambia esa función; una función inline crea una nueva en cada render y la
  pantalla entraría en un bucle de peticiones.
- **`usePeticion.ejecutar` no lanza:** devuelve `{ ok, datos, error }`. Se
  escribe `if (!ok) avisar…` en vez de un `try/catch`. Además bloquea el doble
  clic: dos clics seguidos en "Guardar" no crean dos registros.
- **`useConfirmacion.confirmar()` devuelve `true` o `false`.** No intentes
  saber si funcionó leyendo `objetivo` después del `await`: ese valor es el del
  render anterior y todavía apunta al registro.
- **`recargar` vuelve a poner `cargando` en `true`.** Si la pantalla sustituye
  todo por un spinner mientras `cargando`, la página se encoge y se pierde la
  posición del scroll. Pedidos solo muestra el spinner en la primera carga
  (`cargadoUnaVez`) por este motivo.

## 5. El modal: por qué es tan largo

`components/ui/Modal.jsx` parece excesivo para "una caja encima de la
página". Cada parte resuelve un error real:

1. **La clase `modal` en el contenedor.** Bootstrap declara todas las
   variables `--bs-modal-*` (fondo, relleno, radio, ancho de `modal-lg`) dentro
   de `.modal`. Sin esa clase el diálogo sale transparente. Regla R69.
2. **Portal a `document.body`.** Así ningún contenedor con `overflow` o
   `z-index` lo recorta.
3. **`onClose` guardado en una ref (`cerrarRef`).** Si el efecto dependiera
   de `onClose`, cada render del padre (que suele pasar una función inline)
   desmontaría y volvería a montar el efecto, y el foco saltaría al primer
   campo con cada tecla.
4. **Pila de modales (`pila`).** Cuando un modal abre otro encima (detalle de
   insumo → confirmar borrado), solo el de arriba responde a Escape y a Tab, y
   el scroll de la página no se libera hasta que se cierra el último.
5. **Trampa de foco y foco de vuelta.** Tab no sale del modal, y al cerrarlo
   el foco vuelve al botón que lo abrió.

Para hacer un modal nuevo: usa `Modal` y nunca escribas un overlay a mano
(R30). Los formularios largos pasan `cerrarAlPulsarFuera={false}` para no
perder lo escrito con un clic fuera.

## 6. Avisos de 3 segundos

- `AvisosProvider` (`context/AvisosContext.jsx`) envuelve toda la app en
  `main.jsx`, **por encima del router y de la sesión**. Por eso el aviso de
  "Sesión cerrada" sobrevive a la redirección al login.
- Uso: `const avisos = useAvisos()` y luego `avisos.exito(titulo, mensaje)`,
  `avisos.error(…)`, `avisos.informacion(…)` o `avisos.fallo(titulo, err)`, que
  lee `err.message`.
- Verde para lo que salió bien; rojo para borrados y fallos (R66).
- **El aviso no sustituye al error en pantalla** (R67): si un recurso no carga,
  se muestra `MensajeError` con "Reintentar".

## 7. La carta es la única fuente de lo que se vende

La colección `adminMenu` (Gestión de Menú) alimenta cuatro pantallas:

```
adminMenu ── menu/api.js: aCategoriaUi() ── useMenu ──┬─ GestionCategorias (admin)
                                                      └─ CartaCliente (cliente y vitrina del empleado)
           └─ productosVendibles() ─────────────────┬─ CatalogoModal (Pedidos)
                                                     └─ EditarVenta (Ventas)
```

- **El adaptador (`aCategoriaUi`) traduce la forma de la API a la de la
  pantalla.** En la API el campo es `categoria` y los platos son `items`; en
  pantalla, `nombre` y `productos`. Si cambias un campo de `db.json`, se cambia
  en el adaptador y nada más (R48).
- **Un plato con combo se vende como dos productos:** `Hamburguesa Clásica` y
  `Hamburguesa Clásica (combo)`, cada uno con su precio. Lo hace
  `productosVendibles()`.
- **Las categorías ocultas y los platos agotados no se venden**, pero los
  platos agotados sí se ven en la carta del cliente, marcados.
- ⚠️ **Los pedidos y las ventas guardan el NOMBRE del producto, no un id.** Si
  el administrador renombra "Hamburguesa Clásica", los pedidos viejos siguen
  diciendo el nombre antiguo y en la gráfica de Pedidos caen en "Otros". Es
  una limitación conocida de json-server; el back real usará `productoId`.

### 7.1 La imagen de un plato

- **Se gestiona en un solo sitio:** la edición de un plato
  (`menu/FormularioPlato.jsx`), con `ui/CampoImagen.jsx`. Se acepta JPG y PNG,
  arrastrando el archivo, pulsando la zona o con el teclado: el arrastre solo
  no sirve en un móvil.
- **Todo lo que la pinta pasa por `imagenDe(plato)`** (`menu/esquema.js`): la
  carta del cliente, la ficha del plato, la tabla del administrador, el
  catálogo de Pedidos, el podio de más vendidos y la lista top. Por eso una
  imagen nueva aparece en los seis sitios a la vez; no hay ningún listado con
  su propia regla.
- **Sin imagen propia se pinta el logo del Corralejo**, no un hueco ni una foto
  de archivo. El archivo del logo es blanco sobre transparente, así que las
  reglas `img.plato-foto-respaldo` e `img.miniatura-respaldo` de `theme.css` le
  ponen el fondo oscuro de la marca; van con `img.` delante para ganarle en
  especificidad a `.podio-foto`, que fija otro `object-fit` más abajo en el
  archivo.
- **Se reduce antes de guardar** (`utils/imagen.js`): 800 px de ancho y JPEG de
  calidad 0,72. La imagen viaja dentro del registro del plato, así que una foto
  de teléfono sin reducir serían megabytes de base64 en `db.json` que el
  navegador descargaría con la carta. Se aceptan PNG de entrada pero se guarda
  JPEG, y el lienzo se pinta de blanco antes de dibujar porque el JPEG no tiene
  canal alfa.
- **El tipo se comprueba por `file.type`, no por la extensión:** el `accept`
  del input es una sugerencia y el arrastre no lo respeta.
- **Quitar la imagen borra el campo**, no lo deja en null: `aCategoriaApi` lo
  omite cuando está vacío, así que el registro queda como si nunca la hubiera
  tenido.
- **El alta de platos no pide imagen.** `FormularioCategoria` crea los platos
  sin foto —nacen con el logo— y conserva la de los que ya la tienen, porque
  propaga el plato completo.

## 8. De pedido a venta

```
Pedidos.jsx  finalizarPedido()
  1. comprueba que el pedido tenga productos
  2. busca si ya existe una venta de ese pedido (no se duplica)
  3. si no, crea una con construirVenta()          ← ventas/servicio.js
  4. marca el pedido como "resuelto"
  5. guarda el id de la venta en sessionStorage    ← CLAVE_VENTA_RECIENTE
  6. navega a /empleado/ventas
Ventas.jsx
  7. lee CLAVE_VENTA_RECIENTE y abre esa venta
```

Puntos delicados:

- **Son varias llamadas sueltas, no una transacción.** Si falla el paso 4
  después del 3, queda una venta con el pedido sin resolver. El back real debe
  hacerlo en una sola operación.
- **Reabrir o cancelar un pedido resuelto borra su venta**
  (`eliminarVentasDePedido`). Por eso esas acciones piden confirmación.
- **Ventas borra al cargar las ventas "huérfanas"** (las que tienen `pedidoId`
  de un pedido que ya no existe). Si `/pedidos` llega vacío no borra nada: una
  lista vacía suele ser una base reiniciada, no que todas las ventas sobren.
  Las ventas de prueba tienen `pedidoId: null` y nunca se consideran huérfanas.
- **Modificar una venta actualiza también su pedido**, para que la gráfica de
  Pedidos y los indicadores no cuenten cosas distintas.
- **La ventana de 75 minutos para modificar** se calcula con el reloj del
  navegador (`minutosRestantes`). Es manipulable: es una ayuda, no una regla de
  seguridad.

## 9. Indicadores calculados desde las ventas y los comentarios

- El dinero sale de `/sales` y las notas de `/comentarios`. Los cálculos están en
  `modules/indicadores/calculos.js` como **funciones puras**: reciben ventas y
  devuelven cifras, sin React ni red (R53). Se pueden probar en Node.
- **Las ventas con estado "Cancelado" no cuentan** (`ventasValidas`).
- El mes de una venta sale de su campo `date` (`"2026-11-09"`), no de
  `createdAt`, para no depender de la zona horaria.
- La meta anual es el único dato que se escribe: `PUT /goal { meta }`.
- La pantalla se refresca sola cada 30 s y al volver a la pestaña.
- **Ventas de prueba:** `db.json` incluye 352 ventas con `historico: true`
  para que haya meses que comparar. Para empezar con datos reales, bórralas
  filtrando ese campo.

### El QR, el comentario y la nota de cada producto

La cadena completa, de un extremo al otro:

```
QR del tiquete  ->  venta (/sales?qrCode=)  ->  comentario con qr, estrellas
                                                y los productos del ticket
                                                      |
                                                      v
                                          valoracionesPorProducto()
                                                      |
                                                      v
                                     panel "Productos mejor valorados"
```

- **Una valoración es un comentario con QR** (R73). La colección
  `calificaciones` desapareció: un registro de `comentarios` con `qr`,
  `ticket`, `estrellas` y `productos` es una valoración; uno sin `qr` es un
  comentario del muro y no puntúa. La tabla de las tres formas del registro
  está en `modules/establecimiento/api.js`.
- **La nota es del pedido, no del plato.** El cliente puntúa el ticket
  completo, así que esa nota cuenta una vez para cada producto que iba en él.
  Por eso `reseñas` es el número de tickets en los que apareció el producto, no
  el de clientes distintos.
- **No hace falta cuenta, ni escribir** (R74). Lo que respalda la nota es el
  código del tiquete. El texto es opcional; cuando lo hay, pasa por la
  moderación del muro como cualquier comentario.
- **Se modera el texto, no la nota** (R75). La puntuación cuenta en los
  indicadores desde que se registra; `visible` solo decide si el texto se lee
  en el muro. Una puntuación sin texto no entra en el buzón de Moderación.
- **Un QR, una valoración.** Es lo único que impide votar en bucle con el mismo
  código, y hoy se comprueba en el navegador (sección 14).
- **Valoraciones de prueba:** las 30 valoraciones con `mock: true` de `db.json`
  cuelgan de ventas reales. Si las borras, el panel de productos valorados
  queda vacío hasta que alguien califique un pedido, que es el comportamiento
  correcto.

## 10. Dinero y fechas

- **El dinero se guarda y se opera en enteros de pesos** (`12000`, no
  `"$12.000"` ni `12000.5`). Con decimales, `0.1 + 0.2 !== 0.3` y el ticket
  podría no cuadrar (R54). El formato `$12.000` se aplica solo al mostrar, con
  `moneda()` de `utils/format.js`.
- **Nunca uses `new Date('2026-12-24')` para una fecha de calendario.** Se
  interpreta como medianoche UTC y en Colombia (UTC−5) cae el día 23. Usa
  `partesDe()` de `establecimiento/calendario.js`, que separa año, mes y día
  sin pasar por la zona horaria.

## 11. Imprimir el ticket

`window.print()` imprime la página entera. Para que solo salga el ticket:

1. `TicketModal` añade la clase `imprimiendo-ticket` a `<body>` mientras está
   abierto y la quita al cerrarse.
2. En `theme.css`, dentro de `@media print`, esa clase oculta todo lo que no
   es el portal del modal, oculta la cabecera y el pie del modal, y pasa el
   diálogo a `position: static` (un elemento fijo se repetiría en cada hoja).
3. Lo que se imprime es el bloque `.ticket-impresion`, a 76 mm y centrado.
4. El logo es blanco sobre transparente; en el ticket se pinta en negro con
   `.ticket-logo { filter: brightness(0) }`.

Si añades algo al modal del ticket que **no** debe salir en papel, ponlo fuera
de `.ticket-impresion` o con la clase `no-imprimir`.

## 12. Trampas de CSS ya resueltas

- **`--bs-body-bg` es blanco a propósito.** Bootstrap usa esa variable también
  como fondo de listas, tablas e inputs. El gris de la página se pinta en
  `body { background-color }`. Si la cambias a gris, las reseñas y las listas
  de PQRS vuelven a salir grises.
- **La barra lateral fija** necesita `align-self: stretch` en `.app-sidebar`:
  un elemento `sticky` solo se queda pegado si su contenedor es más alto que
  él.
- **Colores:** ningún hexadecimal fuera de `theme.css` (R28). En JSX se usa
  `var(--cff-…)`.

## 13. Código preparado para la fase 2

Estos archivos **no los usa ninguna pantalla**. Solo se importan entre ellos:

| Archivo | Qué prepara |
|---|---|
| `modules/pedidos/usePedidos.js`, `pedidos/api.js` | Pedidos contra el back real, con `productoId` y versiones |
| `modules/pedidos/calculos.js` | Totales del pedido en enteros |
| `modules/ventas/useVentas.js`, `ventas/api.js` | Ventas con `minutosRestantes` calculado por el servidor |
| `store/carrito.js` | Pedido en curso en Zustand |
| `store/bloqueos.js` | Bloqueo optimista (versión + error 409) |

Cada uno empieza con un aviso "ARCHIVO SIN USO TODAVÍA". **Si vas a arreglar
algo de Pedidos o Ventas hoy, el código está en `Pedidos.jsx`, `Ventas.jsx` y
`ventas/servicio.js`.** Cuando el back real exista, las pantallas migrarán a
estos hooks y el código actual de las pantallas se borrará.

## 14. Deuda conocida

- **json-server no tiene autenticación:** cualquiera que alcance el puerto
  3000 puede leer y modificar todo. Se resuelve migrando las colecciones a
  Supabase con RLS (R17).
- **PQRS del cliente:** se descarga toda la colección y se filtra por correo
  en el navegador; los datos ajenos llegan al equipo del cliente.
- **El QR del ticket se genera en `api.qrserver.com`:** el código de cada
  ticket sale a un tercero. Se resuelve generándolo en el navegador con una
  librería.
- **Productos identificados por nombre** en pedidos y ventas (sección 7).
- **Podio de más vendidos:** el ranking se calcula en el navegador descargando
  `/sales` (`establecimiento/api.js`); el back real debe dar un endpoint propio.
- **Las imágenes de los platos viven dentro de `db.json`** como `data:` URL
  (sección 7.1). Funciona para la carta de un restaurante, pero no es
  almacenamiento de archivos: el back real debe guardarlas aparte y devolver
  una URL.
- **PQRS privadas y muro de comentarios:** el cliente pide solo sus PQRS
  (`?usuario=correo`) y solo puede crearlas y leerlas; el admin las responde
  (campo `respuesta`) o elimina. El muro público usa la colección
  `comentarios`, con `visible` controlado por el admin. Todo esto es de
  interfaz: el back debe filtrar por el token y rechazar lo no permitido.
- **Valoración por QR:** las tres comprobaciones (la venta existe, no está
  cancelada, ese QR no se calificó antes) se hacen en el navegador, y la ruta
  `/calificar` es pública por diseño (R74). Con json-server cualquiera puede
  escribir en `comentarios` sin pasar por ellas: el back tiene que resolver el
  QR él mismo y rechazar el segundo envío del mismo código.
- **Texto sin moderar en el navegador:** `valoracionesApi.listar()` recorta el
  texto de los comentarios que aún no están aprobados, pero lo recorta *después*
  de recibirlo. La lista pública debe salir ya recortada del servidor.
- **Pedido → venta no es atómico** (sección 8).
>>>>>>> origin/main
