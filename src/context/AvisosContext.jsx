import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import Aviso from '../components/ui/Aviso'

/**
 * AVISOS DE CONFIRMACIÓN (esquina superior derecha, 3 segundos).
 *
 * Por qué un contexto y no un useState por pantalla: antes cada pantalla
 * resolvía esto a su manera —Login y Register abrían un SweetAlert modal que
 * hay que cerrar a mano, Pedidos tenía su propio Toast con temporizador, y las
 * siete pantallas restantes no avisaban de nada—. El resultado era que la misma
 * acción se confirmaba de tres formas distintas según dónde se hiciera.
 *
 * Reparto: este contexto gobierna CUÁNDO aparece y cuánto dura; `Aviso` sabe
 * cómo se ve. La pila se monta por portal en document.body para que ningún
 * contenedor con overflow la recorte, igual que los modales.
 *
 * Lo que NO hace: no sustituye al error en pantalla. Un fallo al cargar un
 * recurso sigue mostrándose con `MensajeError`, que se queda y ofrece
 * reintentar; el aviso es para lo que acaba de pasar y se puede dejar ir.
 */

const DURACION = 3000 // el enunciado pide 3 segundos
const SALIDA = 200 // lo que tarda la animación de salida

const AvisosContext = createContext(null)

export function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([])
  const temporizadores = useRef(new Map())
  const siguienteId = useRef(0)

  const quitar = useCallback((id) => {
    setAvisos((previos) => previos.filter((aviso) => aviso.id !== id))
    const pendiente = temporizadores.current.get(id)
    if (pendiente) {
      clearTimeout(pendiente.cierre)
      clearTimeout(pendiente.salida)
      temporizadores.current.delete(id)
    }
  }, [])

  /** Marca el aviso como saliendo y lo retira cuando acaba la animación. */
  const cerrar = useCallback(
    (id) => {
      setAvisos((previos) =>
        previos.map((aviso) => (aviso.id === id ? { ...aviso, saliendo: true } : aviso))
      )
      const salida = setTimeout(() => quitar(id), SALIDA)
      const anterior = temporizadores.current.get(id)
      temporizadores.current.set(id, { cierre: anterior?.cierre, salida })
    },
    [quitar]
  )

  const mostrar = useCallback(
    (tipo, titulo, mensaje = '') => {
      const id = ++siguienteId.current
      setAvisos((previos) => [...previos, { id, tipo, titulo, mensaje }].slice(-4))
      const cierre = setTimeout(() => cerrar(id), DURACION)
      temporizadores.current.set(id, { cierre })
      return id
    },
    [cerrar]
  )

  // Los temporizadores vivos al desmontar dejarían un setState sobre un árbol
  // que ya no existe.
  useEffect(() => {
    const pendientes = temporizadores.current
    return () => {
      pendientes.forEach(({ cierre, salida }) => {
        clearTimeout(cierre)
        clearTimeout(salida)
      })
      pendientes.clear()
    }
  }, [])

  const valor = useMemo(
    () => ({
      exito: (titulo, mensaje) => mostrar('exito', titulo, mensaje),
      error: (titulo, mensaje) => mostrar('error', titulo, mensaje),
      informacion: (titulo, mensaje) => mostrar('informacion', titulo, mensaje),

      /**
       * Avisa de un fallo leyendo el mensaje del error. `ErrorApi` ya trae uno
       * redactado para la persona que lo lee; cualquier otro error cae en un
       * texto genérico antes que mostrar un volcado técnico.
       */
      fallo: (titulo, err) =>
        mostrar('error', titulo, err?.message ?? 'Ocurrió un error inesperado.'),
    }),
    [mostrar]
  )

  return (
    <AvisosContext.Provider value={valor}>
      {children}
      {avisos.length > 0 &&
        createPortal(
          <div className="pila-avisos">
            {avisos.map((aviso) => (
              <Aviso
                key={aviso.id}
                tipo={aviso.tipo}
                titulo={aviso.titulo}
                mensaje={aviso.mensaje}
                duracion={DURACION}
                saliendo={aviso.saliendo}
                onCerrar={() => cerrar(aviso.id)}
              />
            ))}
          </div>,
          document.body
        )}
    </AvisosContext.Provider>
  )
}

/**
 * Acceso a los avisos. Si no hay proveedor devuelve funciones vacías en vez de
 * lanzar: un aviso que no sale es un detalle, pero una pantalla que se cae por
 * no poder avisar es un error de verdad.
 */
export function useAvisos() {
  return (
    useContext(AvisosContext) ?? {
      exito: () => {},
      error: () => {},
      informacion: () => {},
      fallo: () => {},
    }
  )
}
