/**
 * Paginación de una lista ya recortada en el cliente.
 *
 * Usa `page-item`, la clase que Bootstrap espera. La versión anterior escribía
 * `page-insumo` —un renombrado de más al aplicar R65— y sin esa clase los
 * botones perdían su forma y el estado `disabled` no desactivaba nada: se podía
 * seguir pulsando "Anterior" en la primera página.
 *
 * La ventana de números está acotada: con 40 páginas no se pintan 40 botones,
 * se pintan los cinco de alrededor y se deja que los extremos hagan el resto.
 */

const VENTANA = 5

const ventanaDe = (actual, total) => {
  const inicio = Math.max(1, Math.min(actual - Math.floor(VENTANA / 2), total - VENTANA + 1))
  const largo = Math.min(VENTANA, total)
  return Array.from({ length: largo }, (_, i) => Math.max(1, inicio) + i)
}

export default function Paginacion({ pagina, totalPaginas, onCambiar, etiqueta = 'Paginación' }) {
  if (totalPaginas <= 1) return null

  const numeros = ventanaDe(pagina, totalPaginas)
  const enPrimera = pagina === 1
  const enUltima = pagina === totalPaginas

  return (
    <nav aria-label={etiqueta} className="d-flex justify-content-center mt-4">
      <ul className="pagination mb-0 flex-wrap">
        <li className={`page-item ${enPrimera ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => onCambiar(pagina - 1)}
            disabled={enPrimera}
            aria-label="Página anterior"
          >
            <i className="fa-solid fa-chevron-left" />
          </button>
        </li>

        {numeros[0] > 1 && (
          <li className="page-item">
            <button className="page-link" onClick={() => onCambiar(1)}>
              1
            </button>
          </li>
        )}
        {numeros[0] > 2 && (
          <li className="page-item disabled">
            <span className="page-link">…</span>
          </li>
        )}

        {numeros.map((numero) => (
          <li className={`page-item ${numero === pagina ? 'active' : ''}`} key={numero}>
            <button
              className="page-link"
              onClick={() => onCambiar(numero)}
              aria-current={numero === pagina ? 'page' : undefined}
            >
              {numero}
            </button>
          </li>
        ))}

        {numeros[numeros.length - 1] < totalPaginas - 1 && (
          <li className="page-item disabled">
            <span className="page-link">…</span>
          </li>
        )}
        {numeros[numeros.length - 1] < totalPaginas && (
          <li className="page-item">
            <button className="page-link" onClick={() => onCambiar(totalPaginas)}>
              {totalPaginas}
            </button>
          </li>
        )}

        <li className={`page-item ${enUltima ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => onCambiar(pagina + 1)}
            disabled={enUltima}
            aria-label="Página siguiente"
          >
            <i className="fa-solid fa-chevron-right" />
          </button>
        </li>
      </ul>
    </nav>
  )
}
