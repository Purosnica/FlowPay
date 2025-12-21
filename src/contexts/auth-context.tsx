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
      // Usar apiClient para que envíe el token en el header si está disponible
      const { apiClient } = await import("@/lib/axios");
      
      const response = await apiClient.get<{
        success: boolean;
        usuario?: Usuario;
        token?: string;
        error?: string;
      }>("/api/auth/me");

      if (response.data.success && response.data.usuario) {
        setUsuario(response.data.usuario);
        // Guardar el token si viene en el response
        if (response.data.token) {
          setToken(response.data.token);
          setAuthToken(response.data.token);
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
        setUsuario(data.usuario);
        // Guardar el token para enviarlo en headers
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



