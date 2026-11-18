import axios from "axios";

// URL del backend (.env o local)
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

// Clave del token en localStorage
export const TOKEN_STORAGE_KEY = "token";

// Lee el token guardado
export function getToken(){
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

// Guarda el token, o lo borra si es null
export function setToken(token){
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

// Borra el token
export function clearToken(){
  setToken(null);
}

// Acción a ejecutar si la sesión expira (la registra AuthContext)
let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// Instancia de Axios para toda la API
export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Agrega el token a cada petición
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.set("X-Token", token);
  }
  return config;
});

// Si responde 401: borra el token y cierra sesión
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

// Convierte una ruta de imagen en URL completa
export function getImageUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
}