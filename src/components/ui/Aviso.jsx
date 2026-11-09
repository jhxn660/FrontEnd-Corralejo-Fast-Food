/**
 * Un aviso flotante. Lo pinta la pila de AvisosContext; no se usa suelto.
 *
 * El color no es decorativo: verde confirma, rojo informa de un borrado o de un
 * fallo, y el icono acompaña al color para que el mensaje no dependa solo de
 * distinguir tonos.
 */

const ESTILOS = {
  exito: { clase: 'alert-success', icono: 'fa-circle-check' },
  error: { clase: 'alert-danger', icono: 'fa-circle-exclamation' },
  informacion: { clase: 'alert-primary', icono: 'fa-circle-info' },
}

export default function Aviso({ tipo = 'exito', titulo, mensaje, duracion, saliendo, onCerrar }) {
  const { clase, icono } = ESTILOS[tipo] ?? ESTILOS.exito

  return (
    <div
      className={`aviso alert ${clase} p-0 mb-0 ${saliendo ? 'saliendo' : ''}`}
      role={tipo === 'error' ? 'alert' : 'status'}
      aria-live={tipo === 'error' ? 'assertive' : 'polite'}
    >
      <div className="d-flex gap-3 align-items-start p-3">
        <i className={`fa-solid ${icono} fs-5 mt-1 flex-shrink-0`} />
        <div className="flex-grow-1 min-width-0">
          <strong className="d-block">{titulo}</strong>
          {mensaje && <span className="small d-block">{mensaje}</span>}
        </div>
        <button
          type="button"
          className="btn-close flex-shrink-0"
          aria-label="Cerrar aviso"
          onClick={onCerrar}
        />
      </div>
      {/* La barra se agota a la vez que el temporizador: el aviso dice cuánto le
          queda en vez de desaparecer de golpe. */}
      {!saliendo && <div className="aviso-progreso" style={{ '--aviso-duracion': `${duracion}ms` }} />}
    </div>
  )
}
