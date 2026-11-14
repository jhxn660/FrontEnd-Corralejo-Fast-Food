# Partes complejas del proyecto

Este documento explica las partes de Corralejo Fast Food que **no se entienden
leyendo un solo archivo**: flujos que cruzan varios módulos, decisiones que
parecen raras hasta que se conoce el problema que resuelven, y trampas en las
que ya se cayó una vez.

Si vas a tocar algo de esta lista, lee su sección antes. Las reglas numeradas
(R1, R46…) están en [ARQUITECTURA.md](../ARQUITECTURA.md).

Índice:

1. [Cómo viaja una petición a la API](#1-cómo-viaja-una-petición-a-la-api)
2. [`api.list()` frente a `api.obtener()`](#2-apilist-frente-a-apiobtener)
3. [Sesión, roles y quién ve qué](#3-sesión-roles-y-quién-ve-qué)
4. [Los tres hooks de datos](#4-los-tres-hooks-de-datos)
5. [El modal: por qué es tan largo](#5-el-modal-por-qué-es-tan-largo)
6. [Avisos de 3 segundos](#6-avisos-de-3-segundos)
7. [La carta es la única fuente de lo que se vende](#7-la-carta-es-la-única-fuente-de-lo-que-se-vende)
8. [De pedido a venta](#8-de-pedido-a-venta)
9. [Indicadores calculados desde las ventas](#9-indicadores-calculados-desde-las-ventas)
10. [Dinero y fechas](#10-dinero-y-fechas)
11. [Imprimir el ticket](#11-imprimir-el-ticket)
12. [Trampas de CSS ya resueltas](#12-trampas-de-css-ya-resueltas)
13. [Código preparado para la fase 2](#13-código-preparado-para-la-fase-2)
14. [Deuda conocida](#14-deuda-conocida)

---

## 1. Cómo viaja una petición a la API

```
Pantalla (Inventario.jsx)
  └─ useRecurso / usePeticion            ← estado: datos, cargando, error
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
