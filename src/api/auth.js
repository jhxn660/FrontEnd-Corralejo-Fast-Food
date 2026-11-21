import { apiClient, setToken, USER_STORAGE_KEY } from './client'

// De data se extraen el token (JWT) y el usuario y se guardan JUNTOS en el localStorage:
//   'token' → el JWT      'User' → { _id, name, email, role, ... }
// Se usa en login y en renewToken, así las dos claves nunca quedan desincronizadas.
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

  register: (payload) => {
    return apiClient.post('/auth/register', payload)
  },

  renewToken: async () => {
    const response = await apiClient.get('/auth/renew-token')
    guardarSesion(response)
    return response
  },
}
