# Corralejo Fast Food — Frontend

Aplicación web (SPA) del restaurante Corralejo Fast Food: pedidos, ventas con tiquete y QR,
carta con combos, recetas, inventario, usuarios, indicadores, comentarios, PQRS y la portada
pública del local. Cada rol ve su propio panel.

**Todos los datos y la sesión los da el backend** (`Backend-Corralejo-Fast-Food`: Express +
MongoDB). Este proyecto no guarda datos propios: si algo no está en el backend, no existe.

| Tecnología | Para qué se usa |
|---|---|
| **React 19** | Interfaz por componentes y hooks. |
| **Vite 6** | Servidor de desarrollo y empaquetado. |
| **react-router-dom 7** | Una URL por pantalla y control de acceso por rol. |
| **axios** | Cliente HTTP hacia la API del backend (`src/api/client.js`). |
| **Bootstrap 5** (solo CSS) + **Font Awesome 6** | Estilos e iconos, instalados por npm. |
| **ESLint 9** *(desarrollo)* | Revisión del código (`npm run lint`). |

### ¿Por dónde empiezo a leer?

1. Este README: instalar, ejecutar y el mapa general.
2. **[docs/GUIA-CODIGO-LEGIBLE.md](docs/GUIA-CODIGO-LEGIBLE.md)**: el orden recomendado para
   leer el código por primera vez y cómo escribir código nuevo en el mismo estilo.
3. **[ARQUITECTURA.md](ARQUITECTURA.md)**: las capas, el flujo de datos y las reglas del
   proyecto.
4. **[docs/PARTES-COMPLEJAS.md](docs/PARTES-COMPLEJAS.md)**: los flujos que cruzan varios
   archivos (sesión, pedido → venta, recetas, combos, calificaciones…).

---

## 1. Instalación

Requisitos: **Node.js 20 o superior** y el backend instalado y en marcha.

```bash
npm install
cp .env.example .env     # en Windows (PowerShell): Copy-Item .env.example .env
```

### Variables de entorno (`.env`)

| Variable | Para qué sirve | Por defecto |
|---|---|---|
| `VITE_API_URL` | Dirección del backend, **sin** `/api` (el `/api` lo añade `src/api/client.js`). | `http://localhost:3000` |
| `VITE_APP_URL` | Dirección pública de la app: es lo que codifica el QR del tiquete. En producción debe ser el dominio real. | el origen actual |
| `VITE_WHATSAPP_NUMERO` | WhatsApp del local (con indicativo, sin `+`). Solo se usa si la ficha del local no tiene teléfono. | vacío |

Ninguna es obligatoria en desarrollo. `VITE_API_URL` la lee `src/api/client.js`; las demás,
`src/services/config.js`.

---

## 2. Ejecución

En desarrollo hacen falta **dos terminales**:

```bash
# Terminal 1, en Backend-Corralejo-Fast-Food → API en http://localhost:3000
npm run dev

# Terminal 2, en esta carpeta → aplicación en http://localhost:5173
npm run dev
```

Si la aplicación dice "No se pudo conectar con el servidor", el backend no está en marcha o
`VITE_API_URL` no apunta a él.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente. |
| `npm run build` | Genera la versión de producción en `dist/`. |
| `npm run preview` | Sirve `dist/` en local para revisar el build. |
| `npm run lint` | Revisa el código con ESLint. Debe terminar sin errores. |

Para producción se publica `dist/` en un servidor de archivos estáticos, con `VITE_API_URL`
apuntando al backend publicado y `VITE_APP_URL` al dominio real.

---

## 3. Estructura de carpetas

El código se ordena **por módulo**, y cada módulo del frontend se llama igual que su módulo
en el backend (`orders`, `sales`, `products`…). Un rol **no** es una carpeta: lo que ve cada
rol es una tabla en `src/config/navegacion.jsx`.

```
src/
├── main.jsx                 Punto de entrada: monta React, el router y los dos contextos
├── App.jsx                  Árbol de rutas (lo genera a partir de config/navegacion.jsx)
│
├── api/                     UN archivo por módulo del backend: solo las rutas HTTP
│   ├── client.js            Instancia de axios: token, renovación, errores, aviso de cambios
│   ├── auth.api.js          /auth      (login, registro, renovar token)
│   ├── orders.api.js        /orders    · sales.api.js /sales · products.api.js /products
│   ├── recipes.api.js       /recipes   · supplies.api.js /supplies · categories.api.js
│   ├── comments.api.js      /comments  · pqrs.api.js /pqrs · users.api.js /users
│   └── establecimiento.api.js · indicators.api.js
│
├── config/
│   ├── navegacion.jsx       QUÉ VE CADA ROL: ruta, nombre en el menú, icono y pantalla
│   └── roles.config.js      Copia de los roles del backend + permisos de los botones
│
├── context/
│   ├── AuthContext.jsx      Sesión: { usuario, rol, cargando, iniciarSesion, cerrarSesion, puede }
│   └── AvisosContext.jsx    Avisos de 3 segundos: useAvisos().exito / error / fallo
│
├── modules/                 Un módulo por módulo del backend
│   ├── auth/                Login, Registro y validación de contraseña
│   ├── establecimiento/     Portadas (cliente y visitante), ficha del local, horarios, información
│   ├── products/            Carta (los tres modos), categorías, combos y estrellas
│   ├── recipes/             Recetas: qué insumos gasta cada producto
│   ├── supplies/            Inventario de insumos
│   ├── orders/              Pedidos, catálogo y disponibilidad de inventario
│   ├── sales/               Ventas, tiquete con QR y edición de una venta
│   ├── comments/            Muro de comentarios, "me gusta", calificar por QR y moderación
│   ├── pqrs/                PQRS del cliente, consulta del empleado y moderación (sin "me gusta")
│   ├── indicators/          Indicadores y meta anual
│   └── users/               Gestión de Usuarios (administradores y empleados)
│
├── components/              Piezas sin módulo, reutilizables
│   ├── layout/              Layout (cabecera + menú), RutaProtegida, LimiteDeError, 404
│   └── ui/                  Modal, ConfirmarEliminacion, Estado, Estrellas, Paginacion…
│
├── hooks/                   useRecurso (leer), usePeticion (escribir),
│                            useConfirmacion (borrar), useSincronizar (refrescar)
├── services/                config.js (variables de entorno) y sincronizacion.js
├── data/                    Textos fijos de interfaz y paletas de las gráficas
├── utils/                   Formato de moneda y fechas, ids, imágenes, validación de URL
├── styles/theme.css         ÚNICO archivo CSS propio
└── assets/                  Logo y fondo del login
```

Dentro de cada módulo, el **nombre del archivo dice qué hace**:

| Archivo | Qué contiene |
|---|---|
| `Pantalla.jsx` (`Pedidos.jsx`, `Ventas.jsx`…) | Una pantalla del menú. |
| `FormularioX.jsx`, `DetalleX.jsx`, `TarjetaX.jsx` | Piezas de una pantalla (formularios en modal, detalles, tarjetas). |
| `api.js` | Traduce los datos del backend a la forma de la pantalla y al revés (adaptador). |
| `servicio.js` | Reglas del negocio que encadenan varias llamadas (facturar, reabrir…). |
| `esquema.js` | Constantes, valores por defecto y validaciones del módulo. |
| `calculos.js` | Cálculos puros: reciben datos y devuelven resultados, sin React ni red. |
| `useX.js` | Hook propio del módulo (`useMenu`, `useFicha`). |

---

## 4. Mapa de rutas

Cada ruta se declara **una sola vez**, en `src/config/navegacion.jsx`.

| Ruta | Pantalla (`src/modules/…`) | Roles | Rutas del backend (`/api/…`) |
|---|---|---|---|
| `/login` · `/registro` | `auth/Login` · `auth/Register` | sin sesión | `auth/login`, `auth/register` |
| `/visitante/inicio` · `/cliente/inicio` | `establecimiento/InicioVisitante` · `InicioCliente` | visitante · cliente | `ubicaciones`, `horarios`, `cierres`, `comments/public`, `products/public`, `sales` (más vendido del día) |
| `/visitante/menu` · `/cliente/menu` · `/empleado/menu` | `products/Menu` (consulta) | visitante · cliente · empleado | `products/public` |
| `/calificar/:qr` | `comments/CalificarQr` | público (QR del tiquete) | `POST comments` con el código del QR |
| `/cliente/pqrs` | `pqrs/PqrsCliente` | cliente | `POST pqrs`, `GET pqrs/mine` |
| `/empleado/pedidos` | `orders/Pedidos` | empleado, admin, owner | `orders` (incluye `PUT /:id/items`), `sales`, `recipes`, `supplies`, `products/public` |
| `/empleado/ventas` | `sales/Ventas` | empleado, admin, owner | `sales` |
| `/empleado/recetas` | `recipes/Recetas` (solo consulta) | empleado | `recipes`, `categories`, `products`, `supplies` |
| `/empleado/pqrs` | `pqrs/PqrsEmpleado` (solo consulta) | empleado | `pqrs` |
| `/admin/usuarios` | `users/GestionUsuarios` | owner, admin | `users` |
| `/admin/establecimiento` | `establecimiento/Establecimiento` (editable) | admin, owner | `ubicaciones`, `horarios`, `cierres`, `establecimiento`, `comments` |
| `/admin/inventario` | `supplies/Inventario` | admin, owner | `supplies`, `categories` (tipo Insumo) |
| `/admin/menu` | `products/Menu` (editable, con combos) | admin, owner | `categories`, `products` |
| `/admin/recetas` | `recipes/Recetas` (editable) | admin, owner | `recipes`, `categories`, `products`, `supplies` |
| `/admin/indicadores` | `indicators/Indicadores` | admin, owner | `sales`, `comments`, `indicators/goal` |
| `/admin/comentarios` | `comments/ModeracionComentarios` | admin, owner | `comments` (`/:id/status`, eliminar) |
| `/admin/pqrs` | `pqrs/PqrsModeracion` | admin, owner | `pqrs` (responder `{ estado, respuesta }`, eliminar) |

Toda petición sigue el mismo camino:
**pantalla → `api.js` o `servicio.js` del módulo → `src/api/<modulo>.api.js` →
`src/api/client.js` (axios) → backend**. El recorrido paso a paso está en
[ARQUITECTURA.md](ARQUITECTURA.md#3-flujo-de-datos-de-punta-a-punta).

---

## 5. Roles y permisos

`src/config/roles.config.js` es una **copia de `src/config/roles.config.js` del backend**:
mismos nombres y mismos valores. Si no coinciden, manda el backend.

| Constante | Valor | Quiénes |
|---|---|---|
| `ROLES.OWNER` | `'Owner'` | Dueño |
| `ROLES.ADMIN` | `'Administrador'` | Administración |
| `ROLES.EMPLOYEE` | `'Empleado'` | Personal operativo |
| `ROLES.CLIENT` | `'Cliente'` | Cuenta creada en el registro público |
| `ROLES.VISITOR` | `'Usuario'` | Visitante **sin sesión** (nunca se guarda en la base de datos) |
| `ADMIN_ROLES` | Owner, Administrador | Crear, editar y borrar |
| `STAFF_ROLES` | Owner, Administrador, Empleado | Consultar y operar |

**Herencia** (la misma del backend): el Owner tiene todo lo del Administrador, y el
Administrador todo lo del Empleado. El visitante tiene lo del cliente menos lo que exige
cuenta (PQRS).

| Rol | Menú (en este orden; el primero es donde aterriza) |
|---|---|
| Owner | Gestión de Usuarios + todo lo del Administrador |
| Administrador | Establecimiento, Inventario, Menú, Recetas, Usuarios, Indicadores, Moderación de Comentarios, **Pedidos y Ventas** (heredados) y Moderación de PQRS |
| Empleado | Pedidos, Menú (vitrina), Recetas (consulta), Ventas, PQRS (consulta) |
| Cliente | Inicio, Menú, PQRS |
| Visitante | Inicio, Menú |

Cuando el Administrador hereda un módulo que ya tiene (Menú, Recetas, PQRS), se queda con su
versión: su Menú y sus Recetas son los editables, y su PQRS es la Moderación.

Toda cuenta del registro público nace como `Cliente`. Las de Administrador y Empleado se crean
en **Gestión de Usuarios**. El primer Owner se crea directamente en el backend.

**Permisos de botones** (`PERMISO` en `roles.config.js`, se consultan con
`useAuth().puede(PERMISO.X)`). Cada uno copia la regla de la ruta del backend que lo
respalda, así un botón solo aparece a quien el backend le va a aceptar la petición:

| Permiso | Ruta del backend | Owner | Admin | Empleado | Cliente |
|---|---|:-:|:-:|:-:|:-:|
| `ELIMINAR_ADMINS` | `DELETE /users/:id` de un Administrador (solo Owner) | ✔ | | | |
| `ELIMINAR_EMPLEADOS` | `DELETE /users/:id` → `ADMIN_ROLES` | ✔ | ✔ | | |
| `GESTIONAR_PERSONAL` | `POST`/`PATCH /users` → `ADMIN_ROLES` | ✔ | ✔ | | |
| `EDITAR_INFORMACION` | `/establecimiento` → `ADMIN_ROLES` | ✔ | ✔ | | |
| `GESTIONAR_VENTAS` | `PATCH`/`DELETE /sales`, `DELETE /orders` → `ADMIN_ROLES` | ✔ | ✔ | | |
| `VER_DETALLE_OPINIONES` | `GET /comments` → `STAFF_ROLES` | ✔ | ✔ | ✔ | |
| `DAR_ME_GUSTA` | `POST`/`DELETE /comments/:id/like` → `ADMIN_ROLES` y Cliente | ✔ | ✔ | | ✔ |
| `PQRS_PROPIAS` | `POST /pqrs` → solo Cliente | | | | ✔ |

> **Importante:** esconder un botón o una ruta es control **de interfaz**. Lo que protege los
> datos es el backend, que revisa el token y el rol en cada petición.

---

## 6. Limitaciones conocidas

- **La imagen del QR del tiquete la dibuja un servicio externo** (`api.qrserver.com`, en
  `modules/sales/servicio.js`): ese servicio ve cada código y el QR no se ve sin internet.
- **Las imágenes de productos viajan como `data:` URL** dentro del producto. Se reducen antes
  de guardar (`utils/imagen.js`), pero no es un almacenamiento de archivos.
- **Una venta registrada solo cambia cliente y dirección.** Los productos se corrigen
  reabriendo el pedido (eso elimina la venta y el backend devuelve los insumos).
- **La gráfica de Pedidos agrupa por nombre de producto:** si se renombra un producto, sus
  ventas antiguas caen en "Otros".
