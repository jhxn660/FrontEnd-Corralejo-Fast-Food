import { useCallback, useState } from 'react'

import { api } from '../../services/api'
import { useRecurso } from '../../hooks/useRecurso'
import { fechaCorta } from '../../utils/format'
import { TIPOS, COLOR_ESTADO, iconoDe, pqrsVacia } from './esquema'
import Modal from '../../components/ui/Modal'
import EncabezadoPagina from '../../components/ui/EncabezadoPagina'
import { Cargando, Error, Vacio } from '../../components/ui/Estado'
import ConfirmarEliminacion from '../../components/ui/ConfirmarEliminacion'
import { useConfirmacion } from '../../hooks/useConfirmacion'
import PieContacto from '../establecimiento/PieContacto'
import { useAuth } from '../../context/AuthContext'

export default function ClientePqrs() {
  // La sesión se toma del contexto: ningún componente la consulta por su cuenta (R5, R8).
  const { usuario } = useAuth()

  const cargar = useCallback(() => api.list('pqrs'), [])
  const { datos: todas, cargando, error, setError, recargar } = useRecurso(cargar, [])

  const [modal, setModal] = useState(null) // { form, soloLectura }
  const [enviando, setEnviando] = useState(false)

  // El cliente solo ve sus propias solicitudes, de la más reciente a la más antigua.
  const mias = todas
    .filter((p) => !usuario || p.usuario === usuario.email)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

  const abrir = (form, soloLectura = false) => setModal({ form, soloLectura })
  const cerrar = () => setModal(null)
  const actualizar = (campo) => (e) =>
    setModal({ ...modal, form: { ...modal.form, [campo]: e.target.value } })

  const enviar = async (e) => {
    e.preventDefault()
    const { form } = modal
    setEnviando(true)
    setError('')

    try {
      const payload = {
        ...form,
        asunto: form.asunto.trim(),
        texto: form.texto.trim(),
        nombre: form.nombre?.trim() || usuario?.email || 'Cliente',
        usuario: usuario?.email ?? null,
        fecha: form.fecha ?? new Date().toISOString(),
      }

      if (form.id) await api.update('pqrs', form.id, payload)
      else await api.create('pqrs', payload)

      cerrar()
      recargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  // RNF-01: el modal muestra el asunto, para no borrar la solicitud equivocada.
  const eliminacion = useConfirmacion((solicitud) => api.remove('pqrs', solicitud.id), {
    alTerminar: recargar,
  })

  return (
    <>
      <EncabezadoPagina
        titulo="PQRS"
        descripcion="Envía peticiones, quejas, reclamos y sugerencias; aquí mismo puedes consultarlas."
      />

      <Error texto={error} onReintentar={recargar} />

      <div className="row g-3 mb-4">
        {Object.entries(TIPOS).map(([tipo, icono]) => (
          <div className="col-6 col-lg-3" key={tipo}>
            <button
              className="card card-clickable border-0 shadow-sm w-100 h-100 text-center p-3"
              onClick={() => abrir(pqrsVacia(tipo))}
            >
              <i className={`fa-solid ${icono} fs-2 text-brand mb-2`} />
              <span className="fw-semibold">{tipo}</span>
            </button>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white">
          <h2 className="h6 fw-bold mb-0">Mis solicitudes</h2>
        </div>

        {cargando && <Cargando texto="Cargando solicitudes…" />}
        {!cargando && mias.length === 0 && (
          <Vacio texto="Aún no has enviado ninguna PQRS." icono="fa-inbox" />
        )}

        {!cargando && mias.length > 0 && (
          <ul className="list-group list-group-flush">
            {mias.map((registro) => (
              <li
                className="list-group-item d-flex flex-wrap align-items-center gap-3"
                key={registro.id}
              >
                <i className={`fa-solid ${iconoDe(registro.tipo)} text-brand fs-5`} />
                <div className="flex-grow-1 min-width-0">
                  <p className="mb-0 fw-semibold text-truncate">
                    {registro.tipo}: {registro.asunto}
                  </p>
                  <small className="text-secondary">{fechaCorta(registro.fecha)}</small>
                </div>
                <span className={`badge bg-${COLOR_ESTADO[registro.estado] ?? 'secondary'}`}>
                  {registro.estado}
                </span>
                <div className="btn-group btn-group-sm">
                  <button
                    className="btn btn-outline-secondary"
                    title="Ver"
                    onClick={() => abrir(registro, true)}
                  >
                    <i className="fa-solid fa-eye" />
                  </button>
                  <button
                    className="btn btn-outline-primary"
                    title="Editar"
                    onClick={() => abrir(registro)}
                  >
                    <i className="fa-solid fa-pen" />
                  </button>
                  <button
                    className="btn btn-outline-danger"
                    title="Eliminar"
                    onClick={() => eliminacion.pedir(registro)}
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <PieContacto />

      {modal && (
        <Modal
          titulo={`${modal.soloLectura ? '' : modal.form.id ? 'Editar ' : 'Nueva '}${modal.form.tipo}`}
          icono={iconoDe(modal.form.tipo)}
          onClose={cerrar}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={cerrar}>
                {modal.soloLectura ? 'Cerrar' : 'Cancelar'}
              </button>
              {!modal.soloLectura && (
                <button className="btn btn-primary" form="form-pqrs" type="submit" disabled={enviando}>
                  {enviando ? 'Enviando…' : 'Enviar'}
                </button>
              )}
            </>
          }
        >
          <form id="form-pqrs" onSubmit={enviar} className="d-grid gap-3">
            <div>
              <label className="form-label">Asunto</label>
              <input
                className="form-control"
                placeholder="Escribe un breve asunto"
                value={modal.form.asunto}
                onChange={actualizar('asunto')}
                readOnly={modal.soloLectura}
                required
              />
            </div>
            <div>
              <label className="form-label">Descripción</label>
              <textarea
                className="form-control"
                rows="4"
                placeholder="Cuéntanos los detalles…"
                value={modal.form.texto}
                onChange={actualizar('texto')}
                readOnly={modal.soloLectura}
                required
              />
            </div>
          </form>
        </Modal>
      )}

      {eliminacion.objetivo && (
        <ConfirmarEliminacion
          entidad="la solicitud"
          nombre={eliminacion.objetivo.asunto}
          consecuencias={['Perderás el seguimiento de su respuesta.']}
          enviando={eliminacion.enviando}
          error={eliminacion.error}
          onConfirmar={eliminacion.confirmar}
          onCancelar={eliminacion.cancelar}
        />
      )}
    </>
  )
}
