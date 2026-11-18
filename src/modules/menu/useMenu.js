import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { usePeticion } from '../../hooks/usePeticion'
import { useSincronizar } from '../../hooks/useSincronizar'
import { menuApi } from './api'

const ORDENES = {
  '': () => 0,
  asc: (a, b) => a.precio - b.precio,
  desc: (a, b) => b.precio - a.precio,
}

/**
 * Carta del restaurante para cualquier rol.
 *
 * @param {boolean} editable  el administrador recibe además las escrituras.
 *
 * El hook no sabe nada de permisos: `editable` solo decide si se piden las
 * categorías inhabilitadas. Quién es editable lo decide config/navegacion.jsx.
 */
export function useMenu({ editable = false } = {}) {
  const [categorias, setCategorias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState('')
  const abortoActual = useRef(null)
  const cargaVisible = useRef(false)

  // `silencioso`: refresco de sincronización (otro rol cambió la carta), sin
  // spinner ni borrar el error de una carga normal. No interrumpe una carga
  // visible en curso: la abortaba, nadie apagaba `cargando` y la carta se
  // quedaba en el spinner tras guardar.
  const pedir = useCallback(
    async ({ silencioso }) => {
      if (silencioso && cargaVisible.current) return

      // Una recarga cancela la anterior: sin esto, dos recargas seguidas pueden
      // resolverse en orden inverso y dejar en pantalla la respuesta vieja.
      abortoActual.current?.abort('recarga')
      const controlador = new AbortController()
      abortoActual.current = controlador

      if (!silencioso) {
        cargaVisible.current = true
        setCargando(true)
        setError(null)
      }
      try {
        const { categorias: datos } = await menuApi.listarCategorias({
          soloDisponibles: !editable,
          senal: controlador.signal,
        })
        setCategorias(datos)
      } catch (err) {
        if (err?.name !== 'AbortError' && !silencioso) setError(err)
      } finally {
        if (abortoActual.current === controlador && !silencioso) {
          cargaVisible.current = false
          setCargando(false)
        }
      }
    },
    [editable]
  )

  const cargar = useCallback(() => pedir({ silencioso: false }), [pedir])
  const refrescar = useCallback(() => pedir({ silencioso: true }), [pedir])

  useEffect(() => {
    cargar()
    return () => abortoActual.current?.abort('desmontaje')
  }, [cargar])

  useSincronizar(refrescar)

  // Fuera del modo editable json-server ya recorta las inhabilitadas
  // (?estado=Disponible); el filtro de abajo es solo un segundo seguro.
  const visibles = useMemo(() => {
    const texto = busqueda.toLowerCase().trim()
    const comparar = ORDENES[orden] ?? ORDENES['']

    const coincideCategoria = (categoria) => categoria.nombre.toLowerCase().includes(texto)
    const coincidePlato = (plato) =>
      `${plato.nombre} ${plato.descripcion ?? ''}`.toLowerCase().includes(texto)

    return categorias
      .filter((c) => editable || c.disponible)
      .map((c) => {
        // Al buscar se recortan también los platos, no solo las categorías: una
        // búsqueda de "pollo" que devuelve la categoría entera con sus nueve
        // platos no ha filtrado nada. Si lo que coincide es el nombre de la
        // categoría, se muestra completa: ahí la intención es verla toda.
        const productos =
          !texto || coincideCategoria(c) ? c.productos : c.productos.filter(coincidePlato)
        return { ...c, productos: [...productos].sort(comparar) }
      })
      .filter((c) => !texto || coincideCategoria(c) || c.productos.length > 0)
  }, [categorias, busqueda, orden, editable])

  // Tras cada escritura se recarga el recurso completo (R21): es más lento que
  // parchear el array local, pero nunca queda inconsistente con json-server.
  const trasEscribir = useCallback(
    async (promesa) => {
      const datos = await promesa
      await cargar()
      return datos
    },
    [cargar]
  )

  const guardar = usePeticion(
    useCallback(
      (categoria) =>
        trasEscribir(
          categoria.id
            ? menuApi.actualizarCategoria(categoria.id, categoria)
            : menuApi.crearCategoria(categoria)
        ),
      [trasEscribir]
    )
  )

  const eliminar = usePeticion(
    useCallback((id) => trasEscribir(menuApi.eliminarCategoria(id)), [trasEscribir])
  )

  const alternarEstado = usePeticion(
    useCallback(
      (categoria) =>
        trasEscribir(
          menuApi.cambiarEstadoCategoria(
            categoria.id,
            categoria.disponible ? 'Inhabilitado' : 'Disponible'
          )
        ),
      [trasEscribir]
    )
  )

  return {
    categorias: visibles,
    // Las categorías tal como llegaron, sin filtrar ni ordenar. Toda edición
    // parte de aquí: `visibles` recorta los platos al buscar y los reordena por
    // precio, y guardar esa versión borraría los platos que la búsqueda
    // ocultaba y cambiaría el orden de la carta.
    todas: categorias,
    cargando,
    error: error ?? guardar.error ?? eliminar.error ?? alternarEstado.error,
    recargar: cargar,
    busqueda,
    setBusqueda,
    orden,
    setOrden,
    guardar: guardar.ejecutar,
    eliminar: eliminar.ejecutar,
    alternarEstado: alternarEstado.ejecutar,
    escribiendo: guardar.enviando || eliminar.enviando || alternarEstado.enviando,
  }
}
