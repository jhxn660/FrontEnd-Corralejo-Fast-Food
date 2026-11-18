# Arquitectura de Corralejo Fast Food

Contrato de arquitectura del proyecto. Está redactado en forma normativa: cada
regla dice cómo se hacen las cosas **en este repositorio**, no cómo podrían
hacerse. Si una propuesta choca con una regla, se cambia la regla primero y el
código después.

Derivado del análisis comparativo con *proyectoHotel — Brisa Hotel*
(8 de noviembre de 2026). El plan de migración que lo implementó se agotó al
completarse; lo que queda permanente es este documento.

Cómo leerlo: la **sección 0** es el mapa (patrón, carpetas, flujo de datos y
decisiones); las secciones 1 a 14 son las reglas, numeradas `R1`…`R75` para
poder citarlas en el código y en las revisiones.

---

## 0. Visión general

Este proyecto es **independiente**: es una SPA (aplicación de una sola página)
que guarda sus datos en **json-server** (un `db.json` local) y su sesión en
**Supabase**. No llama a ningún otro servidor (R47).

### 0.1 Patrón: módulos por dominio, capas dentro de cada módulo

El código se organiza en dos niveles:

1. **Por dominio del negocio** (`src/modules/pedidos`, `ventas`, `menu`…): todo
   lo de "pedidos" está junto, lo vea el rol que lo vea (R41).
2. **Por capa dentro del módulo**: el *nombre del archivo* dice qué
   responsabilidad tiene. Es la Separación de Responsabilidades (SoC): la
   interfaz no sabe cómo se guardan los datos, y los datos no saben cómo se pintan.

| Capa | Archivo dentro del módulo | Responsabilidad | Qué NO hace |
|---|---|---|---|
| **Pantalla** (page) | `Pedidos.jsx`, `Ventas.jsx`… (las que aparecen en `config/navegacion.jsx`) | Estado de la interfaz (selección, filtros, modales), manejadores de eventos y JSX. | No escribe rutas de la API ni decide reglas del negocio. |
| **Componentes** | `FormularioX.jsx`, `DetalleX.jsx`, `TarjetaX.jsx` | Piezas visuales de una pantalla: reciben props, avisan con callbacks. | No cargan datos por su cuenta (salvo widgets autónomos como `ListaTop`). |
| **Servicio** | `servicio.js` | Reglas de negocio que tocan una o varias colecciones: facturar un pedido, reabrirlo, sanear ventas. | No usa React ni estado. |
| **Adaptador de API** | `api.js` | Rutas de json-server del módulo y traducción colección ↔ forma de la UI (R48). | No contiene reglas del negocio. |
| **Hook del módulo** | `useMenu.js`, `useFicha.js` | Une React con el servicio/API: estado de carga, error, recarga y sincronización. | No pinta nada. |
| **Funciones puras** | `calculos.js`, `esquema.js`, `validaciones.js`, `horario.js` | Cálculos, constantes del dominio y validaciones: datos de entrada → datos de salida (R53, R61). | No tocan la red ni React. |

### 0.2 Responsabilidad de cada carpeta de `src/`

| Carpeta | Responsabilidad exacta |
|---|---|
| `main.jsx` | Punto de entrada: monta React, el router y los dos contextos. |
| `App.jsx` | Árbol de rutas. Solo **recorre** la tabla de navegación; no decide quién ve qué. |
| `config/` | `navegacion.jsx`: qué pantalla ve cada rol (única fuente del control de acceso). `roles.js`: roles, herencia y permisos. |
| `context/` | Estado **global**: `AuthContext` (sesión y rol) y `AvisosContext` (avisos de 3 s). Nada más es global. |
| `modules/` | Un módulo por dominio, con sus capas (tabla de arriba). |
| `components/` | Lo que no tiene dominio: `layout/` (cascarón, guardia de ruta, pantallas de error) y `ui/` (Modal, Paginacion, Estrellas…). |
| `hooks/` | Hooks reutilizables por cualquier módulo: `useRecurso` (leer), `usePeticion` (escribir), `useConfirmacion` (borrar), `useSincronizar` (refrescar). |
| `services/` | **Infraestructura**, sin reglas de negocio: `config` (variables de entorno), `http` (fetch), `api` (CRUD genérico), `errores`, `sincronizacion`, `supabase`. |
| `data/` | Contenido estático de interfaz: textos fijos y paletas. Nunca datos del negocio (R49). |
| `utils/` | Funciones puras sin dominio: formato de moneda y fechas, ids, imágenes, validación de URL. |
| `styles/` | `theme.css`, el único CSS propio. |

Fuera de `src/`: `server/db.json` es la base de datos de json-server (y el único
sitio con datos de prueba) y `docs/` tiene las guías para quien llega nuevo.

### 0.3 Flujo de datos de punta a punta

**Leer** (ejemplo: abrir Gestión de Pedidos):

```
URL /empleado/pedidos
  → App.jsx            encuentra la ruta en config/navegacion.jsx
  → RutaProtegida      ¿hay sesión? ¿el rol tiene esa vista?  (AuthContext)
  → Layout             cabecera + menú del rol + <Pedidos />
  → Pedidos.jsx        useRecurso(cargarPedidos)
  → pedidos/servicio   cargarPedidos(): pide pedidos y carta, los ordena
  → services/api       api.list('pedidos')
  → services/http      fetch con timeout, cancelación y errores normalizados
  → json-server        GET http://localhost:3000/pedidos   (lee server/db.json)
  ← la respuesta sube por el mismo camino; useRecurso la deja en `datos`
  ← Pedidos.jsx        React vuelve a pintar con los datos
```

**Escribir** (ejemplo: pulsar "Finalizar y generar venta"):

```
Pedidos.jsx        finalizarPedido()  → valida que haya productos
  → pedidos/servicio  facturarPedido(): crea la venta y resuelve el pedido
  → services/api → services/http → json-server (POST /sales, PUT /pedidos/:id)
  → services/http     anuncia el cambio (services/sincronizacion.js)
  → useSincronizar    las demás pantallas montadas, de cualquier rol o pestaña,
                      vuelven a pedir sus datos en silencio
  ← Pedidos.jsx       aviso verde (AvisosContext) y navegación a Ventas
```

**Sesión**: `Login.jsx` → Supabase Auth → `AuthContext` recibe el usuario por
`onAuthStateChange` → `rol` se deriva de `user_metadata.rol` → `App.jsx`
redirige al panel de ese rol.

### 0.4 Decisiones técnicas de la última refactorización

| Decisión | Por qué |
|---|---|
| La lógica de negocio de Pedidos salió de `Pedidos.jsx` a **`pedidos/servicio.js`** | La pantalla mezclaba JSX con las reglas de crear, facturar, reabrir y eliminar pedidos, y con el cálculo de la gráfica. Ahora la regla se lee y se prueba sin montar la pantalla. |
| `cargarVentas`, `guardarVentaEditada` y `cumpleRango` salieron de `Ventas.jsx` a **`ventas/servicio.js`** | Mismo motivo: sanear ventas huérfanas o sincronizar el pedido al editar una venta son reglas del negocio, no de la interfaz. |
| `numeroDeCodigo` y `generarCodigoQR` dejaron de exportarse | Tras el cambio anterior solo se usan dentro de `ventas/servicio.js`: lo que no se usa fuera no forma parte de la interfaz pública del módulo. |
| Se mantuvo la organización **por módulos** (no se crearon `pages/`, `services/` globales por tipo) | La relación rol → pantalla es de muchos a muchos y las pantallas comparten datos por dominio; separar por tipo de archivo repartiría cada funcionalidad en cinco carpetas (R41, R42). |
| Las pantallas con CRUD simple (Inventario, Empleados, PQRS) siguen usando `services/api.js` directamente | Una sola llamada (`api.remove('insumos', id)`) no es una regla de negocio; crear un `servicio.js` solo para reenviarla añadiría una capa sin contenido. |
| Se eliminó código sin uso: props `clase` (`Estrellas`) y `ayuda` (`CampoTexto`), y los estilos `.nav-pills` y `.modal-tono-exito` | Ningún componente los utilizaba (R38). La escala de espaciado y los tokens de `theme.css` se conservan completos aunque no todos se usen: son un sistema, no código muerto. |

---

## 1. Identidad y roles

- **R1** El rol del usuario se escribe **una sola vez**, en el alta, dentro de
  `user_metadata` de Supabase:

  ```js
  supabase.auth.signUp({
    email,
    password,
    options: { data: { rol: 'cliente' } },
  })
  ```

- **R2** El rol se **lee** siempre como valor derivado del usuario, nunca se
  guarda en un `useState` propio: `usuario?.user_metadata?.rol ?? 'cliente'`.
  El valor de reserva es siempre el de menor privilegio.
- **R3** Toda cuenta nueva nace como `cliente`. Elevar a `empleado` o `admin`
  es una acción administrativa, fuera de la aplicación.
- **R4** Prohibido mantener dos lugares donde viva el rol. Si existe una tabla
  `profiles`, es espejo de lectura, nunca la fuente de la autorización.

## 2. Sesión

- **R5** Existe un único `AuthContext`. Ningún componente llama a
  `supabase.auth.getSession()` por su cuenta.
- **R6** El contexto se suscribe a `onAuthStateChange` y cancela la suscripción
  en el `return` del efecto. Sin esa cancelación no se acepta el código.
- **R7** El contexto expone exactamente cinco cosas:
  `{ usuario, rol, cargando, cerrarSesion, puede }`. Tres datos, una acción y
  la consulta de permisos (`puede(PERMISO.X)`, derivada del rol). Añadir una
  sexta exige justificarlo. El contexto expulsa además a las cuentas de
  personal que el Owner desactivó o dio de baja en json-server.
- **R8** Los componentes consumen el contexto a través del hook `useAuth()`,
  nunca importando `AuthContext` directamente.
- **R9** El estado `cargando` arranca en `true` y solo pasa a `false` cuando
  Supabase ha respondido. Toda pantalla que dependa de la sesión lo respeta.

## 3. Navegación

- **R10** Toda pantalla que un usuario pueda querer compartir, marcar como
  favorita o recargar tiene su propia URL. Si se navega con `useState`, no es
  una pantalla: es un estado interno de una pantalla.
- **R11** Las rutas se declaran en un solo archivo. El árbol de rutas
  (`src/App.jsx`) es legible de un vistazo.
- **R12** Existe una ruta comodín `<Route path="*">` que muestra un 404 propio.
- **R13** Las redirecciones automáticas usan `replace` para no ensuciar el
  historial del navegador.

Convención de rutas: `/{rol}/{seccion}`, más `/login`, `/registro` y `/`.

## 4. Control de acceso

- **R14** El acceso se verifica en tres capas, y las tres son obligatorias:
  1. **Guardia de ruta** (`RutaProtegida`): ¿hay sesión? ¿el rol alcanza?
  2. **Menú** (`Layout`): solo se dibujan las opciones del rol activo.
  3. **Render**: el contenido sensible se condiciona al rol.
- **R15** El guardia comprueba `cargando` **antes** que `usuario`. Invertir ese
  orden expulsa a usuarios legítimos que acaban de recargar la página.
- **R16** La tabla de permisos vive en `src/config/navegacion.jsx` y es la
  única fuente de verdad. Cada entrada reúne `vista`, `ruta`, `titulo`, `icono`
  y `elemento`, así que añadir una pantalla = crear el componente en su módulo
  + añadir una línea ahí. Nada más: ni el árbol de rutas, ni el menú lateral,
  ni el guardia se tocan.
- **R16b** Lo que se ve **sin sesión** vive en la misma tabla, en
  `RUTAS_PUBLICAS`. Hoy solo hay una ruta pública (`/calificar/:qr`, la que
  codifica el QR del tiquete) y trae su propio cascarón, porque `Layout`
  dibuja el menú de un rol que ahí no existe. Una ruta pública declarada
  suelta en `App.jsx` sería justo el agujero que R16 existe para evitar.
- **R17** Se asume explícitamente que este control es de **interfaz**, no de
  **seguridad**. La seguridad real son las políticas RLS de Supabase. Toda
  pantalla nueva que exponga datos ajenos debe anotarse como deuda hasta que
  exista su política.

## 5. Datos

- **R18** Ningún componente llama a `fetch()` directamente. Todo acceso a la
  API pasa por `src/services/http.js`: a través del `api.js` de su módulo o
  del genérico `src/services/api.js`.
- **R19** Ninguna URL de servicio se escribe incrustada en el código. Van en
  variables de entorno con prefijo `VITE_`.
- **R20** La carga de datos usa `src/hooks/useRecurso.js`. Si un componente
  declara a mano el trío `datos/cargando/error`, es que falta extraerlo.
- **R21** Tras una escritura se recarga el recurso completo. Es más lento que
  actualizar el array local, pero nunca queda inconsistente.
- **R22** El manejo de errores depende del origen y no se mezclan:
  - Supabase devuelve `{ data, error }`; se comprueba con `if (error)`.
  - `fetch` no lanza con 4xx/5xx; se comprueba `respuesta.ok` dentro de un
    `try/catch`.

## 6. Contenido

- **R23** Los textos largos, listas fijas y catálogos estáticos viven en
  `src/data/`, nunca incrustados en el JSX.
- **R24** Los datos estáticos se modelan como objetos con claves nombradas, no
  como tuplas posicionales: `{ icono, titulo, texto }`, no `[a, b, c]`.
- **R25** Si un dato existe a la vez en `src/data/` y en la API, uno de los dos
  sobra. No se aceptan dos fuentes de verdad para la misma entidad.

## 7. Estilos

- **R26** Existe **un** solo archivo CSS propio: `src/styles/theme.css`. Define
  las variables de marca y repinta las de Bootstrap. Todo lo demás sale de las
  clases de Bootstrap.
- **R27** Ningún componente importa su propio CSS. En Vite eso no crea ámbito
  local: solo da la ilusión de tenerlo.
- **R28** Ningún color se escribe en hexadecimal fuera de `theme.css`. Se usan
  las variables, incluidas las paletas de las gráficas
  (`src/data/graficas.js` las cita como `var(--cff-…)`).
- **R29** Si se usa un atributo `data-bs-*`, hay que importar el JavaScript de
  Bootstrap. Si no se importa, no se usan esos atributos y el comportamiento se
  escribe en React.
- **R30** Los modales se construyen con `src/components/ui/Modal.jsx`, que
  monta en `document.body` mediante portal. No se escriben overlays a mano.

## 8. Dependencias

- **R31** Ninguna dependencia se declara como `latest`. Se fija la versión.
- **R32** Todo lo que solo sirve para construir o desarrollar va en
  `devDependencies`.
- **R33** Toda dependencia que el código necesite en tiempo de ejecución debe
  estar declarada. Si se usa `json-server`, se declara `json-server`.
- **R34** Cada servicio que la aplicación necesita para funcionar tiene su
  script en `package.json`. Levantar algo «a mano» no es documentable.
- **R35** Los recursos de terceros se instalan por npm, no por CDN, salvo que
  haya una razón escrita para lo contrario.

## 9. Higiene

- **R36** El archivo `.env` nunca se versiona. Existe `.env.example` con las
  claves vacías.
- **R37** No se dejan `console.log` en el código entregado, y jamás se imprime
  una sesión, un token o un correo.
- **R38** No se declaran variables que no se usan, ni se importan símbolos que
  no se usan.
- **R39** Todo el repositorio usa finales de línea LF.
- **R40** Un componente, un archivo. Si un archivo declara dos componentes y
  uno pasa de 30 líneas, se separa.

## 10. Organización de los directorios

- **R41** El código se ordena por **módulo de dominio** (`src/modules/<dominio>/`),
  nunca por rol. Un rol no es una carpeta: es una fila de la tabla de
  navegación. Las carpetas por rol no pueden expresar que dos roles vean la
  misma pantalla, y obligan a inventar una carpeta de excepciones.
- **R42** Un módulo contiene todo lo de su dominio —pantallas, piezas internas,
  esquema y servicio propio— y es el único dueño de su carpeta. Las piezas
  internas de una pantalla son archivos hermanos dentro del módulo, no una
  subcarpeta homónima.
- **R43** `src/components/` guarda lo que no tiene dominio: `layout/` (el
  cascarón y las pantallas de estado) y `ui/` (piezas reutilizables).
  `src/services/` guarda solo infraestructura (`config`, `http`, `errores`,
  `api`, `sincronizacion`, `supabase`); la
  lógica de negocio va en el servicio de su módulo.
- **R44** Cuando dos roles necesitan la misma pantalla con permisos distintos,
  se escribe **un** componente con una prop booleana `editable` y se declara
  dos veces en la tabla de navegación. No se duplica la pantalla por rol: eso
  fue justo lo que produjo las dos cartas (`adminMenu` y `categoriasMenu`) que
  hubo que unificar.
- **R45** Ninguna pantalla importa de otra pantalla. Lo que dos módulos
  comparten baja al servicio del módulo dueño, a `src/components/` o a
  `src/data/`.

## 11. Capa de red

- **R46** Toda petición pasa por `services/http.js`. Ninguna pantalla ni hook
  llama a `fetch()`, y nadie fuera de `services/config.js` lee
  `import.meta.env`.
- **R47** La persistencia es **solo json-server y Supabase**: json-server guarda
  los datos del negocio y Supabase la sesión y las cuentas de acceso. No hay
  clientes, rutas ni adaptadores hacia otro backend. `http.js` no envía
  cabecera de sesión (json-server no autentica) y no importa Supabase: la
  sesión tiene un solo dueño, `AuthContext`.
- **R48** Cada módulo declara sus rutas y su adaptador en
  `modules/<dominio>/api.js`. Las pantallas consumen **siempre** la forma de
  la UI, nunca la forma cruda de la colección: la diferencia (`precio` texto vs
  número, inglés vs español, campos derivados) se absorbe en el adaptador.
- **R48b** Una operación que escribe en **más de una colección** o encadena
  varias llamadas (facturar un pedido, reabrirlo, sanear las ventas) es una
  regla de negocio: vive en `modules/<dominio>/servicio.js`, no en el
  componente. La pantalla la invoca, recarga y avisa. Una llamada CRUD suelta
  (`api.remove('insumos', id)`) puede quedarse en la pantalla.
- **R49** Ningún dato del negocio se simula en el código: lo que no trae
  json-server se muestra como ausente (un plato sin imagen, un día sin
  horario, una meta sin definir). Los datos de prueba van en `server/db.json`,
  nunca en `src/`.
- **R50** Los errores llegan a la UI como `ErrorApi` con `codigo` y `estado`;
  nunca se expone el objeto `Response`. Una petición cancelada (desmontaje o
  recarga que pisa a la anterior) lanza `AbortError`, también si se corta
  mientras se lee el cuerpo.

## 12. Gestión de estado

- **R51** El estado se elige por alcance, no por costumbre:
  | Alcance | Dónde vive |
  |---|---|
  | Un formulario, un modal, un filtro | `useState` del componente |
  | Datos del servidor que lee una pantalla | `useRecurso` / el hook del módulo |
  | Sesión | `AuthContext` |
  | Avisos (toasts) | `AvisosContext` |

  No hay store global: un dato del servidor tiene un solo dueño, el hook que
  lo carga, y una segunda copia podría desincronizarse.
- **R52** **Nunca se guardan datos derivados**. Subtotales, totales y
  contadores se calculan a partir de las líneas; si se guardaran habría dos
  verdades que pueden divergir.
- **R53** La lógica matemática vive en un módulo puro (`calculos.js`): sin
  React, sin estado, sin fetch. Si hay que montar una pantalla para probar una
  suma, la suma está en el sitio equivocado.
- **R54** El dinero se opera en enteros. Nunca flotantes: un redondeo distinto
  entre dos pantallas es una cifra distinta en el ticket.
- **R55** El total de una venta se calcula UNA vez, en `construirVenta()`
  (`ventas/servicio.js`), a partir de las líneas del pedido; las pantallas lo
  leen de la venta guardada en json-server, no lo recalculan por su cuenta.
- **R56** Lo que cambia un rol se refleja en los demás sin recargar: toda
  escritura se anuncia (`services/sincronizacion.js`) y `useRecurso` /
  `useMenu` vuelven a pedir en silencio; entre pestañas por `BroadcastChannel`
  y entre dispositivos con el sondeo de `useSincronizar` (`VITE_SYNC_MS`). Un
  refresco silencioso nunca pisa una carga visible en curso.
- **R56b** Una pantalla que muestra el detalle de un registro guarda su **id**,
  no una copia: el registro se busca en cada render entre los datos
  sincronizados. Solo los formularios trabajan sobre una copia (es su borrador).
- **R56c** Un registro anidado que se edita por separado (los platos de una
  categoría) lleva `id` propio y persistido: con uno posicional, una edición
  concurrente de otro rol caía sobre el registro equivocado.

## 13. Interfaz y validaciones

- **R57** Ningún `window.confirm`, `alert` o `prompt`. Todo borrado pasa por
  `components/ui/ConfirmarEliminacion` (RNF-01), que nombra el registro, lista
  las consecuencias, bloquea el DOM y no se puede cerrar mientras envía. El
  estado lo gobierna `hooks/useConfirmacion`.
- **R58** El foco inicial de una confirmación es **Cancelar**, nunca el botón
  destructivo: un Enter reflejo debe cancelar, no borrar.
- **R59** Los borrados en cascada (arrastran otros registros) exigen además
  marcar una casilla: `requiereCasilla`.
- **R60** Un fallo al eliminar deja el modal abierto con el error. Cerrarlo
  haría creer que el registro se borró.
- **R61** Las validaciones de formulario viven en un módulo propio del módulo
  (`validaciones.js`), no en el JSX, y se ejecutan **antes** de la llamada de
  red. Son de experiencia, no de seguridad: json-server no valida nada.
- **R62** La política de contraseña (RNF-15) se declara como una regla por
  requisito, no como un único regex con lookaheads, para poder decirle al
  usuario exactamente cuál falta. No se aplica en el login: una cuenta antigua
  seguiría siendo válida para entrar, y señalar "contraseña débil" ahí confirma
  a un atacante que acertó el formato.
- **R63** El error de login es genérico ("el correo o la contraseña no son
  correctos"): distinguirlos revela qué correos están registrados.
- **R64** Todo input con error enlaza su mensaje con `aria-describedby` y
  `aria-invalid` (RNF-02). Un borde rojo sin texto no es un mensaje.
- **R65** Nombres semánticos: nada de `item`, `data`, `cat`, `temp` o `config`
  cuando el dominio tiene una palabra para la cosa (`insumo`, `categoria`,
  `solicitud`, `empleado`).

## 14. Avisos y recuperación de errores

- **R66** Toda acción que el usuario confirma —iniciar sesión, registrarse,
  crear, guardar, cambiar de estado, eliminar, generar una venta— emite un
  aviso con `useAvisos()`: verde para lo que salió bien, rojo para un borrado o
  un fallo, tres segundos, esquina superior derecha. No se usan diálogos
  modales para confirmar algo que ya ocurrió: obligan a cerrar una ventana para
  seguir trabajando. Por eso `sweetalert2` salió de las dependencias.
- **R67** El aviso **no sustituye** al error en pantalla. Un recurso que no
  carga sigue mostrando `MensajeError`, que se queda y ofrece reintentar; el
  aviso es para lo que se puede dejar pasar.
- **R68** El contenido de cada pantalla va dentro de `LimiteDeError`. Una
  excepción en el render desmonta todo el árbol de React —menú incluido— y deja
  la aplicación sin salida hasta recargar. El límite se rearma al cambiar de
  ruta.
- **R69** El modal se monta con la clase `modal` de Bootstrap. Ahí viven todas
  las variables `--bs-modal-*`; sin esa clase `.modal-content` se queda sin
  fondo, sin relleno y sin radio, y `modal-lg` no hace nada. Un portal que
  pinte `.modal-dialog` suelto está roto aunque lo parezca menos.
- **R70** Un recurso de la API que no es una colección se pide con
  `api.obtener()`, nunca con `api.list()`. `list()` normaliza toda respuesta a
  forma de lista y ante un objeto devuelve `[]`: así se quedaron sin datos el
  catálogo de Pedidos y los indicadores.

- **R71** La carta del administrador (`adminMenu`) es la única fuente de lo
  que se vende: el catálogo de Pedidos, la edición de ventas y la carta del
  cliente salen de `productosVendibles()` en `modules/menu/api.js`.
- **R71b** La imagen de un plato se gestiona **solo** en la edición del plato y
  se lee **siempre** con `imagenDe()`. Ninguna pantalla decide por su cuenta
  qué foto enseñar: así una imagen nueva aparece a la vez en la carta, en la
  ficha, en la tabla del administrador, en el catálogo de Pedidos y en los
  destacados. Sin imagen propia se pinta el logo del Corralejo; no se enlazan
  fotos de archivo de un servidor ajeno, que fue lo que hubo que retirar.
- **R72** Los indicadores se calculan desde `sales` y `comentarios`
  (`modules/indicadores/calculos.js`); en db.json solo se guarda la meta anual.
  Las colecciones `kpis`, `comparison`, `productRows`, `ranking` y `reviews`
  —cifras escritas a mano que ninguna venta movía— ya no existen. Las ventas
  con `historico: true` son datos de prueba y se pueden borrar.
- **R73** Una valoración **es un comentario con QR**. No hay colección aparte:
  un registro de `comentarios` con `qr`, `ticket`, `estrellas` y `productos` es
  una valoración, y uno sin `qr` es un comentario del muro, que no puntúa. De
  ahí salen las notas por producto (`valoracionesPorProducto`), que es el
  vínculo entre el muro y los indicadores.
- **R74** Lo que habilita a puntuar es el **código del tiquete**, no la sesión:
  quien tiene el QR hizo la compra. Por eso `/calificar` es público, el
  comentario es opcional —la nota sola ya cuenta— y `usuario` queda en `null`
  cuando lo deja un visitante. Lo que sigue prohibido es una estrella pulsable
  sin un QR detrás, que fue lo que obligó a retirar el voto la primera vez.
- **R75** Se modera el **texto**, no la nota. `visible` decide si un comentario
  sale en el muro; la puntuación cuenta en los indicadores desde que se
  registra, y una puntuación sin texto no pasa por el buzón de moderación
  porque no hay nada que leer en ella.

---

## Antipatrones excluidos explícitamente

No se reintroducen, aunque se encuentren en proyectos hermanos:

| # | Antipatrón | Regla que lo prohíbe |
|---|---|---|
| 1 | `fetch()` suelto dentro del componente | R18 |
| 2 | URL de la API incrustada en el código | R19 |
| 3 | CRUD duplicado entre pantallas | R20 |
| 4 | CSS por componente | R26, R27 |
| 5 | Colores repetidos en hexadecimal | R28 |
| 6 | `console.log` de sesión, token o correo | R37 |
| 7 | Versiones `latest` | R31 |
| 8 | Tuplas posicionales para datos estáticos | R24 |
| 9 | Filtrado por rol en el navegador | R17 (deuda anotada) |
| 10 | Diálogo modal para confirmar algo ya hecho | R66 |
| 11 | `api.list()` sobre un recurso que es un objeto | R70 |
| 12 | Exportar un componente llamado `Error` | tapa el constructor global |
| 13 | Estrella pulsable sin un QR que respalde la compra | R74 |
| 14 | Colección de cifras fijas que ninguna venta mueve (`reviews`) | R72 |
| 15 | Foto de archivo ajena en lugar de la imagen del plato | R71b |
| 16 | Datos del negocio simulados en `src/` (respaldos, mocks, `localStorage`) | R49 |
| 17 | Detalle abierto que guarda una copia del registro en vez de su id | R56b |

## Deuda anotada, no resuelta

- El control de roles es de **interfaz**. La seguridad real son las políticas
  RLS de Supabase, que aún no existen (R17).
- `src/modules/pqrs/PqrsCliente.jsx` pide sus PQRS con `?usuario=correo`, pero
  json-server no comprueba quién pregunta: cualquiera puede pedir las de otro
  (R17).
- Las imágenes de los platos se guardan como `data:` URL dentro de `db.json`.
  Es suficiente para la carta de un restaurante, pero no es almacenamiento de
  archivos. La UI solo pone el valor en un `src`, así que una URL http también
  sirve.
- json-server 1.0 beta vigila `db.json` y lo relee al cambiar: si la relectura
  cae entre dos escrituras seguidas, la segunda se pierde (visto al facturar un
  pedido: la venta se crea y el pedido no queda resuelto). Arrancarlo con
  `NODE_ENV=production` desactiva esa vigilancia. Detalle en
  `docs/PARTES-COMPLEJAS.md`, sección 8.
- La imagen del QR la dibuja un servicio externo (`api.qrserver.com`, URL fija
  en `ventas/servicio.js`): incumple R19 y ese servicio ve cada código.
- El QR se valida en el navegador (`ticketsApi.buscarPorQr`): que la venta
  exista, que no esté cancelada y que ese código no se haya calificado ya. Con
  json-server nada impide saltarse los tres pasos y escribir en `comentarios`
  directamente (R17).
