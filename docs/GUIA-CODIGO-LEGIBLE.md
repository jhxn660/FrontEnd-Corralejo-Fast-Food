# Guía para leer y escribir código en este proyecto

Esta guía es para quien llega nuevo a Corralejo Fast Food (por ejemplo, un aprendiz de
Análisis y Desarrollo de Software del SENA). Tiene dos partes:

- **Parte A: cómo leer el proyecto por primera vez**, en qué orden y qué mirar en cada archivo.
- **Parte B: cómo escribir código nuevo** con el mismo estilo, para que el siguiente lo
  entienda sin tener que preguntarte.

Las reglas completas están en [ARQUITECTURA.md](../ARQUITECTURA.md), y los flujos difíciles en
[PARTES-COMPLEJAS.md](PARTES-COMPLEJAS.md).

> La idea de fondo: **el código se lee muchas más veces de las que se escribe.** Ahorrarte un
> minuto escribiendo y costarle diez al que lee es mal negocio.

---

# Parte A — Leer el proyecto

## A1. Antes de abrir el código

1. Arranca el backend y el frontend (ver [README](../README.md#2-ejecución)).
2. Entra con cada rol (Owner, Administrador, Empleado, Cliente) y también sin sesión. Recorre
   su menú. Es mucho más fácil leer una pantalla que ya viste funcionar.
3. Ten a mano el backend: este frontend **copia** sus nombres. Si en el frontend ves
   `orders`, `sales` o `recipes`, en el backend hay un `orders.routes.js`, `sales.routes.js`…

## A2. Orden de lectura recomendado

Lee en este orden. Cada paso usa lo que aprendiste en el anterior.

| # | Archivo | Qué vas a entender |
|---|---|---|
| 1 | `src/main.jsx` | Cómo arranca la app: router, avisos, sesión y estilos. |
| 2 | `src/App.jsx` | Cómo se generan las rutas (no se escriben una por una). |
| 3 | `src/config/roles.config.js` | Los roles (copiados del backend), la herencia y los permisos de botones. |
| 4 | `src/config/navegacion.jsx` | **Qué ve cada rol.** Es la tabla más importante del proyecto. |
| 5 | `src/components/layout/RutaProtegida.jsx` y `Layout.jsx` | El guardia de cada ruta y el cascarón (cabecera + menú lateral). |
| 6 | `src/api/client.js` | Cómo sale cada petición: token, renovación, errores y `datos()`. |
| 7 | `src/context/AuthContext.jsx` + `src/api/auth.api.js` | Cómo se inicia, renueva y cierra la sesión. |
| 8 | `src/hooks/useRecurso.js`, `usePeticion.js`, `useConfirmacion.js` | Los tres hooks que usan casi todas las pantallas. |
| 9 | **El módulo `supplies` completo** (ver A3) | Un módulo de punta a punta, sin reglas raras. |
| 10 | `src/components/ui/Modal.jsx` y `ConfirmarEliminacion.jsx` | Cómo funcionan todos los modales y borrados. |
| 11 | `src/modules/orders/servicio.js` → `Pedidos.jsx` | Un módulo con reglas de negocio (borradores, facturar, reabrir). |
| 12 | [PARTES-COMPLEJAS.md](PARTES-COMPLEJAS.md) | Los flujos que cruzan varios módulos. |

## A3. Un módulo de punta a punta: `supplies` (Inventario)

Lee estos archivos en orden, de lo más cercano al backend a lo más cercano a la pantalla:

```
src/api/supplies.api.js          1. Las rutas HTTP: list, get, create, update, remove
src/modules/supplies/api.js      2. El adaptador: aInsumoUi (backend → pantalla) y aInsumoApi (pantalla → backend)
src/modules/supplies/esquema.js  3. Constantes y reglas: INSUMO_VACIO, UNIDADES, nivelDe (semáforo del stock)
src/modules/supplies/Inventario.jsx       4. La pantalla: carga, filtros, paginación
src/modules/supplies/TarjetaInsumo.jsx    5. Una tarjeta de la rejilla
src/modules/supplies/FormularioInsumo.jsx 6. Crear y editar (modal con validación)
src/modules/supplies/DetalleInsumo.jsx    7. La ficha de solo lectura
```

**Ejercicio:** sigue lo que pasa al pulsar "Guardar" en el formulario de un insumo.

```
FormularioInsumo.jsx   valida y llama a onGuardar(valores)
  → Inventario.jsx     guardar() → guardado.ejecutar(insumo)          (usePeticion)
  → supplies/api.js    insumosApi.actualizar(id, insumo)
                       aInsumoApi traduce: nombre → name, stockMinimo → minStock…
  → supplies.api.js    suppliesApi.update(id, payload)
  → api/client.js      PATCH http://localhost:3000/api/supplies/:id   (con X-Token)
  ← Inventario.jsx     recargar() vuelve a pedir la lista y avisa "Insumo actualizado"
```

Si entiendes este recorrido, entiendes el 80 % del proyecto: los demás módulos repiten la
misma forma.

## A4. Pistas para no perderte

- **¿De dónde sale este dato?** Busca el nombre del campo en el `api.js` del módulo: ahí está
  su traducción desde el backend.
- **¿Por qué este rol no ve esta pantalla?** Mira `config/navegacion.jsx`.
- **¿Por qué no aparece este botón?** Busca `puede(PERMISO.` en la pantalla y mira el permiso
  en `config/roles.config.js`.
- **¿Qué ruta del backend se llama?** Abre el archivo de `src/api/` del módulo: hay una línea
  por ruta.
- **Un error en pantalla** muestra el `msg` del backend. Busca ese texto en el backend para
  saber qué regla lo lanzó.

---

# Parte B — Escribir código nuevo

## B1. Dónde va cada cosa

Antes de crear un archivo, pregúntate: **¿de qué módulo del backend es?**

| Si lo que escribes es… | Va en… | Ejemplo real |
|---|---|---|
| Una ruta nueva del backend | `src/api/<modulo>.api.js` | `ordersApi.replaceItems` |
| La traducción backend ↔ pantalla | `src/modules/<modulo>/api.js` | `aInsumoUi` en `supplies/api.js` |
| Una pantalla o una pieza de una pantalla | `src/modules/<modulo>/` | `supplies/TarjetaInsumo.jsx` |
| Constantes, valores por defecto y validaciones | `src/modules/<modulo>/esquema.js` | `pqrs/esquema.js` |
| Cálculos puros (sumar, agrupar, comparar) | `src/modules/<modulo>/calculos.js` | `indicators/calculos.js`, `recipes/calculos.js` |
| Reglas que encadenan varias llamadas | `src/modules/<modulo>/servicio.js` | `orders/servicio.js` |
| Una pieza visual que sirve en cualquier pantalla | `src/components/ui/` | `Modal.jsx`, `Paginacion.jsx` |
| Un hook que sirve a varios módulos | `src/hooks/` | `useRecurso.js` |
| Textos fijos de interfaz | `src/data/` | `contenido.js` |
| Datos del negocio | **El backend**, nunca `src/` | — |
| Formato de dinero y fechas | `src/utils/format.js` | `moneda()`, `fechaCorta()` |
| Colores y estilos | `src/styles/theme.css` (único CSS) | — |

Reglas rápidas:

- **Por módulo, nunca por rol.** No existe `src/admin/`. Qué ve cada rol se decide en
  `src/config/navegacion.jsx`.
- **Una pantalla no importa de otra pantalla.** Lo compartido sube a `components/`, `hooks/`,
  `data/` o al `api.js` del módulo dueño.
- **Un componente por archivo.** Si un archivo pasa de ~250 líneas o tiene un modal dentro,
  saca el modal a su archivo (`FormularioX.jsx`, `DetalleX.jsx`).

## B2. Cómo ordenar un componente por dentro

Siempre en este orden, para que cualquiera sepa dónde buscar. Es el orden de
`supplies/Inventario.jsx`:

```jsx
// 1. Imports en tres grupos separados por una línea en blanco:
//    librerías → código compartido del proyecto → archivos de la misma carpeta
import { useCallback, useMemo, useState } from 'react'

import { useAvisos } from '../../context/AvisosContext'
import { usePeticion } from '../../hooks/usePeticion'
import { useRecurso } from '../../hooks/useRecurso'
import { Cargando, MensajeError, Vacio } from '../../components/ui/Estado'
// … (más componentes compartidos)

import { insumosApi } from './api'
import { INSUMO_VACIO, NOMBRES_CATEGORIA, nivelDe } from './esquema'
import FormularioInsumo from './FormularioInsumo'

// 2. Constantes del archivo, en MAYÚSCULAS y con el porqué de su valor
// Doce por página: tres filas completas de cuatro en escritorio, y en móvil
// seis filas de dos. Cualquier otro número deja huecos en la última fila.
const POR_PAGINA = 12

// 3. Funciones auxiliares puras (no usan estado)
const RANGO_NIVEL = { agotado: 0, bajo: 1, justo: 2, suficiente: 3 }
const prioridad = (insumo) => RANGO_NIVEL[nivelDe(insumo).clave] ?? 9

// 4. Comentario de qué hace la pantalla y quién la usa
/**
 * Gestión de Inventario (Owner y Administrador): los insumos con su stock, costo y stock
 * mínimo (módulo supplies del backend).
 */
export default function Inventario() {
  // 4a. Datos del backend
  const cargar = useCallback(() => insumosApi.listar(), [])
  const { datos: insumos, cargando, error, recargar } = useRecurso(cargar, [])
  const avisos = useAvisos()

  // 4b. Estado de la interfaz (filtros, modal abierto…)
  const [soloCriticos, setSoloCriticos] = useState(false)
  const [formulario, setFormulario] = useState(null) // insumo en edición o alta

  // 4c. Valores calculados (useMemo si el cálculo es caro)
  const filtrados = useMemo(
    () => insumos.filter((insumo) => !soloCriticos || prioridad(insumo) <= 1),
    [insumos, soloCriticos]
  ) // (el real también filtra por texto y categoría, y ordena)

  // 4d. Manejadores de eventos
  const guardar = async (insumo) => { /* … guardado.ejecutar(insumo) y aviso … */ }

  // 4e. Retornos tempranos, si la pantalla los necesita. Inventario no los usa:
  //     muestra <MensajeError> y <Cargando> dentro del JSX, sin ocultar la cabecera.

  // 4f. El JSX
  return <>…</>
}
```

## B3. Nombres

- **En español y con la palabra del negocio:** `insumo`, `pedido`, `venta`, `categoria`.
  Nunca `item`, `data`, `obj`, `temp`, `x`.
- **Los nombres del backend se respetan.** Los módulos se llaman como en el backend
  (`orders`, `sales`, `recipes`) y los métodos de `src/api/*.api.js` usan sus verbos
  (`list`, `create`, `update`, `remove`, `replaceItems`). El adaptador del módulo los traduce
  al español de la pantalla.
- **Booleanos que se lean como pregunta:** `cargando`, `editable`, `esCombo`, `soloCriticos`.
- **Funciones con verbo:** `guardar`, `cargarVentas`, `facturarPedido`. Las props que avisan
  de algo empiezan por `on`: `onGuardar`, `onCerrar`.
- **Componentes en PascalCase** (`TarjetaInsumo`); todo lo demás en camelCase.
- **Nunca llames a nada `Error`, `Map` o `Date`:** tapa el objeto global de JavaScript.

## B4. Funciones cortas que hagan una sola cosa

Si para explicar lo que hace una función necesitas decir "y", probablemente son dos.

```js
// ✅ Cada pieza se entiende y se prueba sola (supplies/esquema.js)
const nivelDe = (insumo) => …          // 'agotado' | 'bajo' | 'justo' | 'suficiente'
const porcentajeStock = (insumo) => …  // 0–100, para la barra de la tarjeta
```

- **Saca los cálculos fuera del JSX.** Un `reduce` de cinco líneas dentro del `return` obliga a
  leer HTML y matemáticas a la vez.
- **Evita los ternarios anidados** (`a ? b : c ? d : e`). Usa una función con `if` y `return`,
  o un objeto de búsqueda. Ejemplo real: `colorAlcance()` en `recipes/calculos.js`.
- **Prefiere retornos tempranos** a `if` anidados:

```js
// ❌
if (pedido) { if (pedido.items.length > 0) { facturar() } }

// ✅
if (!pedido) return
if (pedido.items.length === 0) return
facturar()
```

## B5. Comentarios: el porqué, no el qué

El código ya dice **qué** hace. El comentario explica **por qué** se hizo así, sobre todo si
parece raro.

```js
// ❌ Inútil: repite el código
// Suma 1 a la cantidad
cantidad + 1

// ✅ Útil: explica una decisión que no se ve (useRecurso.js)
// Un refresco en segundo plano que falla no tapa lo que ya se ve.
if (mio === turno.current && !silencioso) setError(err.message)
```

Comenta siempre:

- Una regla que viene del backend ("el backend no deja guardar un pedido vacío").
- Un número con significado (`75` minutos, `12` por página): ponlo en una constante con nombre
  y explica de dónde sale.
- Lo que parece un error pero es intencionado.

No escribas historia ("antes esto hacía…", "se cambió porque…"): eso va en el mensaje del
commit. El comentario describe cómo funciona **hoy**.

## B6. Estado: dónde guardar cada cosa

| Qué | Dónde |
|---|---|
| Lo que escribe el usuario, un filtro, un modal abierto | `useState` en el componente |
| Datos del backend | `useRecurso` (leer) y `usePeticion` (escribir) |
| Borrar con confirmación | `useConfirmacion` + `ConfirmarEliminacion` |
| La sesión, el rol y los permisos | `useAuth()` |
| Los avisos verdes y rojos | `useAvisos()` |

- **No copies datos del backend a otro `useState`:** tendrías dos versiones que se
  desincronizan. Después de guardar, llama a `recargar()`.
- **No guardes lo que se puede calcular.** Un total se calcula de las líneas cada vez.
- **La función `cargar` de `useRecurso` va en `useCallback`.** Si no, se crea una nueva en cada
  render y la pantalla pide los datos sin parar.

## B7. Estilos

- Usa **clases de Bootstrap** primero (`d-flex`, `gap-2`, `text-secondary`, `card`, `btn`).
- Si Bootstrap no lo cubre, añade una clase en `src/styles/theme.css` con un comentario de
  para qué sirve. Ningún componente importa su propio CSS.
- Ningún color en hexadecimal fuera de `theme.css`. En JSX: `style={{ color: 'var(--cff-naranja)' }}`.
- `style={{ … }}` solo para valores que cambian con los datos (un ancho en %).

## B8. Formularios y modales

- Todo modal usa `components/ui/Modal.jsx`. Nunca escribas un fondo oscuro a mano.
- Un formulario en modal va en su propio archivo (`FormularioInsumo.jsx`) con su propio estado;
  la pantalla le pasa el registro y recibe `onGuardar` / `onCerrar`.
- **Valida antes de llamar al backend** con sus mismas reglas y muestra el error junto al
  campo, con `aria-invalid` y `aria-describedby` (mira `FormularioInsumo.jsx`).
- Todo borrado pasa por `ConfirmarEliminacion` + `useConfirmacion`.
- Confirma cada acción con `useAvisos()`: verde si salió bien, rojo si se borró algo o falló.

## B9. Receta: añadir una pantalla

1. Crea `src/modules/<modulo>/MiPantalla.jsx` con el orden de B2.
2. Si necesita rutas nuevas del backend, añádelas en `src/api/<modulo>.api.js`, y la
   traducción en `src/modules/<modulo>/api.js`.
3. Añade una entrada en `MENU_PROPIO` de `src/config/navegacion.jsx`, en el rol que debe verla:
   `{ modulo, vista, ruta, etiqueta, icono, elemento: <MiPantalla /> }`.
4. Listo: la ruta, el menú lateral y el guardia salen de esa entrada. Comprueba que el
   backend deja a ese rol hacer lo que la pantalla pide.

## B10. Receta: añadir un campo a un registro

Ejemplo real: el **stock mínimo** de los insumos (`minStock` en el backend).

1. **Backend primero.** El campo tiene que existir en el modelo del backend
   (`supply.model.js`). Si no existe, se pide permiso para añadirlo: el frontend no inventa
   campos que el backend no guarda.
2. **Adaptador** (`supplies/api.js`): léelo en `aInsumoUi`
   (`stockMinimo: Number(insumo.minStock) || 0`) y envíalo en `aInsumoApi`
   (`minStock: Number(ui.stockMinimo) || 0`).
3. **Esquema** (`supplies/esquema.js`): su valor por defecto en `INSUMO_VACIO`.
4. **Formulario** (`FormularioInsumo.jsx`): el input y su validación (las mismas reglas del
   backend: número mayor o igual a 0).
5. **Vista**: muéstralo donde haga falta (`DetalleInsumo.jsx`, `nivelDe` en `esquema.js`).

## B11. Antes de entregar tu cambio

```bash
npm run lint
npm run build
```

- [ ] Lo probaste en el navegador **con cada rol** que ve esa pantalla.
- [ ] No quedan `console.log` ni imports sin usar.
- [ ] Los nombres son en español y del negocio; los del backend se respetan.
- [ ] Lo que no es obvio tiene un comentario con el **porqué**.
- [ ] Si tocaste algo de [PARTES-COMPLEJAS.md](PARTES-COMPLEJAS.md), el documento sigue siendo
      cierto (o lo actualizaste).

## B12. Archivos de ejemplo para copiar el estilo

| Si vas a hacer… | Mira |
|---|---|
| Una pantalla con lista, filtros y paginación | `modules/supplies/Inventario.jsx` |
| Un formulario en modal con validación | `modules/supplies/FormularioInsumo.jsx` |
| Un modal de solo lectura | `modules/supplies/DetalleInsumo.jsx` |
| Un adaptador backend ↔ pantalla | `modules/supplies/api.js` |
| Constantes y reglas de un módulo | `modules/users/esquema.js` |
| Cálculos puros | `modules/indicators/calculos.js` |
| Reglas que encadenan llamadas | `modules/orders/servicio.js` |
