import { apiClient } from './client'

// Módulo `indicators` del backend (/indicators): meta anual de ventas (solo administración).
export const indicatorsApi = {
  /** Responde la sección sin envoltorio: { target, achieved, ... } */
  getGoal: (params) => apiClient.get('/indicators/goal', { params }),
  setGoal: (year, target) => apiClient.put(`/indicators/goal/${year}`, { target }),
}
