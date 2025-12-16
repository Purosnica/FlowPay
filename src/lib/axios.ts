import axios from "axios";
import { env } from "@/lib/env";

// Instancia de axios configurada para la aplicación
export const apiClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 segundos
});

// Interceptor para requests
apiClient.interceptors.request.use(
  (config) => {
    // Aquí puedes agregar tokens de autenticación si es necesario
    // const token = getAuthToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para responses
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Manejo centralizado de errores
    if (error.response) {
      // El servidor respondió con un código de estado fuera del rango 2xx
      const message = error.response.data?.message || error.response.statusText;
      console.error("API Error:", message);
    } else if (error.request) {
      // La petición fue hecha pero no se recibió respuesta
      console.error("Network Error:", error.request);
    } else {
      // Algo pasó al configurar la petición
      console.error("Error:", error.message);
    }
    return Promise.reject(error);
  }
);






