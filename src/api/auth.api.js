import { apiClient, setToken, USER_STORAGE_KEY } from './client'

// Módulo `auth` del backend (/auth).
// login y renewToken guardan JUNTOS en localStorage 'token' (el JWT) y 'User' (datos del usuario).
const guardarSesion = (response) => {
  setToken(response.data.token)
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data.data))
}

export const authApi = {
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials)
    guardarSesion(response)
    return response
  },

  /** payload: { name, email, password, phone? } (lo arma Register.jsx) */
  register: (payload) => apiClient.post('/auth/register', payload),

  renewToken: async () => {
    const response = await apiClient.get('/auth/renew-token')
    guardarSesion(response)
    return response
  },
}
