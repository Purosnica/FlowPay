/**
 * PÁGINA DE LOGIN
 *
 * Interfaz Material Design (+ paso MFA si aplica).
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
  type MfaCodigoInput as MfaCodigoFormValues,
} from '@/lib/validators/auth';
import {
  guardarLoginEmailPrefs,
  leerLoginEmailPrefs,
} from '@/lib/ux/login-prefs';
import { LoginShell } from '@/components/auth/login-shell';
import { MfaCodigoInput } from '@/components/auth/mfa-codigo-input';
import { MaterialOutlinedField } from '@/components/auth/material-outlined-field';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EyeIcon, EyeOffIcon } from '@/assets/icons';

type LoginFormValues = LoginInput;

const mdFilledBtn =
  'h-11 rounded-full text-sm font-medium tracking-[0.02em] shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.985]';

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

  const mfaForm = useForm<MfaCodigoFormValues>({
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

  const onMfaSubmit = async (data: MfaCodigoFormValues) => {
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
        mfaForm.reset({ codigo: '' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar MFA');
      mfaForm.reset({ codigo: '' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="md-login-surface flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <LoginShell step={mfaStep ? 'mfa' : 'credentials'}>
      {mfaStep ? (
        <form
          onSubmit={mfaForm.handleSubmit(onMfaSubmit)}
          className="space-y-4"
          key="mfa"
        >
          {error ? (
            <Alert variant="danger" className="rounded-[12px]">
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
            className={`w-full ${mdFilledBtn}`}
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

          <Button
            type="button"
            variant="ghost"
            className="h-10 w-full rounded-full text-sm font-medium text-primary hover:bg-primary/10"
            onClick={() => {
              setMfaStep(false);
              setError(null);
              mfaForm.reset({ codigo: '' });
            }}
          >
            Volver
          </Button>
        </form>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3.5"
          key="credentials"
        >
          {error ? (
            <Alert variant="danger" className="rounded-[12px]">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <MaterialOutlinedField
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />

          <MaterialOutlinedField
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
            endAdornment={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="rounded-full p-2.5 text-[#49454F] transition-colors hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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

          <div className="flex items-center justify-between gap-3 px-1">
            <label className="flex cursor-pointer items-center gap-3 py-1 text-sm text-[#1C1B1F]">
              <span className="relative inline-flex h-5 w-5 items-center justify-center">
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="h-[18px] w-[18px] rounded-[2px] border-2 border-[#79747E] transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30" />
                <svg
                  className="pointer-events-none absolute h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M2 6.2 4.8 9 10 3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Recordar email
            </label>
          </div>

          <div className="relative py-0.5">
            <div className="absolute inset-x-0 top-1/2 h-px bg-[#E7E0EC]" />
            <span className="relative mx-auto flex w-fit bg-[#FFFBFE] px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#79747E]">
              Acceso
            </span>
          </div>

          <Button
            type="submit"
            className={`w-full ${mdFilledBtn}`}
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
