/**
 * Shell visual del login: panel de marca + columna del formulario.
 */

import type { ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type LoginShellStep = 'credentials' | 'mfa';

type LoginShellProps = {
  step: LoginShellStep;
  children: ReactNode;
};

const BRAND_COPY: Record<
  LoginShellStep,
  { headline: string; support: string }
> = {
  credentials: {
    headline: 'Operación de cobranza con flujo claro',
    support:
      'Accede al panel para gestionar cartera, gestiones y seguimiento en un solo lugar.',
  },
  mfa: {
    headline: 'Verificación en dos pasos',
    support:
      'Ingresa el código de tu app de autenticación para proteger el acceso a tu cuenta.',
  },
};

export function LoginShell({ step, children }: LoginShellProps) {
  const copy = BRAND_COPY[step];

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-gray-2 dark:bg-[#020D1A]">
      <aside
        className={cn(
          'relative hidden w-[46%] flex-col justify-between overflow-hidden',
          'bg-[#07111f] px-10 py-12 text-white lg:flex xl:px-14',
          'animate-in fade-in slide-in-from-left-4 duration-700',
        )}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="login-grid absolute inset-0 opacity-[0.35]" />
          <div className="login-orb absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/35 blur-3xl" />
          <div className="login-orb-delayed absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#020D1A] to-transparent" />
        </div>

        <div className="relative z-10">
          <Image
            src="/images/logo/logo.svg"
            alt="FlowPay"
            width={168}
            height={40}
            priority
            className="h-9 w-auto"
          />
        </div>

        <div className="relative z-10 max-w-md space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/90">
            FlowPay
          </p>
          <h1
            key={step}
            className="font-display text-3xl font-bold leading-tight text-white xl:text-4xl animate-in fade-in slide-in-from-bottom-2 duration-500"
          >
            {copy.headline}
          </h1>
          <p
            key={`${step}-support`}
            className="text-base leading-relaxed text-white/65 animate-in fade-in duration-700"
          >
            {copy.support}
          </p>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          Sesión protegida · Acceso autorizado
        </p>
      </aside>

      <main className="relative flex flex-1 flex-col justify-center px-4 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto mb-8 flex w-full max-w-[26rem] items-center gap-3 lg:hidden animate-in fade-in duration-500">
          <Image
            src="/images/logo/logo-icon.svg"
            alt=""
            width={36}
            height={36}
            priority
            className="h-9 w-9"
          />
          <span className="font-display text-xl font-bold text-dark dark:text-white">
            FlowPay
          </span>
        </div>

        <div
          className={cn(
            'mx-auto w-full max-w-[26rem]',
            'rounded-2xl border border-stroke/80 bg-white p-6 shadow-2',
            'dark:border-dark-3 dark:bg-gray-dark sm:p-8',
            'animate-in fade-in slide-in-from-bottom-3 duration-600',
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
