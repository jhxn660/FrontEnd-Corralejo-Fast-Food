import { useState } from 'react'

const LARGO = { texto: 1500, titulo: 60, resumen: 160, historia: 2000 }
const MINIMO = 20

/** Errores por campo; vacío = válido. Validación de experiencia: json-server no valida. */
const validar = ({ mision, vision, historias }) => {
  const fallos = {}
  if (mision.trim().length < MINIMO) fallos.mision = `La misión necesita al menos ${MINIMO} caracteres.`
  if (vision.trim().length < MINIMO) fallos.vision = `La visión necesita al menos ${MINIMO} caracteres.`
  historias.forEach((historia, indice) => {
    if (!historia.titulo.trim()) fallos[`titulo-${indice}`] = 'Escribe un título.'
    if (!historia.resumen.trim()) fallos[`resumen-${indice}`] = 'Escribe un resumen.'
    if (historia.texto.trim().length < MINIMO) {
      fallos[`texto-${indice}`] = `La historia necesita al menos ${MINIMO} caracteres.`
    }
  })
  return fallos
}

/**
 * Edición del contenido institucional (Admin y Owner): misión, visión y el
 * título, resumen y texto de cada historia. El icono de cada historia no se
 * edita: es parte del diseño, no del contenido.
 *
 * `id="formulario-informacion"`: el botón Guardar vive en el pie del modal.
 */
export default function FormularioInformacion({ informacion, enviando, onGuardar }) {
  const [valores, setValores] = useState(() => ({
    mision: informacion.mision,
    vision: informacion.vision,
    historias: informacion.historias.map((historia) => ({ ...historia })),
  }))
  const [errores, setErrores] = useState({})

  const cambiar = (cambios) => {
    setValores((previos) => ({ ...previos, ...cambios }))
    setErrores({})
  }

  const cambiarHistoria = (indice, cambios) =>
    cambiar({
      historias: valores.historias.map((historia, posicion) =>
        posicion === indice ? { ...historia, ...cambios } : historia
      ),
    })

  const enviar = (evento) => {
    evento.preventDefault()
    const fallos = validar(valores)
    if (Object.keys(fallos).length > 0) {
      setErrores(fallos)
      return
    }
    onGuardar({
      mision: valores.mision.trim(),
      vision: valores.vision.trim(),
      historias: valores.historias.map((historia) => ({
        ...historia,
        titulo: historia.titulo.trim(),
        resumen: historia.resumen.trim(),
        texto: historia.texto.trim(),
      })),
    })
  }

  const error = (clave) =>
    errores[clave] && (
      <div className="invalid-feedback d-block" role="alert">
        {errores[clave]}
      </div>
    )

  return (
    <form id="formulario-informacion" onSubmit={enviar} noValidate>
      <fieldset disabled={enviando}>
        <div className="mb-3">
          <label className="form-label fw-semibold" htmlFor="info-mision">
            Nuestra misión
          </label>
          <textarea
            id="info-mision"
            className={`form-control ${errores.mision ? 'is-invalid' : ''}`}
            rows="4"
            maxLength={LARGO.texto}
            value={valores.mision}
            onChange={(evento) => cambiar({ mision: evento.target.value })}
          />
          {error('mision')}
        </div>

        <div className="mb-4">
          <label className="form-label fw-semibold" htmlFor="info-vision">
            Visión
          </label>
          <textarea
            id="info-vision"
            className={`form-control ${errores.vision ? 'is-invalid' : ''}`}
            rows="4"
            maxLength={LARGO.texto}
            value={valores.vision}
            onChange={(evento) => cambiar({ vision: evento.target.value })}
          />
          {error('vision')}
        </div>

        <h3 className="h6 fw-bold text-uppercase mb-3">
          <i className="fa-solid fa-book-open text-brand me-2" />
          Narrativa creativa
        </h3>

        {valores.historias.map((historia, indice) => (
          <section className="border rounded p-3 mb-3" key={historia.id ?? indice}>
            <p className="small text-secondary mb-2">
              <i className={`fa-solid ${historia.icono} text-brand me-2`} />
              Historia {indice + 1}
            </p>

            <div className="row g-2 mb-2">
              <div className="col-12 col-md-5">
                <label className="form-label small" htmlFor={`info-titulo-${indice}`}>
                  Título
                </label>
                <input
                  id={`info-titulo-${indice}`}
                  className={`form-control ${errores[`titulo-${indice}`] ? 'is-invalid' : ''}`}
                  maxLength={LARGO.titulo}
                  value={historia.titulo}
                  onChange={(evento) => cambiarHistoria(indice, { titulo: evento.target.value })}
                />
                {error(`titulo-${indice}`)}
              </div>
              <div className="col-12 col-md-7">
                <label className="form-label small" htmlFor={`info-resumen-${indice}`}>
                  Resumen
                </label>
                <input
                  id={`info-resumen-${indice}`}
                  className={`form-control ${errores[`resumen-${indice}`] ? 'is-invalid' : ''}`}
                  maxLength={LARGO.resumen}
                  value={historia.resumen}
                  onChange={(evento) => cambiarHistoria(indice, { resumen: evento.target.value })}
                />
                {error(`resumen-${indice}`)}
              </div>
            </div>

            <label className="form-label small" htmlFor={`info-texto-${indice}`}>
              Historia completa
            </label>
            <textarea
              id={`info-texto-${indice}`}
              className={`form-control ${errores[`texto-${indice}`] ? 'is-invalid' : ''}`}
              rows="4"
              maxLength={LARGO.historia}
              value={historia.texto}
              onChange={(evento) => cambiarHistoria(indice, { texto: evento.target.value })}
            />
            {error(`texto-${indice}`)}
          </section>
        ))}
      </fieldset>
    </form>
  )
}
