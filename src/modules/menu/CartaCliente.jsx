import { useMemo, useState } from 'react'

import { moneda } from '../../utils/format'
import { Vacio } from '../../components/ui/Estado'
import { anclaDe, iconoDe } from './esquema'
import TarjetaPlato from './TarjetaPlato'
import DetallePlato from './DetallePlato'

/**
 * La carta tal como la ve el cliente: el catálogo completo, por categorías.
 *
 * MISMA FUENTE QUE EL ADMINISTRADOR
 * Recibe las categorías de `useMenu`, que las lee de la colección que edita el
 * administrador. No hay un catálogo aparte para el cliente: lo que el
 * administrador publica, inhabilita o cambia de precio aparece aquí tal cual, y
 * las categorías inhabilitadas no llegan (las recorta el hook).
 *
 * TODO DESPLEGADO, CON ATAJOS
 * Las categorías se pintan una debajo de otra con todos sus platos, y la cinta
 * de anclas salta a cualquiera: así se ve la carta entera de un barrido, como
 * en papel. La rejilla que obligaba a entrar y salir de cada categoría escondía
 * platos detrás de un clic.
 *
 * La búsqueda sí se salta la portada y las anclas: quien escribe "pollo" quiere
 * los platos, no recorrer la carta.
 *
 * La imagen de cada plato la resuelve `TarjetaPlato` con `imagenDe`: la que
 * subió el administrador o el logo del Corralejo.
 *
 * `vitrina`: la misma carta en el panel del empleado, para enseñarla en el
 * local. Sin WhatsApp: el cliente ya está delante, el pedido lo toma el
 * empleado en Gestión de Pedidos.
 */
export default function CartaCliente({ categorias, vitrina = false, busqueda = '' }) {
  const [elegido, setElegido] = useState(null) // { plato, categoria }

  const buscando = busqueda.trim().length > 0

  const platos = useMemo(
    () => categorias.flatMap((c) => c.productos.map((plato) => ({ plato, categoria: c }))),
    [categorias]
  )

  /**
   * Los tres platos mejor calificados abren la carta. Es la sección que decide
   * una compra cuando el cliente no sabe qué pedir.
   */
  const destacados = useMemo(
    () =>
      [...platos]
        .filter(({ plato }) => plato.calificacion)
        .sort(
          (a, b) => b.plato.calificacion - a.plato.calificacion || a.plato.precio - b.plato.precio
        )
        .slice(0, 3),
    [platos]
  )

  const idsDestacados = new Set(destacados.map(({ plato }) => plato.id))
  const precios = platos.map(({ plato }) => plato.precio).filter((precio) => precio > 0)
  const masBarato = precios.length > 0 ? Math.min(...precios) : 0

  const abrir = (plato, categoria) => setElegido({ plato, categoria })

  const detalle = elegido && (
    <DetallePlato
      plato={elegido.plato}
      categoria={elegido.categoria}
      vitrina={vitrina}
      onCerrar={() => setElegido(null)}
    />
  )

  /** Rejilla de platos de una categoría, que es lo único que se repite. */
  const rejilla = (categoria, conDestacados = false) => (
    <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3">
      {categoria.productos.map((plato) => (
        <TarjetaPlato
          key={plato.id}
          plato={plato}
          categoria={categoria.nombre}
          destacado={conDestacados && idsDestacados.has(plato.id)}
          onAbrir={() => abrir(plato, categoria.nombre)}
        />
      ))}
    </div>
  )

  if (categorias.length === 0) {
    return (
      <div className="card border-0 shadow-sm">
        <Vacio
          texto={
            buscando
              ? `No encontramos nada para "${busqueda.trim()}".`
              : 'Todavía no hay platos publicados en la carta.'
          }
          icono="fa-utensils"
        />
      </div>
    )
  }

  // ---------- Resultados de búsqueda ----------
  if (buscando) {
    return (
      <>
        <p className="text-secondary small">
          {platos.length} plato(s) para <strong>{busqueda.trim()}</strong>.
        </p>

        {categorias.map((categoria) => (
          <section className="mb-4" key={categoria.id}>
            <h3 className="h6 fw-bold text-uppercase text-secondary mb-3">
              <i className={`${iconoDe(categoria.nombre)} text-brand me-2`} />
              {categoria.nombre}
            </h3>
            {rejilla(categoria)}
          </section>
        ))}

        {detalle}
      </>
    )
  }

  // ---------- Carta completa ----------
  return (
    <>
      {/* Portada: dice de qué va la casa y da la cifra con la que se entra. */}
      <section className="card border-0 shadow-sm bg-carbon text-white mb-3 overflow-hidden">
        <div className="card-body p-4 row g-3 align-items-center">
          <div className="col-12 col-lg-8">
            <span className="badge bg-brand mb-2">Carta del día</span>
            <h2 className="h3 fw-bold mb-2">
              Hoy en <span className="text-brand">Corralejo</span>
            </h2>
            <p className="mb-0 text-white-50">
              {platos.length} platos en {categorias.length} categorías, preparados al momento.
              {masBarato > 0 && (
                <>
                  {' '}
                  Desde <strong className="text-white">{moneda(masBarato)}</strong>.
                </>
              )}
            </p>
          </div>
          <div className="col-12 col-lg-4 text-lg-end" aria-hidden="true">
            <span style={{ fontSize: '3.5rem', lineHeight: 1 }}>🍔🌭🍟</span>
          </div>
        </div>
      </section>

      {/* Atajos a cada categoría: con ocho categorías, bajar a pulso es tedioso. */}
      <nav className="carta-ancla mb-3" aria-label="Categorías de la carta">
        <div className="d-flex flex-wrap gap-2">
          {categorias.map((categoria) => (
            <a
              key={categoria.id}
              href={`#${anclaDe(categoria)}`}
              className="btn btn-sm btn-outline-primary"
            >
              <i className={`${iconoDe(categoria.nombre)} me-2`} />
              {categoria.nombre}
              <span className="badge bg-brand ms-2">{categoria.productos.length}</span>
            </a>
          ))}
        </div>
      </nav>

      {destacados.length > 0 && (
        <section className="mb-4">
          <h3 className="h5 fw-bold mb-3">
            <i className="fa-solid fa-fire text-brand me-2" />
            Los favoritos de la casa
          </h3>
          <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3">
            {destacados.map(({ plato, categoria }) => (
              <TarjetaPlato
                key={`destacado-${plato.id}`}
                plato={plato}
                categoria={categoria.nombre}
                destacado
                onAbrir={() => abrir(plato, categoria.nombre)}
              />
            ))}
          </div>
        </section>
      )}

      {categorias.map((categoria) => (
        <section className="mb-4" id={anclaDe(categoria)} key={categoria.id}>
          <div className="d-flex align-items-center gap-3 mb-3">
            <div className="icon-tile d-flex align-items-center justify-content-center flex-shrink-0">
              <i className={iconoDe(categoria.nombre)} />
            </div>
            <div className="min-width-0">
              <h3 className="h5 fw-bold mb-0">{categoria.nombre}</h3>
              {categoria.descripcion && (
                <p className="text-secondary small mb-0 recorte-2">{categoria.descripcion}</p>
              )}
            </div>
            <span className="badge bg-secondary ms-auto flex-shrink-0">
              {categoria.productos.length} plato(s)
            </span>
          </div>

          {categoria.productos.length === 0 ? (
            <p className="text-secondary fst-italic small">Esta categoría todavía no tiene platos.</p>
          ) : (
            rejilla(categoria, true)
          )}
        </section>
      ))}

      {detalle}
    </>
  )
}
