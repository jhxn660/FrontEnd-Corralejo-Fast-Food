import { apiClient } from "./client";

export const authApi = {
  login: async (credentials) => {
      const response = await apiClient.post("/auth/login", credentials)
      const token = response.data.token;
      localStorage.setItem( 'token', token );
      console.log(response)
      localStorage.setItem( 'User', JSON.stringify(response.data.data));

      // de data extraer el token y ponerlo en el localStorage

      return response;
      
  },
  register: async (payload) => {
      const response = await apiClient.post("/auth/register", payload)
      const token = response.data.token;
      localStorage.setItem( 'token', token);
      console.log(response)
      localStorage.setItem( 'User', JSON.stringify(response.data.data));

     return response; 
  },

  renewToken: () => {   
     return apiClient.get("/auth/renew-token")
    }
};