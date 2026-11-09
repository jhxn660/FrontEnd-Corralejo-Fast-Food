import { Component } from 'react'

/**
 * Límite de error alrededor del contenido de cada pantalla.
 *
 * POR QUÉ EXISTE
 * Sin él, una excepción durante el render desmonta TODO el árbol de React: la
 * pantalla se queda en blanco y también el menú y el header, así que no hay por
 * dónde salir y hay que recargar a mano. Es exactamente lo que pasaba al abrir
 * Gestión de Indicadores. El error de fondo se corrige donde esté, pero una
 * aplicación no debería quedarse sin salida por el fallo de una pantalla.
 *
 * `clave` es la ruta activa: cuando cambia, el límite se rearma. Sin eso, una
 * pantalla que falló deja el límite "pegado" y la siguiente navegación seguiría
 * mostrando el error aunque la nueva pantalla funcione.
 *
 * Es una clase porque getDerivedStateFromError y componentDidCatch no tienen
 * equivalente en hooks; es el único componente de clase del proyecto.
 */
export default class LimiteDeError extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidUpdate(propsPrevias) {
    if (propsPrevias.clave !== this.props.clave && this.state.error) {
      this.setState({ error: null })
    }
  }

  reintentar = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="card border-0 shadow-sm">
        <div className="card-body text-center py-5">
          <i className="fa-solid fa-triangle-exclamation fs-1 text-danger mb-3 d-block" />
          <h2 className="h5 fw-bold">Esta pantalla no se pudo mostrar</h2>
          <p className="text-secondary mb-4">
            El resto de la aplicación sigue funcionando: puedes volver con el menú lateral.
          </p>

          <div className="d-flex flex-wrap justify-content-center gap-2 mb-4">
            <button className="btn btn-primary" onClick={this.reintentar}>
              <i className="fa-solid fa-rotate me-2" />
              Reintentar
            </button>
            <button className="btn btn-outline-secondary" onClick={() => window.location.reload()}>
              Recargar la página
            </button>
          </div>

          {/* El detalle técnico va plegado: le sirve a quien desarrolla y no
              asusta a quien solo quiere seguir trabajando. */}
          <details className="text-start mx-auto" style={{ maxWidth: '38rem' }}>
            <summary className="small text-secondary">Detalle técnico</summary>
            <pre className="small bg-body-tertiary border rounded p-3 mt-2 mb-0 text-wrap">
              {error.message}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}
