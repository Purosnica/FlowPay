/**
 * LAYOUT PARA RUTAS DEL DASHBOARD
 *
 * Layout con sidebar y header para páginas protegidas.
 * El modo foco (I180) se aplica en DashboardShell.
 */

import type { PropsWithChildren } from 'react';
import { DashboardShell } from '@/components/Layouts/dashboard-shell';

export default function DashboardLayout({ children }: PropsWithChildren) {
  return <DashboardShell>{children}</DashboardShell>;
}
