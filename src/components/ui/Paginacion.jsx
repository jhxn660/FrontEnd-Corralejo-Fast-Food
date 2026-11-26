/**
 * Paginación de una lista ya recortada en el cliente. Muestra una ventana de cinco números
 * alrededor de la página actual, más Anterior y Siguiente.
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
