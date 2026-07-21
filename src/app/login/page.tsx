/**
 * PÁGINA DE LOGIN
 *
 * Interfaz de inicio de sesión (+ paso MFA si aplica).
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  loginSchema,
  mfaCodigoSchema,
  type LoginInput,
  type MfaCodigoInput,
} from '@/lib/validators/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

type LoginFormValues = LoginInput;

export default function LoginPage() {
  const router = useRouter();
  const { usuario, loading: authLoading, login, verifyMfa } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mfaStep, setMfaStep] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const mfaForm = useForm<MfaCodigoInput>({
    resolver: zodResolver(mfaCodigoSchema),
    defaultValues: { codigo: '' },
  });

  useEffect(() => {
    if (!authLoading && usuario) {
      router.push('/dashboard');
    }
  }, [usuario, authLoading, router]);

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(data.email, data.password);
      if (result.success && 'mfaRequired' in result && result.mfaRequired) {
        setMfaStep(true);
        return;
      }
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(
          'error' in result
            ? result.error || 'Error al iniciar sesión'
            : 'Error al iniciar sesión',
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onMfaSubmit = async (data: MfaCodigoInput) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await verifyMfa(data.codigo);
      if (result.success && !('mfaRequired' in result && result.mfaRequired)) {
        router.push('/dashboard');
      } else {
        setError(
          'error' in result
            ? result.error || 'Código MFA inválido'
            : 'Código MFA inválido',
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar MFA');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-dark-2">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-dark-2 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center text-2xl font-bold">
            FlowPay
          </CardTitle>
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            {mfaStep
              ? 'Ingrese el código de su app de autenticación'
              : 'Sistema de Préstamos y Cobranza'}
          </p>
        </CardHeader>
        <CardContent>
          {mfaStep ? (
            <form
              onSubmit={mfaForm.handleSubmit(onMfaSubmit)}
              className="space-y-4"
            >
              {error ? (
                <Alert variant="danger">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <Input
                label="Código MFA"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                {...mfaForm.register('codigo')}
                error={mfaForm.formState.errors.codigo?.message}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Verificando...' : 'Verificar'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setMfaStep(false);
                  setError(null);
                }}
              >
                Volver
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error ? (
                <Alert variant="danger">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Input
                label="Email"
                type="email"
                placeholder="tu@email.com"
                {...register('email')}
                error={errors.email?.message}
                autoComplete="email"
              />

              <Input
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                error={errors.password?.message}
                autoComplete="current-password"
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner
                      size="sm"
                      className="mr-2 border-white border-t-white"
                    />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
