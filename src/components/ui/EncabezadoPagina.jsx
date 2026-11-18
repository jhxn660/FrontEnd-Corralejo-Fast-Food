/** Título de pantalla + acciones a la derecha. */
export default function EncabezadoPagina({ titulo, descripcion, children }) {
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
      <div>
        <h1 className="h3 fw-bold mb-1">{titulo}</h1>
        {descripcion && <p className="text-secondary mb-0">{descripcion}</p>}
      </div>
      {children && <div className="d-flex flex-wrap gap-2">{children}</div>}
    </div>
  )
}
