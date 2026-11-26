// ⚠️ ARCHIVO SIN USO TODAVÍA (fase 2).
// Ninguna pantalla importa este archivo: solo lo usan otros archivos de la
// misma "fase 2" (usePedidos, useVentas, pedidos/api, ventas/api,
// pedidos/calculos, store/carrito, store/bloqueos). Está preparado para cuando
// exista el back real con /pedidos/:id/estado, versiones y total autoritativo.
// Si vas a cambiar cómo funcionan Pedidos o Ventas HOY, el código está en
// Pedidos.jsx, Ventas.jsx y ventas/servicio.js, no aquí.
// Ver docs/PARTES-COMPLEJAS.md, sección "Código preparado para la fase 2".

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { usePeticion } from '../../hooks/usePeticion'
import { RECURSOS_BLOQUEABLES, useBloqueos } from '../../store/bloqueos'
import { ventasApi } from './api'

/**
 * Ventas del empleado. Lecturas + las dos escrituras del contrato.
 *
 * Decisiones que no son obvias:
 *
 * - `puedeModificar` se responde con `minutosRestantes` del servidor y NUNCA
 *   comparando con el reloj del navegador: la hora local es manipulable, y la
 *   regla de los 90 minutos (RF-44) la valida el back de todos modos. Si el
 *   back todavía no manda el campo, devuelve false: es mejor un botón ausente
 *   que uno que falla al pulsarlo.
 * - Un 409 (RNF-12) no se trata como error de formulario: significa que otro
 *   empleado guardó antes. Se recarga la lista y se devuelve `conflicto: true`
 *   para que la pantalla avise y vuelva a abrir el registro ya actualizado.
 */
export function useVentas({ filtros } = {}) {
  const [ventas, setVentas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const abortoActual = useRef(null)
  const { tomar, liberar, marcarConflicto, versionDe } = useBloqueos()

  const { desde, estado } = filtros ?? {}

  const cargar = useCallback(async () => {
    abortoActual.current?.abort('recarga')
    const controlador = new AbortController()
    abortoActual.current = controlador

    setCargando(true)
    setError(null)
    try {
      const { ventas: datos } = await ventasApi.listar({
        desde,
        estado,
        senal: controlador.signal,
      })
      setVentas(datos)
    } catch (err) {
      if (err?.name !== 'AbortError') setError(err)
    } finally {
      if (abortoActual.current === controlador) setCargando(false)
    }
  }, [desde, estado])

  useEffect(() => {
    cargar()
    return () => abortoActual.current?.abort('desmontaje')
  }, [cargar])

  /**
   * Abrir el formulario de una venta. Toma el bloqueo local y guarda la versión
   * que traía el registro: es la que se enviará en el PUT para que el servidor
   * detecte si otro empleado guardó antes (RNF-12). Devuelve false si esta
   * misma pestaña ya la tenía abierta.
   */
  const editar = useCallback(
    (venta) => tomar(RECURSOS_BLOQUEABLES.ventas, venta.id, { version: venta.version }),
    [tomar]
  )

  const cerrarEdicion = useCallback(
    (venta) => liberar(RECURSOS_BLOQUEABLES.ventas, venta.id),
    [liberar]
  )

  const guardar = usePeticion(
    useCallback(
      async (venta) => {
        try {
          const datos = await ventasApi.actualizar(venta.id, {
            ...venta,
            version: venta.version ?? versionDe(RECURSOS_BLOQUEABLES.ventas, venta.id),
          })
          liberar(RECURSOS_BLOQUEABLES.ventas, venta.id)
          await cargar()
          return { datos, conflicto: false }
        } catch (err) {
          if (err.esConflicto) {
            // No se reintenta: reintentar sobrescribiría el cambio del otro.
            marcarConflicto(RECURSOS_BLOQUEABLES.ventas, venta.id)
            await cargar()
            return { datos: null, conflicto: true }
          }
          throw err // 403 (ventana expirada) y el resto suben a la pantalla
        }
      },
      [cargar, liberar, marcarConflicto, versionDe]
    )
  )

  const cambiarEstado = usePeticion(
    useCallback(
      async (id, nuevoEstado) => {
        const datos = await ventasApi.cambiarEstado(id, nuevoEstado)
        await cargar()
        return datos
      },
      [cargar]
    )
  )

  const totales = useMemo(
    () => ({
      cantidad: ventas.length,
      recaudado: ventas.reduce((suma, v) => suma + v.total, 0),
    }),
    [ventas]
  )

  return {
    ventas,
    totales,
    cargando,
    error: error ?? guardar.error ?? cambiarEstado.error,
    recargar: cargar,
    editar,
    cerrarEdicion,
    guardar: guardar.ejecutar,
    cambiarEstado: cambiarEstado.ejecutar,
    escribiendo: guardar.enviando || cambiarEstado.enviando,
    puedeModificar: (venta) => Number(venta?.minutosRestantes) > 0,
    urlTicketPublico: ventasApi.urlTicketPublico,
    urlTicketEscPos: ventasApi.urlTicketEscPos,
  }
}
