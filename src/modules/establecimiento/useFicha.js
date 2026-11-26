import { useRecurso } from '../../hooks/useRecurso'

import { establecimientoApi } from './api'

/**
 * La ficha del local (módulo `establecimiento` del backend: /ubicaciones + /horarios),
 * sincronizada entre roles: lo que guarda el administrador —dirección, teléfono (que es
 * también el WhatsApp), referencias y horario— aparece en la portada, la carta y el ticket
 * sin recargar.
 */
export const useFicha = () => useRecurso(establecimientoApi.ficha, null)
