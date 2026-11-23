import { useCallback, useState } from 'react'

import Modal from '../../components/ui/Modal'
import { Cargando, MensajeError } from '../../components/ui/Estado'
import { useRecurso } from '../../hooks/useRecurso'
import { usePeticion } from '../../hooks/usePeticion'
import { useAuth } from '../../context/AuthContext'
import { useAvisos } from '../../context/AvisosContext'
import { PERMISO } from '../../config/roles'
import { PILARES } from '../../data/contenido'
import { informacionApi } from './api'
import FormularioInformacion from './FormularioInformacion'

const INICIAL = { id: null, mision: '', vision: '', historias: [] }

/**
 * Contenido institucional: misión, visión y la narrativa creativa (las cuatro
 * historias de la casa). Se abre desde el menú lateral (Layout): "Información"
 * para el público y el empleado, "Gestión de Información" para Admin y Owner.
 *
 * Tres vistas en el mismo modal: el resumen, la lectura de una historia (con
 * Anterior/Siguiente y "Volver") y, solo con PERMISO.EDITAR_INFORMACION, la
 * edición. Los textos salen de la API (informacionApi); de
 * data/contenido.js solo llegan el título y el icono de cada pilar.
 */
export default function InformacionCasa({ onCerrar }) {
  const { puede } = useAuth()
  const avisos = useAvisos()
  const puedeEditar = puede(PERMISO.EDITAR_INFORMACION)

  const cargar = useCallback(() => informacionApi.obtener(), [])
  const { datos: informacion, cargando, error, recargar } = useRecurso(cargar, INICIAL)

  const [indice, setIndice] = useState(null)
  const [editando, setEditando] = useState(false)

  const guardado = usePeticion(
    useCallback(
      async (cambios) => {
        await informacionApi.guardar({ id: informacion.id, ...cambios })
        await recargar()
      },
      [informacion.id, recargar]
    )
  )

  const guardar = async (cambios) => {
    const { ok, error: fallo } = await guardado.ejecutar(cambios)
    if (!ok) {
      avisos.fallo('No se pudo guardar la información', fallo)
      return
    }
    setEditando(false)
    avisos.exito('Información actualizada', 'Los clientes ya ven los textos nuevos.')
  }

  // Los pilares (misión / visión) toman título e icono de contenido.js y el
  // texto de lo guardado.
  const pilares = PILARES.map((pilar) => ({
    ...pilar,
    texto: pilar.id === 'mision' ? informacion.mision : informacion.vision,
  }))
  const historias = informacion.historias
  const historia = indice === null ? null : historias[indice]
  // Hasta la primera respuesta no hay nada que enseñar: sin respaldo en el
  // código, los pilares saldrían vacíos.
  const primeraCarga = cargando && informacion === INICIAL

  if (editando) {
    return (
      <Modal
        titulo="Editar información"
        icono="fa-pen"
        descripcion="Misión, visión y narrativa que ven todos los paneles."
        tamano="modal-lg"
        cerrarAlPulsarFuera={false}
        onClose={onCerrar}
        footer={
          <>
            <button
              className="btn btn-outline-secondary me-auto"
              onClick={() => setEditando(false)}
              disabled={guardado.enviando}
            >
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              type="submit"
              form="formulario-informacion"
              disabled={guardado.enviando}
            >
              <i className="fa-solid fa-floppy-disk me-2" />
              {guardado.enviando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </>
        }
      >
        <FormularioInformacion informacion={informacion} enviando={guardado.enviando} onGuardar={guardar} />
      </Modal>
    )
  }

  if (historia) {
    return (
      <Modal
        titulo={historia.titulo}
        icono={historia.icono}
        descripcion={historia.resumen}
        tamano="modal-lg"
        onClose={onCerrar}
        footer={
          <>
            <button className="btn btn-outline-secondary me-auto" onClick={() => setIndice(null)}>
              <i className="fa-solid fa-arrow-left me-2" />
              Volver
            </button>
            <button
              className="btn btn-outline-secondary"
              onClick={() => setIndice(indice - 1)}
              disabled={indice === 0}
              aria-label="Historia anterior"
            >
              <i className="fa-solid fa-chevron-left" />
            </button>
            <span className="small text-secondary">
              {indice + 1} de {historias.length}
            </span>
            <button
              className="btn btn-outline-secondary"
              onClick={() => setIndice(indice + 1)}
              disabled={indice === historias.length - 1}
              aria-label="Historia siguiente"
            >
              <i className="fa-solid fa-chevron-right" />
            </button>
          </>
        }
      >
        {/* Medida de lectura acotada: una línea de 120 caracteres cansa. */}
        <p className="fs-6 lh-lg mb-0" style={{ maxWidth: '62ch' }}>
          {historia.texto}
        </p>
      </Modal>
    )
  }

  return (
    <Modal
      titulo={puedeEditar ? 'Gestión de Información' : 'Información'}
      icono="fa-circle-info"
      descripcion="Quiénes somos y la historia de Corralejo."
      tamano="modal-lg"
      onClose={onCerrar}
      footer={
        <>
          {puedeEditar && (
            <button
              className="btn btn-outline-primary me-auto"
              onClick={() => setEditando(true)}
              disabled={cargando}
            >
              <i className="fa-solid fa-pen me-2" />
              Editar información
            </button>
          )}
          <button className="btn btn-primary" onClick={onCerrar}>
            Cerrar
          </button>
        </>
      }
    >
      <MensajeError texto={error} onReintentar={recargar} />
      {primeraCarga ? (
        <Cargando texto="Cargando información…" />
      ) : (
        <>
          <div className="row g-3 mb-4">
            {pilares.map(({ id, titulo, icono, texto }) => (
              <div className="col-12 col-md-6" key={id}>
                <section className="border rounded p-3 h-100">
                  <h3 className="h6 fw-bold text-uppercase mb-2">
                    <i className={`fa-solid ${icono} text-brand me-2`} />
                    {titulo}
                  </h3>
                  <p className="small text-secondary mb-0" style={{ whiteSpace: 'pre-line' }}>
                    {texto}
                  </p>
                </section>
              </div>
            ))}
          </div>

          <h3 className="h6 fw-bold text-uppercase mb-3">
            <i className="fa-solid fa-book-open text-brand me-2" />
            Narrativa creativa
          </h3>
          <div className="row row-cols-1 row-cols-sm-2 g-3">
            {historias.map((item, posicion) => (
              <div className="col" key={item.id ?? posicion}>
                <button
                  className="card card-clickable border-0 shadow-sm h-100 w-100 text-start p-3"
                  onClick={() => setIndice(posicion)}
                >
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className={`fa-solid ${item.icono} text-brand`} />
                    <strong className="small">{item.titulo}</strong>
                  </div>
                  <p className="text-secondary small recorte-2 mb-2">{item.resumen}</p>
                  <span className="mt-auto small fw-semibold text-brand">
                    Leer la historia
                    <i className="fa-solid fa-arrow-right ms-2" />
                  </span>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  )
}
