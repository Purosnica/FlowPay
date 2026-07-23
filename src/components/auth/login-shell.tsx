/**
 * Shell del login: una sola composición con marca hero + formulario.
 */

import type { ReactNode } from 'react';
import { FlowPayLogo } from '@/components/brand/flowpay-logo';

type LoginShellStep = 'credentials' | 'mfa';

type LoginShellProps = {
  step: LoginShellStep;
  children: ReactNode;
};

const COPY: Record<LoginShellStep, { title: string; subtitle: string }> = {
  credentials: {
    title: 'Bienvenido',
    subtitle: 'Ingresa para continuar con tu operación de cobranza.',
  },
  mfa: {
    title: 'Verificación',
    subtitle: 'Introduce el código de 6 dígitos de tu app de autenticación.',
  },
};

export function LoginShell({ step, children }: LoginShellProps) {
  const copy = COPY[step];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f3f5f9]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="login-wash absolute inset-0" />
        <div className="login-beam absolute -left-1/4 top-0 h-[70%] w-[70%] rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="login-beam-delayed absolute -right-1/4 bottom-0 h-[55%] w-[55%] rounded-full bg-[#111928]/[0.04] blur-3xl" />
        <div className="login-grain absolute inset-0 opacity-[0.35]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[420px] flex-col justify-center px-5 py-12 sm:px-6">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <FlowPayLogo size="lg" className="mb-10" />
        </div>

        <div
          key={step}
          className="mb-8 animate-in fade-in slide-in-from-bottom-3 duration-500"
        >
          <h1 className="font-display text-[2rem] font-bold leading-none tracking-tight text-dark sm:text-[2.25rem]">
            {copy.title}
          </h1>
          <p className="mt-3 max-w-[28ch] text-[15px] leading-relaxed text-[#5b6472]">
            {copy.subtitle}
          </p>
          <div className="login-accent mt-6 h-1 w-12 rounded-full bg-primary" />
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          {children}
        </div>
      </div>
    </div>
  );
}
