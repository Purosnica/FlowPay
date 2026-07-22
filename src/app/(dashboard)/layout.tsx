/**
 * LAYOUT PARA RUTAS DEL DASHBOARD
 *
 * Layout con sidebar y header para páginas protegidas.
 */

import type { PropsWithChildren } from 'react';
import { DashboardShell } from '@/components/Layouts/dashboard-shell';

export default function DashboardLayout({ children }: PropsWithChildren) {
  return <DashboardShell>{children}</DashboardShell>;
}
