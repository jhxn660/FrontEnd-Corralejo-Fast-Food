import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { usePeticion } from '../../hooks/usePeticion'
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

  const cargar = useCallback(async () => {
    // Una recarga cancela la anterior: sin esto, dos recargas seguidas pueden
    // resolverse en orden inverso y dejar en pantalla la respuesta vieja.
    abortoActual.current?.abort('recarga')
    const controlador = new AbortController()
    abortoActual.current = controlador

    setCargando(true)
    setError(null)
    try {
      const { categorias: datos } = await menuApi.listarCategorias({
        soloDisponibles: !editable,
        senal: controlador.signal,
      })
      setCategorias(datos)
    } catch (err) {
      if (err?.name !== 'AbortError') setError(err)
    } finally {
      if (abortoActual.current === controlador) setCargando(false)
    }
  }, [editable])

  useEffect(() => {
    cargar()
    return () => abortoActual.current?.abort('desmontaje')
  }, [cargar])

  // DEUDA: el recorte de inhabilitadas debería venir del servidor
  // (?estado=Disponible). Mientras no exista, los datos llegan al navegador.
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
  // parchear el array local, pero nunca queda inconsistente con el servidor.
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
