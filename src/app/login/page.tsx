/**
 * PÁGINA DE LOGIN
 *
 * Interfaz de inicio de sesión (+ paso MFA si aplica).
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useForm, Controller } from 'react-hook-form';
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
import { MfaCodigoInput } from '@/components/auth/mfa-codigo-input';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EyeIcon, EyeOffIcon } from '@/assets/icons';

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
      <div className="flex min-h-screen items-center justify-center bg-[#f3f5f9]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <LoginShell step={mfaStep ? 'mfa' : 'credentials'}>
      {mfaStep ? (
        <form
          onSubmit={mfaForm.handleSubmit(onMfaSubmit)}
          className="space-y-6"
          key="mfa"
        >
          {error ? (
            <Alert variant="danger">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Controller
            name="codigo"
            control={mfaForm.control}
            render={({ field, fieldState }) => (
              <MfaCodigoInput
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message ?? undefined}
                disabled={isSubmitting}
              />
            )}
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
              'Verificar'
            )}
          </Button>

          <button
            type="button"
            className="w-full text-sm font-medium text-[#5b6472] transition-colors hover:text-dark"
            onClick={() => {
              setMfaStep(false);
              setError(null);
              mfaForm.reset({ codigo: '' });
            }}
          >
            ← Volver
          </button>
        </form>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5"
          key="credentials"
        >
          {error ? (
            <Alert variant="danger">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <Input
            label="Email"
            type="email"
            placeholder="tu@empresa.com"
            className="h-11 rounded-xl bg-white py-2.5"
            {...register('email')}
            error={errors.email?.message}
            autoComplete="email"
          />

          <Input
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            placeholder="Tu contraseña"
            className="h-11 rounded-xl bg-white py-2.5"
            {...register('password')}
            error={errors.password?.message}
            autoComplete="current-password"
            endAdornment={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="rounded-md p-1.5 text-[#5b6472] transition-colors hover:text-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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

          <label className="flex items-center gap-2.5 text-sm text-[#3d4550]">
            <input
              type="checkbox"
              checked={rememberEmail}
              onChange={(e) => setRememberEmail(e.target.checked)}
              className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary/30"
            />
            Recordar email
          </label>

          <Button
            type="submit"
            size="lg"
            className="mt-1 w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner
                  size="sm"
                  className="mr-2 border-white border-t-white"
                />
                Entrando...
              </>
            ) : (
              'Continuar'
            )}
          </Button>
        </form>
      )}
    </LoginShell>
  );
}
