/**
 * Shell Material Design 3 con atmósfera FlowPay.
 */

import type { ReactNode } from 'react';
import Image from 'next/image';
import { FlowPayLogo } from '@/components/brand/flowpay-logo';
import { cn } from '@/lib/utils';

type LoginShellStep = 'credentials' | 'mfa';

type LoginShellProps = {
  step: LoginShellStep;
  children: ReactNode;
};

const COPY: Record<
  LoginShellStep,
  { title: string; subtitle: string; chip: string }
> = {
  credentials: {
    title: 'Iniciar sesión',
    subtitle:
      'Entra al flujo operativo de cobranza: cartera, gestiones y seguimiento en un solo lugar.',
    chip: 'Acceso seguro',
  },
  mfa: {
    title: 'Verificación en 2 pasos',
    subtitle:
      'Confirma tu identidad con el código de 6 dígitos de tu app de autenticación.',
    chip: 'Paso 2 de 2',
  },
};

export function LoginShell({ step, children }: LoginShellProps) {
  const copy = COPY[step];
  const isMfa = step === 'mfa';

  return (
    <div className="md-login-surface relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="md-login-glow md-login-glow--a" />
        <div className="md-login-glow md-login-glow--b" />
        <svg
          className="md-login-flow absolute inset-x-0 bottom-0 h-[42%] w-full opacity-[0.55]"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            className="md-login-flow-path"
            fill="none"
            stroke="rgba(87, 80, 241, 0.22)"
            strokeWidth="2"
            d="M0,220 C240,160 360,280 720,200 C1080,120 1200,240 1440,180"
          />
          <path
            className="md-login-flow-path md-login-flow-path--delayed"
            fill="none"
            stroke="rgba(87, 80, 241, 0.12)"
            strokeWidth="3"
            d="M0,260 C280,200 480,300 760,230 C1040,160 1240,250 1440,210"
          />
        </svg>
        <Image
          src="/images/logo/logo-icon.svg"
          alt=""
          width={220}
          height={220}
          className="md-login-mark absolute -right-8 top-16 opacity-[0.07] sm:right-10 sm:top-20"
        />
      </div>

      <div
        key={step}
        className="md-login-card relative z-10 w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-300"
      >
        <div className="md-login-card-accent" aria-hidden />

        <div className="relative mb-7 flex flex-col items-center text-center">
          <div className="md-login-logo-halo mb-5 inline-flex rounded-full p-3">
            <FlowPayLogo size="md" className="justify-center" />
          </div>

          <span
            className={cn(
              'mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1',
              'bg-primary/10 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary',
              'animate-in fade-in slide-in-from-top-1 duration-500',
            )}
          >
            <span className="md-login-chip-dot h-1.5 w-1.5 rounded-full bg-primary" />
            {copy.chip}
          </span>

          <h1 className="font-display text-[1.85rem] font-medium leading-tight tracking-tight text-dark animate-in fade-in slide-in-from-bottom-2 duration-500">
            {copy.title}
          </h1>
          <p className="mt-2.5 max-w-[34ch] text-sm leading-relaxed text-[#49454F] animate-in fade-in duration-700">
            {copy.subtitle}
          </p>

          <div
            className="mt-5 flex w-full max-w-[200px] items-center gap-2"
            aria-hidden
          >
            <span
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-300',
                'bg-primary',
              )}
            />
            <span
              className={cn(
                'h-1 flex-1 rounded-full transition-colors duration-300',
                isMfa ? 'bg-primary' : 'bg-primary/20',
              )}
            />
          </div>
        </div>

        <div className="relative animate-in fade-in slide-in-from-bottom-3 duration-500 delay-75">
          {children}
        </div>

        <p className="mt-8 text-center text-[11px] leading-4 tracking-wide text-[#79747E]">
          FlowPay · Sesión cifrada · Uso autorizado
        </p>
      </div>
    </div>
  );
}
