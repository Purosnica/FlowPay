'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { csrfHeaders } from '@/lib/security/csrf';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';

type MfaStatus = {
  enabled: boolean;
  enabledAt: string | null;
  canManage: boolean;
};

export function MfaSetupPanel() {
  const { refreshUser, mfaSetupRequired } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const forzarSetup =
    mfaSetupRequired ||
    (searchParams.get('mfa') === 'required' &&
      status !== null &&
      !status.enabled);

  const loadStatus = useCallback(async () => {
    const res = await fetch('/api/auth/mfa/status', {
      credentials: 'include',
    });
    if (!res.ok) {
      return;
    }
    const data = (await res.json()) as {
      success: boolean;
      enabled?: boolean;
      enabledAt?: string | null;
      canManage?: boolean;
    };
    if (data.success) {
      setStatus({
        enabled: Boolean(data.enabled),
        enabledAt: data.enabledAt ?? null,
        canManage: Boolean(data.canManage),
      });
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  if (!status?.canManage) {
    return null;
  }

  const iniciarSetup = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
      });
      const data = (await res.json()) as {
        success: boolean;
        secret?: string;
        otpauthUrl?: string;
        error?: string;
      };
      if (!data.success || !data.secret) {
        setError(data.error || 'No se pudo iniciar MFA');
        return;
      }
      setSecret(data.secret);
      setOtpauthUrl(data.otpauthUrl ?? null);
    } catch {
      setError('Error de red al iniciar MFA');
    } finally {
      setLoading(false);
    }
  };

  const confirmar = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/enable', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        body: JSON.stringify({ codigo }),
      });
      const data = (await res.json()) as {
        success: boolean;
        error?: string;
      };
      if (!data.success) {
        setError(data.error || 'Código inválido');
        return;
      }
      setSecret(null);
      setOtpauthUrl(null);
      setCodigo('');
      setSuccess('MFA activado correctamente.');
      await loadStatus();
      await refreshUser();
      router.replace('/dashboard');
    } catch {
      setError('Error de red al activar MFA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 rounded-lg border border-stroke p-6 dark:border-dark-3">
      <h2 className="text-lg font-semibold text-dark dark:text-white">
        Autenticación en dos pasos (MFA)
      </h2>
      <p className="mt-1 text-sm text-gray-6 dark:text-dark-6">
        Disponible para ADMIN y GERENTE. Use una app tipo Google Authenticator
        o Authy.
      </p>

      {forzarSetup && !status.enabled ? (
        <Alert variant="danger" className="mt-4">
          <AlertDescription>
            MFA es obligatorio para su rol. Active autenticación en dos pasos
            para continuar usando FlowPay.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="danger" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {success ? (
        <Alert className="mt-4">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}

      <p className="mt-4 text-sm text-dark dark:text-white">
        Estado:{' '}
        <strong>{status.enabled ? 'Activo' : 'Inactivo'}</strong>
        {status.enabledAt
          ? ` (desde ${new Date(status.enabledAt).toLocaleString()})`
          : ''}
      </p>

      {!status.enabled && !secret ? (
        <Button
          type="button"
          className="mt-4"
          disabled={loading}
          onClick={() => void iniciarSetup()}
        >
          Configurar MFA
        </Button>
      ) : null}

      {secret ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-gray-6 dark:text-dark-6">
            Escanee o copie el secreto en su app de autenticación, luego
            confirme con un código de 6 dígitos.
          </p>
          <p className="break-all rounded bg-gray-50 p-3 font-mono text-sm dark:bg-dark-2">
            {secret}
          </p>
          {otpauthUrl ? (
            <a
              href={otpauthUrl}
              className="text-sm text-primary underline"
            >
              Abrir en app de autenticación
            </a>
          ) : null}
          <Input
            label="Código de verificación"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
          />
          <Button
            type="button"
            disabled={loading || codigo.length !== 6}
            onClick={() => void confirmar()}
          >
            Activar MFA
          </Button>
        </div>
      ) : null}

      {status.enabled ? (
        <p className="mt-4 text-sm text-gray-6 dark:text-dark-6">
          MFA obligatorio para ADMIN/GERENTE: no se puede desactivar.
        </p>
      ) : null}
    </div>
  );
}
