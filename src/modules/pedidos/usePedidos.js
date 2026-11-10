// ⚠️ ARCHIVO SIN USO TODAVÍA (fase 2).
// Ninguna pantalla importa este archivo: solo lo usan otros archivos de la
// misma "fase 2" (usePedidos, useVentas, pedidos/api, ventas/api,
// pedidos/calculos, store/carrito, store/bloqueos). Está preparado para cuando
// exista el back real con /pedidos/:id/estado, versiones y total autoritativo.
// Si vas a cambiar cómo funcionan Pedidos o Ventas HOY, el código está en
// Pedidos.jsx, Ventas.jsx y ventas/servicio.js, no aquí.
// Ver docs/PARTES-COMPLEJAS.md, sección "Código preparado para la fase 2".

import { useCallback, useEffect, useRef, useState } from 'react'

import { usePeticion } from '../../hooks/usePeticion'
import { useBloqueos, RECURSOS_BLOQUEABLES } from '../../store/bloqueos'
import { useAccionesCarrito, useCarrito } from '../../store/carrito'
import { pedidosApi } from './api'

/**
 * Une las tres piezas: red (pedidosApi), estado del pedido en curso (carrito) y
 * bloqueos. La pantalla no habla con ninguna de las tres por separado.
 *
 * Reparto de responsabilidades:
 *   calculos.js  →  cuánto suma (puro, sin React)
 *   carrito      →  qué hay en el pedido en curso
 *   bloqueos     →  qué registro está en edición y con qué versión
 *   este hook    →  cuándo se habla con el servidor y en qué orden
 *   la pantalla  →  solo pinta y recoge eventos
 */
export function usePedidos({ estado } = {}) {
  const [pedidos, setPedidos] = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const abortoActual = useRef(null)

  const lineas = useCarrito((s) => s.lineas)
  const pedidoId = useCarrito((s) => s.pedidoId)
  const { abrirPedido, vaciar, sincronizarConServidor } = useAccionesCarrito()
  const { tomar, liberar, marcarConflicto, versionDe } = useBloqueos()

  const cargar = useCallback(async () => {
    abortoActual.current?.abort('recarga')
    const controlador = new AbortController()
    abortoActual.current = controlador

    setCargando(true)
    setError(null)
    try {
      // En paralelo: el catálogo no depende de los pedidos y esperar en serie
      // duplicaría el tiempo de apertura de la pantalla.
      const [{ pedidos: datos }, productos] = await Promise.all([
        pedidosApi.listar({ estado, senal: controlador.signal }),
        pedidosApi.catalogo({ senal: controlador.signal }),
      ])
      setPedidos(datos)
      setCatalogo(productos)
    } catch (err) {
      if (err?.name !== 'AbortError') setError(err)
    } finally {
      if (abortoActual.current === controlador) setCargando(false)
    }
  }, [estado])

  useEffect(() => {
    cargar()
    return () => abortoActual.current?.abort('desmontaje')
  }, [cargar])

  /** Abrir para editar: toma el bloqueo local y carga las líneas en el carrito. */
  const editar = useCallback(
    (pedido) => {
      const libre = tomar(RECURSOS_BLOQUEABLES.pedidos, pedido.id, { version: pedido.version })
      if (!libre) return false
      abrirPedido(pedido)
      return true
    },
    [tomar, abrirPedido]
  )

  const cerrarEdicion = useCallback(() => {
    if (pedidoId) liberar(RECURSOS_BLOQUEABLES.pedidos, pedidoId)
    vaciar()
  }, [pedidoId, liberar, vaciar])

  // Un 409 nunca se reintenta automáticamente: reintentar sobrescribiría el
  // cambio del otro empleado, que es precisamente lo que el bloqueo evita.
  const manejarEscritura = useCallback(
    async (accion, id) => {
      try {
        const pedido = await accion()
        sincronizarConServidor(pedido)
        await cargar()
        return { pedido, conflicto: false }
      } catch (err) {
        if (err.esConflicto && id) {
          marcarConflicto(RECURSOS_BLOQUEABLES.pedidos, id)
          await cargar()
          return { pedido: null, conflicto: true }
        }
        throw err
      }
    },
    [cargar, marcarConflicto, sincronizarConServidor]
  )

  const guardar = usePeticion(
    useCallback(
      () =>
        manejarEscritura(
          () =>
            pedidoId
              ? pedidosApi.actualizar(pedidoId, lineas, {
                  version: versionDe(RECURSOS_BLOQUEABLES.pedidos, pedidoId),
                })
              : pedidosApi.crear(lineas),
          pedidoId
        ),
      [pedidoId, lineas, versionDe, manejarEscritura]
    )
  )

  const cambiarEstado = usePeticion(
    useCallback(
      (pedido, nuevoEstado) =>
        manejarEscritura(
          () =>
            pedidosApi.cambiarEstado(pedido.id, nuevoEstado, {
              version: pedido.version,
            }),
          pedido.id
        ),
      [manejarEscritura]
    )
  )

  const eliminar = usePeticion(
    useCallback(
      async (id) => {
        await pedidosApi.eliminar(id)
        liberar(RECURSOS_BLOQUEABLES.pedidos, id)
        await cargar()
      },
      [cargar, liberar]
    )
  )

  return {
    pedidos,
    catalogo,
    cargando,
    error: error ?? guardar.error ?? cambiarEstado.error ?? eliminar.error,
    recargar: cargar,
    editar,
    cerrarEdicion,
    guardar: guardar.ejecutar,
    cambiarEstado: cambiarEstado.ejecutar,
    eliminar: eliminar.ejecutar,
    escribiendo: guardar.enviando || cambiarEstado.enviando || eliminar.enviando,
  }
}
