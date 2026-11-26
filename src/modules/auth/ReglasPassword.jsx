import { REGLAS_PASSWORD } from './validaciones'

/**
 * Lista en vivo de los requisitos de la contraseña (RNF-15). Se muestran
 * siempre, no solo al fallar: decirle al usuario lo que se espera antes de
 * escribir evita el ciclo de escribir, enviar y ser rechazado.
 */
export default function ReglasPassword({ password }) {
  return (
    <ul className="list-unstyled mb-0 mt-1" aria-live="polite">
      {REGLAS_PASSWORD.map(({ id, texto, prueba }) => {
        const cumple = prueba.test(password ?? '')
        return (
          <li key={id} className={cumple ? 'text-success' : 'text-secondary'}>
            <i className={`fa-solid ${cumple ? 'fa-circle-check' : 'fa-circle'} me-2 small`} />
            {texto}
          </li>
        )
      })}
    </ul>
  )
}
