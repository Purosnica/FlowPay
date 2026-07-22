'use client';

import type { PropsWithChildren } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GestionOutboxSync } from '@/components/pwa/gestion-outbox-sync';
import { cn } from '@/lib/utils';

const NAV_CAMPO = [
  { href: '/cobranza/mi-dia', label: 'Mi día' },
  { href: '/cobranza/bandeja', label: 'Bandeja' },
  { href: '/cobranza/gestiones', label: 'Gestiones' },
] as const;

/**
 * Shell slim para campo (I013) — sin sidebar gerencial.
 */
export function CobradorShell({ children }: PropsWithChildren) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-gray-2 dark:bg-[#020d1a]">
      <header className="sticky top-0 z-40 border-b border-stroke bg-white/95 px-4 py-3 backdrop-blur dark:border-stroke-dark dark:bg-[#0b1220]/95">
        <div className="mx-auto flex max-w-screen-lg items-center justify-between gap-3">
          <p className="text-sm font-semibold text-dark dark:text-white">
            FlowPay · Campo
          </p>
          <nav className="flex flex-wrap items-center gap-1">
            {NAV_CAMPO.map((item) => {
              const activo =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={activo ? 'page' : undefined}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium',
                    activo
                      ? 'bg-primary text-white'
                      : 'text-dark-5 hover:bg-gray-2 dark:text-dark-6 dark:hover:bg-dark-2',
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <GestionOutboxSync />

      <main className="isolate mx-auto w-full max-w-screen-lg flex-1 overflow-x-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}

/** Rutas de campo que usan shell cobrador (I013 / H19). */
export function esRutaCobradorCampo(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }
  return (
    pathname === '/cobranza/mi-dia' ||
    pathname.startsWith('/cobranza/mi-dia/') ||
    pathname === '/cobranza/bandeja' ||
    pathname.startsWith('/cobranza/bandeja/') ||
    pathname === '/cobranza/gestiones' ||
    pathname.startsWith('/cobranza/gestiones/') ||
    pathname.startsWith('/cobranza/prestamos/')
  );
}
