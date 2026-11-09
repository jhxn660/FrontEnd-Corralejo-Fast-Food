# Arquitectura de Corralejo Fast Food

Contrato de arquitectura del proyecto. Está redactado en forma normativa: cada
regla dice cómo se hacen las cosas **en este repositorio**, no cómo podrían
hacerse. Si una propuesta choca con una regla, se cambia la regla primero y el
código después.

Derivado del análisis comparativo con *proyectoHotel — Brisa Hotel*
(8 de noviembre de 2026). El plan de migración que lo implementó se agotó al
completarse; lo que queda permanente es este documento.

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
- **R7** El contexto expone exactamente cuatro cosas:
  `{ usuario, rol, cargando, cerrarSesion }`. Tres datos y una acción. Añadir
  una quinta exige justificarlo.
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
- **R17** Se asume explícitamente que este control es de **interfaz**, no de
  **seguridad**. La seguridad real son las políticas RLS de Supabase. Toda
  pantalla nueva que exponga datos ajenos debe anotarse como deuda hasta que
  exista su política.

## 5. Datos

- **R18** Ningún componente llama a `fetch()` directamente. Todo acceso a la
  API pasa por `src/services/api.js`.
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
  `src/services/` guarda solo infraestructura (`api.js`, `supabase.js`); la
  lógica de negocio va en el servicio de su módulo.
- **R44** Cuando dos roles necesitan la misma pantalla con permisos distintos,
  se escribe **un** componente con una prop booleana `editable` y se declara
  dos veces en la tabla de navegación. No se duplica la pantalla por rol: eso
  fue justo lo que produjo las dos cartas (`adminMenu` y `categoriasMenu`) que
  hubo que unificar.
- **R45** Ninguna pantalla importa de otra pantalla. Lo que dos módulos
  comparten baja al servicio del módulo dueño, a `src/components/` o a
  `src/data/`.

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

## Deuda anotada, no resuelta

- El control de roles es de **interfaz**. La seguridad real son las políticas
  RLS de Supabase, que aún no existen (R17).
- `src/modules/pqrs/PqrsCliente.jsx` descarga toda la colección `pqrs` y filtra por
  usuario en el navegador: los datos ajenos llegan al equipo del cliente. No se
  corrige en el cliente; se corrige del lado del servidor cuando las
  colecciones migren a Supabase (R17).
- La colección `categoriasMenu` de `server/db.json` quedó sin uso al unificar
  la carta sobre `adminMenu`. Mientras siga ahí, el repositorio incumple R25 en
  los datos (no en el código): deberían borrarse esas entradas.

## 11. Capa de red (API-Ready)

- **R46** Toda petición pasa por `services/http.js`. Ninguna pantalla ni hook
  llama a `fetch()`, y nadie fuera de `services/config.js` lee
  `import.meta.env`.
- **R47** El token JWT (RNF-05) lo inyecta `AuthContext` en la capa de red con
  `registrarProveedorToken()`. `http.js` no importa Supabase: si lo hiciera
  habría dos dueños de la sesión y un ciclo de imports. Una petición marcada
  `publica: true` sale sin cabecera, para los endpoints de visitante.
- **R48** Cada módulo declara sus rutas y su adaptador en
  `modules/<dominio>/api.js`. Las pantallas consumen **siempre** la forma del
  contrato acordado con el back, nunca la forma cruda de la API: la diferencia
  (`precio` texto vs número, inglés vs español, campos derivados) se absorbe en
  el adaptador.
- **R49** Lo que el back debe calcular no se simula en el cliente. Si un campo
  del contrato aún no llega (`minutosRestantes`, `qrImagenUrl`, `version`), el
  adaptador lo deja en `null` y la UI muestra el hueco: un dato inventado en el
  navegador es peor que uno ausente.
- **R50** Los errores llegan a la UI como `ErrorApi` con `codigo` y `estado`.
  409 es conflicto de concurrencia (RNF-12) y se resuelve recargando, no
  reintentando; 401 cierra la sesión; nunca se expone el objeto `Response`.

## 12. Gestión de estado

- **R51** El estado se elige por alcance, no por costumbre:
  | Alcance | Dónde vive |
  |---|---|
  | Un formulario, un modal, un filtro | `useState` del componente |
  | Datos del servidor que lee una pantalla | `useRecurso` / el hook del módulo |
  | Sesión | `AuthContext` |
  | Lo que escribe un componente y lee otro | store de Zustand en `src/store/` |

  Un store para datos que ya gobierna un hook de red crea una segunda copia que
  puede desincronizarse. No se hace.
- **R52** Un store **nunca guarda datos derivados**. Subtotales, totales y
  contadores se calculan con selectores sobre las líneas; si se guardaran
  habría dos verdades que pueden divergir.
- **R53** La lógica matemática vive en un módulo puro (`calculos.js`): sin
  React, sin store, sin fetch. Si hay que montar una pantalla para probar una
  suma, la suma está en el sitio equivocado.
- **R54** El dinero se opera en enteros. Nunca flotantes: un redondeo distinto
  entre front y back es una cifra distinta en el ticket.
- **R55** El cálculo en el navegador es **preview** (RNF-04), nunca la cifra
  que se cobra. El payload envía `{productoId, cantidad}` y jamás precios ni
  totales; el total autoritativo lo devuelve el servidor y la UI lo repinta. Si
  difiere del local, se avisa: silenciarlo es cobrar algo distinto a lo que el
  cliente vio.
- **R56** El bloqueo de concurrencia real es del servidor (`version` + 409). El
  store `src/store/bloqueos.js` solo transporta la versión leída al abrir el
  formulario, impide dos ediciones del mismo registro en la misma pestaña y
  recuerda el conflicto. Un 409 **no se reintenta**: reintentar sobrescribiría
  el cambio del otro usuario.

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
  red. Son de experiencia, no de seguridad: el back revalida.
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
