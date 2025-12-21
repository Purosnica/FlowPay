/**
 * CONTEXTO DE AUTENTICACIÓN
 * 
 * Proporciona el estado de autenticación a toda la aplicación
 */

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setAuthToken } from "@/lib/axios";

interface Usuario {
  idusuario: number;
  nombre: string;
  email: string;
  idrol: number;
}

interface AuthContextType {
  usuario: Usuario | null;
  loading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Verificar si hay un usuario autenticado al cargar
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Preparar headers con token si está disponible
      // Esto asegura que funcione incluso si la cookie aún no está disponible
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      // Si tenemos token en memoria, enviarlo en el header Authorization
      // Esto asegura que funcione inmediatamente después del login
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      // Usar fetch directamente para peticiones a rutas API internas
      // Esto asegura que las cookies HTTP-only se envíen automáticamente
      // sin necesidad de tener el token en memoria
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        headers,
      });

      if (!response.ok) {
        // Si la respuesta no es OK, el usuario no está autenticado
        // Esto es normal cuando no hay sesión activa, no es un error
        setUsuario(null);
        setToken(null);
        setAuthToken(null);
        return;
      }

      const data = (await response.json()) as {
        success: boolean;
        usuario?: Usuario;
        token?: string;
        error?: string;
      };

      if (data.success && data.usuario) {
        setUsuario(data.usuario);
        // Guardar el token si viene en el response
        if (data.token) {
          setToken(data.token);
          setAuthToken(data.token);
        }
      } else {
        setUsuario(null);
        setToken(null);
        setAuthToken(null);
      }
    } catch (error) {
      // Error silencioso - el usuario simplemente no está autenticado
      setUsuario(null);
      setToken(null);
      setAuthToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success && data.usuario) {
        // Guardar el token primero para que esté disponible inmediatamente
        if (data.token) {
          setToken(data.token);
          setAuthToken(data.token);
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.log("[Auth] Token guardado después del login");
          }
        } else {
          if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.warn("[Auth] Login exitoso pero no se recibió token en la respuesta");
          }
        }
        
        // Establecer usuario
        setUsuario(data.usuario);
        
        // Verificar autenticación después del login usando el token recién obtenido
        // Esto valida que la cookie se estableció correctamente y sincroniza el estado
        if (data.token) {
          // Usar el token directamente de la respuesta en lugar del estado
          const headers: HeadersInit = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.token}`,
          };
          
          const verifyResponse = await fetch("/api/auth/me", {
            method: "GET",
            credentials: "include",
            headers,
          });
          
          if (verifyResponse.ok) {
            const verifyData = (await verifyResponse.json()) as {
              success: boolean;
              usuario?: Usuario;
              token?: string;
            };
            
            if (verifyData.success && verifyData.usuario) {
              // Actualizar con datos verificados
              setUsuario(verifyData.usuario);
              if (verifyData.token) {
                setToken(verifyData.token);
                setAuthToken(verifyData.token);
              }
            }
          }
        }
        
        return { success: true };
      } else {
        setToken(null);
        setAuthToken(null);
        return { success: false, error: data.error || "Error al iniciar sesión" };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al iniciar sesión";
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Error silencioso - continuar con el logout de todas formas
    } finally {
      setUsuario(null);
      setToken(null);
      setAuthToken(null);
      router.push("/login");
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider value={{ usuario, loading, token, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}



