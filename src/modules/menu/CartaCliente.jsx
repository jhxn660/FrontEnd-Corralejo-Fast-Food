import { useMemo, useState } from 'react'

import { moneda } from '../../utils/format'
import { Vacio } from '../../components/ui/Estado'
import { anclaDe, iconoDe } from './esquema'
import TarjetaPlato from './TarjetaPlato'
import DetallePlato from './DetallePlato'

/**
 * La carta tal como la ve el cliente.
 *
 * MISMA FUENTE QUE EL ADMINISTRADOR
 * Recibe las categorías de `useMenu`, que las lee de la colección que edita el
 * administrador. No hay un catálogo aparte para el cliente: lo que el
 * administrador publica, inhabilita o cambia de precio aparece aquí tal cual, y
 * las categorías inhabilitadas no llegan (las recorta el hook).
 *
 * Ordenar por precio en esta pantalla sigue respetando el selector del
 * encabezado, porque las categorías llegan ya ordenadas desde el hook.
 */
export default function CartaCliente({ categorias }) {
  const [elegido, setElegido] = useState(null) // { plato, categoria }

  const platos = useMemo(
    () => categorias.flatMap((categoria) => categoria.productos.map((plato) => ({ plato, categoria }))),
    [categorias]
  )

  /**
   * Los tres platos mejor calificados abren la carta. Es la sección que decide
   * una compra cuando el cliente no sabe qué pedir; sin ella, la carta obliga a
   * recorrer ocho categorías para encontrar algo apetecible.
   */
  const destacados = useMemo(
    () =>
      [...platos]
        .filter(({ plato }) => plato.calificacion)
        .sort((a, b) => b.plato.calificacion - a.plato.calificacion || a.plato.precio - b.plato.precio)
        .slice(0, 3),
    [platos]
  )

  const nombresDestacados = new Set(destacados.map(({ plato }) => plato.id))

  const precios = platos.map(({ plato }) => plato.precio).filter((precio) => precio > 0)
  const masBarato = precios.length > 0 ? Math.min(...precios) : 0

  if (categorias.length === 0) {
    return (
      <div className="card border-0 shadow-sm">
        <Vacio
          texto="Todavía no hay platos publicados en la carta."
          icono="fa-utensils"
        />
      </div>
    )
  }

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
                onAbrir={() => setElegido({ plato, categoria: categoria.nombre })}
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
            <p className="text-secondary fst-italic small">
              Esta categoría todavía no tiene platos.
            </p>
          ) : (
            <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3">
              {categoria.productos.map((plato) => (
                <TarjetaPlato
                  key={plato.id}
                  plato={plato}
                  categoria={categoria.nombre}
                  destacado={nombresDestacados.has(plato.id)}
                  onAbrir={() => setElegido({ plato, categoria: categoria.nombre })}
                />
              ))}
            </div>
          )}
        </section>
      ))}

      {elegido && (
        <DetallePlato
          plato={elegido.plato}
          categoria={elegido.categoria}
          onCerrar={() => setElegido(null)}
        />
      )}
    </>
  )
}
