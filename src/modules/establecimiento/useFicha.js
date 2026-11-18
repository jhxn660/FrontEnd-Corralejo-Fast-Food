import { useRecurso } from '../../hooks/useRecurso'
import { establecimientoApi } from './api'

/**
 * La ficha del local (colección `establecimiento` de json-server), sincronizada
 * entre roles: lo que guarda el administrador —dirección, teléfono, WhatsApp,
 * horario— aparece en la portada, la carta y el ticket sin recargar.
 */
export const useFicha = () => useRecurso(establecimientoApi.ficha, null)
