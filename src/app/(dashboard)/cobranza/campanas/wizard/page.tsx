'use client';

import Link from 'next/link';
import { CampanaWizard } from '@/components/cobranza/campana-wizard';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PERMISO } from '@/lib/permissions/permiso-codes';

export default function CampanaWizardPage() {
  return (
    <PermissionGate
      permiso={PERMISO.CARTERA_WRITE}
      fallback={
        <p className="p-4 text-sm text-gray-500">
          No tienes permiso para crear campañas.
        </p>
      }
    >
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader
          title="Wizard de campaña"
          description="Cree campaña, defina secuencia de contacto e importe cartera en un solo flujo."
          actions={
            <Link href="/cobranza/campanas">
              <Button variant="outline">Volver a campañas</Button>
            </Link>
          }
        />
        <CampanaWizard />
      </div>
    </PermissionGate>
  );
}
