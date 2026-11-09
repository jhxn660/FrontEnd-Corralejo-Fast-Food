import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

import {
  agregarLinea,
  aPayloadPedido,
  calcularTotales,
  cambiarCantidadLinea,
  conciliarTotal,
  quitarLinea,
} from '../modules/pedidos/calculos'

// POR QUÉ ESTE ESTADO ES GLOBAL Y EL RESTO NO
//
// El 95% del estado de esta aplicación es local o remoto, y ahí se queda: los
// datos del servidor los gobierna useRecurso/useMenu (una sola pantalla los
// lee), y los formularios viven en su componente. Meter eso en un store solo
// añadiría una copia que puede desincronizarse.
//
// El pedido en curso es la excepción real: lo escribe el modal del catálogo, lo
// muestra el encabezado, lo edita la tabla y lo consume la conversión a venta.
// Pasarlo por props obligaría a elevarlo a Pedidos.jsx y bajarlo por tres
// niveles; pasarlo por contexto reconstruiría todo el árbol en cada cambio de
// cantidad, que es exactamente lo que RNF-04 no puede permitirse. Con un store
// solo se vuelve a renderizar quien lee la porción que cambió.
//
// LO QUE EL STORE NO GUARDA: ni subtotal, ni total, ni unidades. Son datos
// derivados; si se guardaran habría dos verdades (líneas y totales) que pueden
// divergir. Se calculan con selectores a partir de las líneas.
//
// Persistencia en sessionStorage: en un punto de venta, un F5 accidental a
// mitad de un pedido es caro. Se usa sessionStorage y no localStorage porque el
// pedido pertenece a la sesión del turno, no al navegador para siempre. Es
// estado de UI: la verdad del pedido sigue siendo el servidor.

const inicial = {
  pedidoId: null, // null = pedido nuevo; con valor = se está editando uno existente
  numero: null,
  lineas: [],
  descuento: 0,
  // Versión que traía el pedido al abrirlo (RNF-12). Viaja de vuelta en el PUT
  // para que el back detecte que otro empleado guardó antes.
  version: null,
  // Total que devolvió el servidor en la última respuesta. Si no coincide con
  // el calculado localmente, la UI muestra el del servidor y avisa.
  totalServidor: null,
  divergencia: null,
}

export const useCarrito = create(
  persist(
    (set, get) => ({
      ...inicial,

      agregar: (producto, cantidad = 1) =>
        set((s) => ({ lineas: agregarLinea(s.lineas, producto, cantidad) })),

      cambiarCantidad: (productoId, cantidad) =>
        set((s) => ({ lineas: cambiarCantidadLinea(s.lineas, productoId, cantidad) })),

      quitar: (productoId) => set((s) => ({ lineas: quitarLinea(s.lineas, productoId) })),

      aplicarDescuento: (descuento) => set({ descuento }),

      /** Carga un pedido existente para editarlo, con su versión. */
      abrirPedido: (pedido) =>
        set({
          ...inicial,
          pedidoId: pedido.id,
          numero: pedido.numero ?? null,
          lineas: pedido.items ?? [],
          version: pedido.version ?? null,
        }),

      vaciar: () => set({ ...inicial }),

      /**
       * Se llama con la respuesta del servidor tras crear o guardar. El total
       * del servidor manda; si difiere del local se deja la divergencia en el
       * store para que la pantalla pueda avisar en vez de cobrar otra cifra.
       */
      sincronizarConServidor: (pedidoServidor) => {
        const { total } = calcularTotales(get().lineas, { descuento: get().descuento })
        const conciliado = conciliarTotal(total, pedidoServidor?.total)
        set({
          pedidoId: pedidoServidor?.id ?? get().pedidoId,
          numero: pedidoServidor?.numero ?? get().numero,
          version: pedidoServidor?.version ?? null,
          totalServidor: conciliado.total,
          divergencia: conciliado.divergente ? conciliado : null,
        })
      },

      /** Payload listo para POST/PUT: solo productoId y cantidad. */
      payload: () => aPayloadPedido(get().lineas),
    }),
    {
      name: 'cff-carrito',
      storage: createJSONStorage(() => sessionStorage),
      // Las acciones no se serializan; los derivados no existen. Solo lo mínimo
      // para reconstruir el pedido tras un refresco.
      partialize: ({ pedidoId, numero, lineas, descuento, version }) => ({
        pedidoId,
        numero,
        lineas,
        descuento,
        version,
      }),
    }
  )
)

// SELECTORES. Se exportan como funciones para que cada componente se suscriba
// solo a lo que usa: el encabezado que muestra el total no se vuelve a
// renderizar cuando cambia el nombre del cliente.
export const selectorTotales = (s) => calcularTotales(s.lineas, { descuento: s.descuento })
export const selectorCantidadDe = (productoId) => (s) =>
  s.lineas.find((l) => l.productoId === productoId)?.cantidad ?? 0
export const selectorHayPedido = (s) => s.lineas.length > 0
export const selectorEsEdicion = (s) => s.pedidoId !== null

// `selectorTotales` construye un objeto nuevo en cada llamada. Zustand 5 quitó
// la comparación automática, así que suscribirse a él directamente provoca un
// render por cada cambio del store (y el aviso de React sobre getSnapshot).
// useShallow compara campo a campo: el componente solo se actualiza si alguna
// cifra cambió de verdad. Las pantallas usan estos hooks, no los selectores.
export const useTotalesCarrito = () => useCarrito(useShallow(selectorTotales))

export const useLineasCarrito = () => useCarrito(useShallow((s) => s.lineas))

/** Acciones: identidad estable, así que no hace falta comparación. */
export const useAccionesCarrito = () =>
  useCarrito(
    useShallow((s) => ({
      agregar: s.agregar,
      quitar: s.quitar,
      cambiarCantidad: s.cambiarCantidad,
      aplicarDescuento: s.aplicarDescuento,
      abrirPedido: s.abrirPedido,
      vaciar: s.vaciar,
      sincronizarConServidor: s.sincronizarConServidor,
      payload: s.payload,
    }))
  )
