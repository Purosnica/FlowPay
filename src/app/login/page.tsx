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
import {
  guardarLoginEmailPrefs,
  leerLoginEmailPrefs,
} from '@/lib/ux/login-prefs';
import { LoginShell } from '@/components/auth/login-shell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EyeIcon, EyeOffIcon, PasswordIcon } from '@/assets/icons';

type LoginFormValues = LoginInput;

export default function LoginPage() {
  const router = useRouter();
  const { usuario, loading: authLoading, login, verifyMfa, mfaSetupRequired } =
    useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mfaStep, setMfaStep] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);

  const destinoPostLogin = (setupRequired?: boolean): string =>
    setupRequired ? '/perfil?mfa=required' : '/dashboard';

  const {
    register,
    handleSubmit,
    setValue,
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
    const prefs = leerLoginEmailPrefs();
    setRememberEmail(prefs.remember);
    if (prefs.remember && prefs.email) {
      setValue('email', prefs.email);
    }
  }, [setValue]);

  useEffect(() => {
    if (!authLoading && usuario) {
      router.push(destinoPostLogin(mfaSetupRequired));
    }
  }, [usuario, authLoading, router, mfaSetupRequired]);

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    setIsSubmitting(true);
    guardarLoginEmailPrefs(rememberEmail, data.email);

    try {
      const result = await login(data.email, data.password);
      if (result.success && 'mfaRequired' in result && result.mfaRequired) {
        setMfaStep(true);
        mfaForm.reset({ codigo: '' });
        return;
      }
      if (result.success) {
        const setup =
          'mfaSetupRequired' in result ? result.mfaSetupRequired : false;
        router.push(destinoPostLogin(setup));
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
        const setup =
          'mfaSetupRequired' in result ? result.mfaSetupRequired : false;
        router.push(destinoPostLogin(setup));
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
      <div className="flex min-h-screen items-center justify-center bg-gray-2 dark:bg-[#020D1A]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <LoginShell step={mfaStep ? 'mfa' : 'credentials'}>
      {mfaStep ? (
        <form
          onSubmit={mfaForm.handleSubmit(onMfaSubmit)}
          className="space-y-5 animate-in fade-in zoom-in-95 duration-300"
          key="mfa"
        >
          <div className="space-y-2 text-center sm:text-left">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary sm:mx-0">
              <PasswordIcon className="h-5 w-5" />
            </div>
            <h2 className="font-display text-2xl font-bold text-dark dark:text-white">
              Código de verificación
            </h2>
            <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              Abre tu app de autenticación e ingresa el código de 6 dígitos.
            </p>
          </div>

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
            placeholder="000000"
            className="text-center font-display text-2xl tracking-[0.45em] py-3"
            {...mfaForm.register('codigo', {
              onChange: (event) => {
                const digits = event.target.value
                  .replace(/\D/g, '')
                  .slice(0, 6);
                event.target.value = digits;
              },
            })}
            error={mfaForm.formState.errors.codigo?.message}
          />

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner
                  size="sm"
                  className="mr-2 border-white border-t-white"
                />
                Verificando...
              </>
            ) : (
              'Verificar código'
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              setMfaStep(false);
              setError(null);
              mfaForm.reset({ codigo: '' });
            }}
          >
            Volver al inicio de sesión
          </Button>
        </form>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 animate-in fade-in duration-300"
          key="credentials"
        >
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl font-bold text-dark dark:text-white">
              Iniciar sesión
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ingresa tus credenciales para continuar.
            </p>
          </div>

          {error ? (
            <Alert variant="danger">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Input
            label="Email"
            type="email"
            placeholder="tu@email.com"
            className="py-2.5"
            {...register('email')}
            error={errors.email?.message}
            autoComplete="email"
          />

          <Input
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            className="py-2.5"
            {...register('password')}
            error={errors.password?.message}
            autoComplete="current-password"
            endAdornment={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="rounded p-1 text-gray-500 hover:text-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-gray-400 dark:hover:text-white"
                aria-label={
                  showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                }
              >
                {showPassword ? (
                  <EyeOffIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </button>
            }
          />

          <label className="flex items-center gap-2 text-sm text-dark dark:text-white">
            <input
              type="checkbox"
              checked={rememberEmail}
              onChange={(e) => setRememberEmail(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
            />
            Recordar email
          </label>

          <Button
            type="submit"
            size="lg"
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
              'Entrar'
            )}
          </Button>
        </form>
      )}
    </LoginShell>
  );
}
