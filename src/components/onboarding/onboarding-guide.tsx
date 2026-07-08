'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useOnboardingCobrador } from '@/hooks/use-onboarding';

function CheckIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-green-500 text-white">
        <svg
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z"
            clipRule="evenodd"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full border-2 border-stroke dark:border-dark-3" />
  );
}

export interface OnboardingGuideProps {
  idusuario: number | null;
  habilitado: boolean;
}

export function OnboardingGuide({
  idusuario,
  habilitado,
}: OnboardingGuideProps) {
  const {
    visible,
    pasos,
    pasosCompletados,
    completados,
    totalPasos,
    marcarPaso,
    omitir,
  } = useOnboardingCobrador(idusuario, habilitado);

  if (!visible) {
    return null;
  }

  const progreso = Math.round((completados / totalPasos) * 100);

  return (
    <section className="rounded-lg border border-primary/30 bg-primary/5 p-6 dark:border-primary/40">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-dark dark:text-white">
            Guía de inicio
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Da tus primeros pasos en FlowPay. Completa esta guía a tu ritmo.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={omitir}>
          Omitir guía
        </Button>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
          <span>
            {completados} de {totalPasos} completados
          </span>
          <span>{progreso}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-stroke dark:bg-dark-3">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progreso}%` }}
          />
        </div>
      </div>

      <ol className="mt-5 space-y-3">
        {pasos.map((paso, indice) => {
          const done = pasosCompletados.has(paso.id);
          return (
            <li
              key={paso.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-stroke bg-white p-4 dark:border-dark-3 dark:bg-dark-2"
            >
              <CheckIcon done={done} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-dark dark:text-white">
                  {indice + 1}. {paso.titulo}
                </p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {paso.descripcion}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!done && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => marcarPaso(paso.id)}
                  >
                    Marcar hecho
                  </Button>
                )}
                <Link href={paso.href} onClick={() => marcarPaso(paso.id)}>
                  <Button size="sm" variant={done ? 'outline' : 'primary'}>
                    {paso.ctaLabel}
                  </Button>
                </Link>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
