import { useCallback } from 'react'
import { Link } from 'react-router-dom'

import { useRecurso } from '../../hooks/useRecurso'
import { moneda } from '../../utils/format'
import { Cargando, Vacio } from '../../components/ui/Estado'
import Estrellas from '../../components/ui/Estrellas'
<<<<<<< HEAD
import { imagenDe, tieneImagen } from '../products/esquema'

import { destacadosApi } from './api'

// En escritorio el primero va al centro y más grande; en móvil se apilan 1, 2, 3.
=======
import { imagenDe, tieneImagen } from '../menu/esquema'
import { destacadosApi } from './api'

// En escritorio el primero va al centro y más grande, como en el wireframe; en
// móvil se apilan en orden natural 1, 2, 3.
>>>>>>> origin/main
const ORDEN = {
  1: 'order-1 order-md-2',
  2: 'order-2 order-md-1',
  3: 'order-3',
}

/**
<<<<<<< HEAD
 * «Lista top»: los tres productos mejor calificados (destacadosApi.mejorValorados).
 *
 * Las estrellas las dan los clientes al calificar una compra con el QR del tiquete; el backend
 * las promedia por producto (`rating` de /products/public). Gana el promedio más alto; si
 * empatan, el que tiene más valoraciones.
 *
 * `rutaComentarios`: a dónde lleva el bocadillo de cada tarjeta (el muro de la portada del
 * rol); sin ella no se pinta. `rutaMenu`: muestra «Ver nuestro menú» (solo en la portada).
 */
export default function ListaTop({ rutaComentarios = null, rutaMenu = null }) {
=======
 * «Lista top»: los tres platos mejor calificados de la carta.
 *
 * La calificación es la que mantiene el administrador; el cliente ya no vota
 * platos (ver components/ui/Estrellas.jsx). El icono de bocadillo de cada
 * tarjeta baja al muro de comentarios, que es donde el cliente sí opina.
 *
 * `anclaComentarios` es el id del muro en la misma pantalla. Se recibe por
 * props en vez de estar escrito aquí para que esta tarjeta no dependa de cómo
 * se llame la sección de al lado.
 */
export default function ListaTop({ anclaComentarios = 'muro-comentarios' }) {
>>>>>>> origin/main
  const cargar = useCallback(() => destacadosApi.mejorValorados(), [])
  const { datos: top, cargando } = useRecurso(cargar, [])

  if (cargando && top.length === 0) return <Cargando texto="Cargando la lista top…" />

  if (top.length === 0) {
    return (
      <div className="card border-0 shadow-sm mb-3">
<<<<<<< HEAD
        <Vacio
          texto="Todavía no hay productos calificados: aparecen aquí cuando los clientes califican su compra con el QR del tiquete."
          icono="fa-star"
        />
=======
        <Vacio texto="Todavía no hay platos calificados en la carta." icono="fa-star" />
>>>>>>> origin/main
      </div>
    )
  }

  return (
    <section className="mb-4" aria-labelledby="titulo-lista-top">
      <div className="text-center mb-4">
        <h2 className="h3 fw-bold mb-1" id="titulo-lista-top">
          Lista top
        </h2>
        <p className="text-secondary mb-0">
          Los platos mejor valorados de la carta de Corralejo Fast Food.
        </p>
      </div>

      <div className="row g-3 g-lg-4 align-items-center justify-content-center">
        {top.map((plato) => (
          <div className={`col-12 col-sm-8 col-md-4 ${ORDEN[plato.posicion]}`} key={plato.nombre}>
            <article
              className={`card border-0 shadow-sm h-100 ${
                plato.posicion === 1 ? 'podio-primero' : ''
              }`}
            >
              <div className="card-body p-3 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="badge bg-secondary">{plato.categoria}</span>
<<<<<<< HEAD
                  {rutaComentarios && (
                    <Link
                      className="btn btn-sm btn-link text-secondary p-0"
                      to={rutaComentarios}
                      aria-label="Ir a los comentarios de los clientes"
                      title="Ver los comentarios de los clientes"
                    >
                      <i className="fa-regular fa-comment fs-5" />
                    </Link>
                  )}
=======
                  <a
                    className="btn btn-sm btn-link text-secondary p-0"
                    href={`#${anclaComentarios}`}
                    aria-label="Ir a los comentarios de los clientes"
                    title="Ver los comentarios de los clientes"
                  >
                    <i className="fa-regular fa-comment fs-5" />
                  </a>
>>>>>>> origin/main
                </div>

                <img
                  className={`podio-foto rounded mb-3 ${
                    tieneImagen(plato) ? '' : 'miniatura-respaldo'
                  }`}
                  src={imagenDe(plato)}
                  alt={tieneImagen(plato) ? `Foto de ${plato.nombre}` : ''}
                  aria-hidden={tieneImagen(plato) ? undefined : 'true'}
                  loading="lazy"
                />

                <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
<<<<<<< HEAD
                  <span className="d-inline-flex align-items-center gap-2">
                    <Estrellas valor={plato.calificacion} />
                    <small className="text-secondary">
                      {plato.calificacion.toLocaleString('es-CO')} · {plato.totalCalificaciones} valoración(es)
                    </small>
                  </span>
=======
                  <Estrellas valor={plato.calificacion} />
>>>>>>> origin/main
                  <strong>{moneda(plato.precio)}</strong>
                </div>

                <h3 className="h6 fw-bold fst-italic mb-2">{plato.nombre}</h3>

                {plato.descripcion && (
                  <p className="small text-secondary recorte-3 mb-3">{plato.descripcion}</p>
                )}

<<<<<<< HEAD
                {rutaMenu && (
                  <Link className="btn btn-primary btn-sm w-100 mt-auto" to={rutaMenu}>
                    <i className="fa-solid fa-utensils me-2" />
                    Ver nuestro menú
                  </Link>
                )}
=======
                <Link
                  className="btn btn-primary btn-sm w-100 mt-auto"
                  to="/cliente/panel?vista=menu"
                >
                  <i className="fa-solid fa-utensils me-2" />
                  Ver nuestro menú
                </Link>
>>>>>>> origin/main
              </div>
            </article>
          </div>
        ))}
      </div>
    </section>
  )
}
