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
import { useSessionIdle } from '@/hooks/use-session-idle';
import { SESSION_IDLE_SECONDS } from '@/lib/auth/session-ttl';
import { notificationToast } from '@/lib/notifications/notification-toast';

interface Usuario {
  idusuario: number;
  nombre: string;
  email: string;
  idrol: number;
  rolCodigo?: string;
}

type LoginResult =
  | { success: true; mfaRequired?: false; mfaSetupRequired?: boolean }
  | { success: true; mfaRequired: true }
  | { success: false; error?: string };

interface AuthContextType {
  usuario: Usuario | null;
  permisos: string[];
  mfaSetupRequired: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyMfa: (codigo: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [permisos, setPermisos] = useState<string[]>([]);
  const [mfaSetupRequired, setMfaSetupRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    void checkAuth();
  }, []);

  const checkAuth = async () => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
      });

      if (!response.ok) {
        setUsuario(null);
        setPermisos([]);
        setMfaSetupRequired(false);
        return;
      }

      const data = (await response.json()) as {
        success: boolean;
        usuario?: Usuario;
        permisos?: string[];
        mfaSetupRequired?: boolean;
      };

      if (data.success && data.usuario) {
        setUsuario(data.usuario);
        setPermisos(data.permisos ?? []);
        setMfaSetupRequired(Boolean(data.mfaSetupRequired));
      } else {
        setUsuario(null);
        setPermisos([]);
        setMfaSetupRequired(false);
      }
    } catch {
      setUsuario(null);
      setPermisos([]);
      setMfaSetupRequired(false);
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const login = async (
    email: string,
    password: string,
  ): Promise<LoginResult> => {
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
        mfaRequired?: boolean;
        mfaSetupRequired?: boolean;
        usuario?: Usuario;
        permisos?: string[];
        error?: string;
      };

      if (data.success && data.mfaRequired) {
        return { success: true, mfaRequired: true };
      }

      if (data.success && data.usuario) {
        setPermisos(data.permisos ?? []);
        setUsuario(data.usuario);
        setMfaSetupRequired(Boolean(data.mfaSetupRequired));
        await checkAuth();
        return {
          success: true,
          mfaSetupRequired: Boolean(data.mfaSetupRequired),
        };
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

  const verifyMfa = async (codigo: string): Promise<LoginResult> => {
    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ codigo }),
      });

      const data = (await response.json()) as {
        success: boolean;
        usuario?: Usuario;
        permisos?: string[];
        mfaSetupRequired?: boolean;
        error?: string;
      };

      if (data.success && data.usuario) {
        setPermisos(data.permisos ?? []);
        setUsuario(data.usuario);
        setMfaSetupRequired(Boolean(data.mfaSetupRequired));
        await checkAuth();
        return {
          success: true,
          mfaSetupRequired: Boolean(data.mfaSetupRequired),
        };
      }

      return {
        success: false,
        error: data.error || 'Código MFA inválido',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error al verificar MFA';
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
      const { limpiarClaveOutboxSesion } = await import(
        '@/lib/offline/outbox-crypto'
      );
      const { purgarGestionOutbox } = await import(
        '@/lib/offline/gestion-outbox'
      );
      const { purgarPagoOutbox } = await import('@/lib/offline/pago-outbox');
      limpiarClaveOutboxSesion();
      await Promise.all([purgarGestionOutbox(), purgarPagoOutbox()]);
      setUsuario(null);
      setPermisos([]);
      setMfaSetupRequired(false);
      router.push('/login');
    }
  };

  const refreshUser = async () => {
    await checkAuth();
  };

  useSessionIdle({
    enabled: Boolean(usuario) && !loading,
    idleSeconds: SESSION_IDLE_SECONDS,
    onIdle: () => {
      notificationToast.warning(
        'Cerramos tu sesión por inactividad.',
        'Sesión cerrada',
      );
      void logout();
    },
  });

  return (
    <AuthContext.Provider
      value={{
        usuario,
        permisos,
        mfaSetupRequired,
        loading,
        login,
        verifyMfa,
        logout,
        refreshUser,
      }}
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
