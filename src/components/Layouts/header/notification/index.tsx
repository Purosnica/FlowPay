'use client';

import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from '@/components/ui/dropdown';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BellIcon } from './icons';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import {
  GET_NOTIFICACIONES_OPERATIVAS,
  MARCAR_NOTIFICACIONES_LEIDAS,
} from '@/lib/graphql/queries/cobranza.queries';
import { useAuth } from '@/contexts/auth-context';
import { PERMISO } from '@/lib/permissions/permiso-codes';

interface NotificacionItem {
  id: string;
  tipo: string;
  severidad: string;
  titulo: string;
  mensaje: string;
  url?: string | null;
  createdAt: string;
  leida: boolean;
}

function puedeVerNotificacionesOperativas(permisos: string[]): boolean {
  return (
    permisos.includes(PERMISO.CARTERA_READ) ||
    permisos.includes(PERMISO.GESTION_READ) ||
    permisos.includes(PERMISO.INTELIGENCIA_READ)
  );
}

export function Notification() {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const { permisos } = useAuth();
  const habilitado = puedeVerNotificacionesOperativas(permisos);

  const { data, refetch } = useGraphQLQuery<{
    notificacionesOperativas: NotificacionItem[];
  }>(GET_NOTIFICACIONES_OPERATIVAS, undefined, { enabled: habilitado });

  const marcarLeidasMutation = useGraphQLMutation(MARCAR_NOTIFICACIONES_LEIDAS, {
    onSuccess: () => {
      void refetch();
    },
  });

  const notificaciones = data?.notificacionesOperativas ?? [];
  const noLeidas = useMemo(
    () => notificaciones.filter((n) => !n.leida).length,
    [notificaciones],
  );

  if (!habilitado) {
    return null;
  }

  const handleOpen = (open: boolean) => {
    setIsOpen(open);
    if (open && noLeidas > 0) {
      const ids = notificaciones.filter((n) => !n.leida).map((n) => n.id);
      marcarLeidasMutation.mutate({ ids });
    }
  };

  return (
    <Dropdown isOpen={isOpen} setIsOpen={handleOpen}>
      <DropdownTrigger
        className="grid size-12 place-items-center rounded-full border bg-gray-2 text-dark outline-none hover:text-primary focus-visible:border-primary focus-visible:text-primary dark:border-dark-4 dark:bg-dark-3 dark:text-white dark:focus-visible:border-primary"
        aria-label="Ver notificaciones"
      >
        <span className="relative">
          <BellIcon />

          {noLeidas > 0 && (
            <span
              className={cn(
                'absolute right-0 top-0 z-1 size-2 rounded-full bg-red-light ring-2 ring-gray-2 dark:ring-dark-3',
              )}
            >
              <span className="absolute inset-0 -z-1 animate-ping rounded-full bg-red-light opacity-75" />
            </span>
          )}
        </span>
      </DropdownTrigger>

      <DropdownContent
        align={isMobile ? 'end' : 'center'}
        className="border border-stroke bg-white px-3.5 py-3 shadow-md dark:border-dark-3 dark:bg-gray-dark min-[350px]:min-w-[20rem]"
      >
        <div className="mb-1 flex items-center justify-between px-2 py-1.5">
          <span className="text-lg font-medium text-dark dark:text-white">
            Inbox operativo
          </span>
          {noLeidas > 0 && (
            <span className="rounded-md bg-primary px-[9px] py-0.5 text-xs font-medium text-white">
              {noLeidas} nueva{noLeidas === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <ul className="mb-3 max-h-[23rem] space-y-1.5 overflow-y-auto">
          {notificaciones.length === 0 && (
            <li className="px-2 py-4 text-center text-sm text-gray-500">
              Sin alertas operativas
            </li>
          )}
          {notificaciones.map((item) => (
            <li key={item.id} role="menuitem">
              <Link
                href={item.url ?? '#'}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'block rounded-lg px-2 py-2 outline-none hover:bg-gray-2 focus-visible:bg-gray-2 dark:hover:bg-dark-3 dark:focus-visible:bg-dark-3',
                  item.severidad === 'critical' && 'border-l-2 border-red-500',
                  item.severidad === 'warning' && 'border-l-2 border-amber-500',
                  !item.leida && 'bg-primary/5',
                )}
              >
                <strong className="block text-sm font-medium text-dark dark:text-white">
                  {item.titulo}
                </strong>
                <span className="text-sm text-dark-5 dark:text-dark-6">
                  {item.mensaje}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Link
          href="/cobranza/bandeja?preset=inbox_operativo"
          onClick={() => setIsOpen(false)}
          className="block rounded-lg px-2 py-2 text-center text-sm font-medium text-primary hover:bg-gray-2 dark:hover:bg-dark-3"
        >
          Ver inbox en bandeja
        </Link>
      </DropdownContent>
    </Dropdown>
  );
}
