/**
 * CONTEXTO DE AUTENTICACIÓN
 *
 * Proporciona el estado de autenticación a toda la aplicación.
 * La sesión se maneja exclusivamente vía cookie HTTP-only.
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { csrfHeaders } from '@/lib/security/csrf';

interface Usuario {
  idusuario: number;
  nombre: string;
  email: string;
  idrol: number;
  rolCodigo?: string;
}

interface AuthContextType {
  usuario: Usuario | null;
  permisos: string[];
  loading: boolean;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    void checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
      });

      if (!response.ok) {
        setUsuario(null);
        setPermisos([]);
        return;
      }

      const data = (await response.json()) as {
        success: boolean;
        usuario?: Usuario;
        permisos?: string[];
      };

      if (data.success && data.usuario) {
        setUsuario(data.usuario);
        setPermisos(data.permisos ?? []);
      } else {
        setUsuario(null);
        setPermisos([]);
      }
    } catch {
      setUsuario(null);
      setPermisos([]);
    } finally {
      setLoading(false);
    }
  };

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        return {
          success: false,
          error:
            'El servidor no respondió correctamente. Recarga la página e intenta de nuevo.',
        };
      }

      const data = (await response.json()) as {
        success: boolean;
        usuario?: Usuario;
        permisos?: string[];
        error?: string;
      };

      if (data.success && data.usuario) {
        setPermisos(data.permisos ?? []);
        setUsuario(data.usuario);
        await checkAuth();
        return { success: true };
      }

      return {
        success: false,
        error: data.error || 'Error al iniciar sesión',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error al iniciar sesión';
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaders(),
      });
    } catch {
      // Continuar con logout local aunque falle el servidor
    } finally {
      setUsuario(null);
      setPermisos([]);
      router.push('/login');
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider
      value={{ usuario, permisos, loading, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
