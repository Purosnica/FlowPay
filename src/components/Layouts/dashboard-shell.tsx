'use client';

import type { PropsWithChildren } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Layouts/sidebar';
import { Header } from '@/components/Layouts/header';
import { Button } from '@/components/ui/button';
import { useFocusMode } from '@/contexts/focus-mode-context';
import { isFocusModeActivo } from '@/lib/ux/focus-mode';
import { cn } from '@/lib/utils';
import { GestionOutboxSync } from '@/components/pwa/gestion-outbox-sync';
import {
  CobradorShell,
  esRutaCobradorCampo,
} from '@/components/Layouts/cobrador-shell';

/**
 * Shell del dashboard con soporte de modo foco (I180) y shell campo (I013).
 */
export function DashboardShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { focusMode, setFocusMode } = useFocusMode();
  const focusActivo = isFocusModeActivo(focusMode, pathname);

  // Campo siempre usa CobradorShell; modo foco solo aplica al shell gerencial.
  if (esRutaCobradorCampo(pathname)) {
    return <CobradorShell>{children}</CobradorShell>;
  }

  return (
    <div className="flex min-h-screen">
      {!focusActivo ? <Sidebar /> : null}

      <div
        className={cn(
          'min-w-0 flex-1 bg-gray-2 dark:bg-[#020d1a]',
          focusActivo && 'w-full',
        )}
      >
        {!focusActivo ? <Header /> : null}
        <GestionOutboxSync />

        {focusActivo ? (
          <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-primary/30 bg-primary/10 px-4 py-2 backdrop-blur dark:bg-primary/15">
            <p className="text-sm font-medium text-dark dark:text-white">
              Modo foco — Mi día
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-ux-id="salir-modo-foco-barra"
              onClick={() => setFocusMode(false)}
            >
              Salir modo foco
            </Button>
          </div>
        ) : null}

        <main
          className={cn(
            'isolate mx-auto w-full max-w-screen-2xl overflow-x-auto p-4 md:p-6 2xl:p-10',
            focusActivo && 'max-w-5xl py-6',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
