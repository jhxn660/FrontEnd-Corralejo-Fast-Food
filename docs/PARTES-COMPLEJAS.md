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
- **La lista muestra solo los pedidos de HOY.** El desplegable «Día» lleva a cualquier otro día
  con pedidos («Ayer», «martes, 24 de noviembre»…) o a «Todos los días»; los contadores de
  estado y la gráfica siguen al día elegido. Crear un pedido vuelve a hoy. La fecha de cada
  pedido sale de su `createdAt` en la hora del navegador (`diasConPedidos` y `etiquetaDia` en
  `orders/servicio.js`).
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
- **Horario semanal vs. una fecha concreta:** `/horarios` guarda un registro por día de la
  semana y vale para TODAS las semanas (cerrar el viernes ahí cierra todos los viernes). En la
  pantalla ya no se edita: el calendario solo trabaja por fecha.
  `/cierres` guarda fechas sueltas (`{ fecha: "AAAA-MM-DD", estaAbierto, horaApertura,
  horaCierre, motivo }`). En el calendario, Admin y Owner eligen una fecha y:
  «Editar este día» la abre con su propio horario o la cierra; «Cerrar este día» abre el mismo
  formulario ya marcado como cerrado; «Eliminar este día» borra el registro y la fecha vuelve
  al horario semanal. Los demás días no cambian.
  `establecimiento/api.js` los convierte en `diasEspeciales`: `tipo: 'cerrado'` (rojo) o
  `tipo: 'horario'` (azul, con `abre` y `cierra`). En `horario.js`, `conHorarioEspecial` pone
  esas horas encima del horario semanal, así que el calendario y «Abierto ahora» las respetan.

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
