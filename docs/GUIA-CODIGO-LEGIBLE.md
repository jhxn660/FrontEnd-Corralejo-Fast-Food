# Guía para escribir código legible en este proyecto

Esta guía es para quien llega nuevo a Corralejo Fast Food. No sustituye a
[ARQUITECTURA.md](../ARQUITECTURA.md) (las reglas) ni a
[PARTES-COMPLEJAS.md](PARTES-COMPLEJAS.md) (por qué el código es como es):
explica **cómo ordenar lo que escribes** para que el siguiente lo entienda sin
preguntarte.

La idea de fondo: **el código se lee muchas más veces de las que se escribe.**
Ahorrarte un minuto escribiendo y costarle diez al que lee es mal negocio.

---

## 1. Dónde va cada cosa

Antes de crear un archivo, contesta: **¿de qué parte del negocio es?**

| Si lo que escribes es… | Va en… | Ejemplo |
|---|---|---|
| Una pantalla o una pieza de una pantalla | `src/modules/<dominio>/` | `inventario/TarjetaInsumo.jsx` |
| Las rutas y el adaptador de la API de un dominio | `src/modules/<dominio>/api.js` | `menu/api.js` |
| Constantes y reglas de un dominio (categorías, estados, validaciones) | `src/modules/<dominio>/esquema.js` | `pqrs/esquema.js` |
| Cálculos puros (sumar, agrupar, comparar) | `src/modules/<dominio>/calculos.js` | `indicadores/calculos.js` |
| Una pieza visual que sirve en cualquier pantalla | `src/components/ui/` | `Modal.jsx`, `Paginacion.jsx` |
| El cascarón de la app (header, menú, errores) | `src/components/layout/` | `Layout.jsx` |
| Un hook que sirve a varios dominios | `src/hooks/` | `useRecurso.js` |
| Textos largos y listas fijas | `src/data/` | `contenido.js` |
| Formato de dinero, fechas | `src/utils/` | `format.js` |
| Colores y estilos | `src/styles/theme.css` (único CSS) | — |

Reglas rápidas:

- **Por dominio, nunca por rol.** No existe `src/admin/`. Qué ve cada rol se
  decide en `src/config/navegacion.jsx`.
- **Una pantalla no importa de otra pantalla.** Si dos módulos necesitan lo
  mismo, se sube a `components/`, `hooks/`, `data/` o al `api.js` del módulo
  dueño.
- **Un componente por archivo.** Si un archivo pasa de ~250 líneas o tiene un
  modal dentro, saca el modal a su propio archivo (`FormularioX.jsx`,
  `DetalleX.jsx`).

## 2. Cómo ordenar un componente por dentro

Siempre en este orden, para que cualquiera sepa dónde buscar:

```jsx
// 1. Imports: React → servicios y hooks → componentes compartidos → propios del módulo
import { useCallback, useState } from 'react'

import { api } from '../../services/api'
import { useRecurso } from '../../hooks/useRecurso'
import Modal from '../../components/ui/Modal'
import { ESTADOS } from './esquema'

// 2. Constantes del archivo (en MAYÚSCULAS)
const POR_PAGINA = 12

// 3. Funciones auxiliares puras (no usan estado)
const nombreCompleto = (empleado) => `${empleado.nombre} ${empleado.apellido}`

// 4. Comentario de qué hace el componente y, sobre todo, por qué
/** Lista de empleados con sus turnos. */
export default function Empleados() {
  // 4a. Datos del servidor
  const cargar = useCallback(() => api.list('employees'), [])
  const { datos, cargando, error, recargar } = useRecurso(cargar, [])

  // 4b. Estado local (filtros, modal abierto…)
  const [busqueda, setBusqueda] = useState('')

  // 4c. Valores derivados (useMemo si el cálculo es caro)
  const visibles = datos.filter((e) => e.name.includes(busqueda))

  // 4d. Manejadores de eventos
  const guardar = async (valores) => { /* … */ }

  // 4e. Retornos tempranos (cargando, error)
  if (cargando) return <Cargando />

  // 4f. El JSX
  return <>…</>
}
```

## 3. Nombres

- **En español y con la palabra del negocio:** `insumo`, `pedido`, `venta`,
  `categoria`. Nunca `item`, `data`, `obj`, `temp`, `x`.
- **Booleanos que se lean como pregunta:** `cargando`, `editable`,
  `esCombo`, `hayFallos`, `puedeModificar`.
- **Funciones con verbo:** `guardar`, `cargarVentas`, `calcularTotales`,
  `abrirDetalle`. Los manejadores de props empiezan por `on`: `onGuardar`,
  `onCerrar`.
- **Componentes en PascalCase** (`TarjetaInsumo`), todo lo demás en camelCase
  (`tarjetaInsumo` no existe como componente).
- **Nunca llames a nada `Error`, `Map`, `Date`…**: tapa el objeto global de
  JavaScript. Ya pasó con un componente `Error` y rompió `new Error()`.
- **Los datos de la API llegan en inglés en algunas colecciones** (`name`,
  `price`, `qty`). Tradúcelos en el adaptador del módulo y usa español en la
  pantalla.

## 4. Funciones cortas y que hagan una sola cosa

Si para explicar lo que hace una función necesitas decir "y", probablemente
son dos funciones.

```js
// ❌ Difícil de leer: calcula, formatea y decide colores a la vez
const info = (i) => { /* 30 líneas */ }

// ✅ Cada pieza se entiende y se prueba sola
const nivelDe = (insumo) => …          // 'bajo' | 'justo' | 'suficiente'
const porcentajeStock = (insumo) => …  // 0–100
```

- **Saca los cálculos fuera del JSX.** Un `reduce` de cinco líneas dentro del
  `return` obliga a leer HTML y matemáticas a la vez.
- **Prefiere retornos tempranos** a `if` anidados:

```js
// ❌
if (ok) { if (lineas.length > 0) { guardar() } }

// ✅
if (!ok) return
if (lineas.length === 0) return
guardar()
```

## 5. Comentarios: el porqué, no el qué

El código ya dice **qué** hace. El comentario debe decir **por qué** se hizo
así, sobre todo si parece raro.

```js
// ❌ Inútil: repite el código
// Suma 1 a la cantidad
cantidad + 1

// ✅ Útil: explica una decisión que no se ve
// Una lista de pedidos VACÍA casi nunca significa que todas las ventas sean
// huérfanas: suele ser una base reiniciada. Sin esta guarda, abrir la
// pantalla borraba todas las ventas.
const huerfanas = pedidos.length === 0 ? [] : …
```

Comenta siempre:

- Un arreglo de un error que alguien podría "deshacer" sin saberlo.
- Un número mágico (`75` minutos, `30000` ms): pon una constante con nombre y
  explica de dónde sale.
- Lo que parece un error pero es intencionado.

## 6. Estado: dónde guardar cada cosa

| Qué | Dónde |
|---|---|
| Lo que escribe el usuario en un formulario, un filtro, un modal abierto | `useState` en el componente |
| Datos que vienen del servidor | `useRecurso` (leer) y `usePeticion` (escribir) |
| La sesión y el rol | `useAuth()` |
| Los avisos verdes y rojos | `useAvisos()` |

- **No copies datos del servidor a otro `useState`.** Tendrías dos versiones
  que se desincronizan. Después de guardar, llama a `recargar()`.
- **No guardes lo que se puede calcular.** Un total se calcula a partir de las
  líneas cada vez; si lo guardas, algún día no coincidirá.

## 7. Estilos

- Usa **clases de Bootstrap** primero (`d-flex`, `gap-2`, `text-secondary`,
  `card`, `btn`).
- Si Bootstrap no lo cubre, añade una clase en `src/styles/theme.css` con un
  comentario de para qué sirve. Ningún componente importa su propio CSS.
- **Ningún color en hexadecimal fuera de `theme.css`.** En JSX:
  `style={{ color: 'var(--cff-naranja)' }}`.
- `style={{ … }}` inline solo para valores que cambian con los datos (un
  ancho en %, el color de una categoría).

## 8. Formularios y modales

- Todo modal usa `components/ui/Modal.jsx`. Nunca escribas un fondo oscuro a
  mano.
- Un formulario en modal va en su propio archivo (`FormularioInsumo.jsx`) con
  su propio estado; la pantalla solo le pasa el registro y recibe
  `onGuardar`/`onCerrar`.
- **Valida antes de llamar a la API** y muestra el error junto al campo, con
  `aria-invalid` y `aria-describedby` (ver `FormularioInsumo.jsx` como
  ejemplo).
- Todo borrado pasa por `ConfirmarEliminacion` + `useConfirmacion`.
- Confirma cada acción con `useAvisos()`: verde si salió bien, rojo si se
  borró algo o falló.

## 9. Receta: añadir una pantalla nueva

1. Crea `src/modules/<dominio>/MiPantalla.jsx` siguiendo el orden de la
   sección 2.
2. Si habla con la API, crea o amplía `src/modules/<dominio>/api.js` con sus
   rutas y su adaptador.
3. Añade una línea en `src/config/navegacion.jsx`, dentro del rol que debe
   verla: `{ vista, ruta, titulo, icono, elemento }`.
4. Listo: la ruta, el menú lateral y el control de acceso salen de esa línea.

## 10. Receta: añadir un campo a un registro

Ejemplo: añadir `proveedor` a los insumos.

1. **Esquema:** añade el valor por defecto en `INSUMO_VACIO`
   (`inventario/esquema.js`).
2. **Formulario:** añade el input en `FormularioInsumo.jsx`.
3. **Vista:** muéstralo donde haga falta (`DetalleInsumo.jsx`).
4. **Datos viejos:** los registros que ya existen no tienen el campo. Usa
   `insumo.proveedor || 'Sin registrar'` al mostrarlo.

## 11. Antes de entregar tu cambio

```bash
npm run lint
```

```bash
npm run build
```

Y además:

- [ ] Lo probaste en el navegador **con cada rol** que ve esa pantalla.
- [ ] No quedan `console.log` ni imports sin usar.
- [ ] Los nombres son en español y del negocio.
- [ ] Lo que no es obvio tiene un comentario con el **porqué**.
- [ ] Si tocaste algo de la lista de
      [PARTES-COMPLEJAS.md](PARTES-COMPLEJAS.md), el documento sigue siendo
      cierto (o lo actualizaste).

## 12. Archivos de ejemplo para copiar el estilo

| Si vas a hacer… | Mira |
|---|---|
| Una pantalla con lista, filtros y paginación | `modules/inventario/Inventario.jsx` |
| Un formulario en modal con validación | `modules/inventario/FormularioInsumo.jsx` |
| Un modal de solo lectura | `modules/inventario/DetalleInsumo.jsx` |
| Constantes y reglas de un dominio | `modules/empleados/esquema.js` |
| Cálculos puros | `modules/indicadores/calculos.js` |
| Un adaptador de API | `modules/menu/api.js` |
