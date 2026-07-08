'use client';

import Link from 'next/link';
import { CampanaWizard } from '@/components/cobranza/campana-wizard';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';

export default function CampanaWizardPage() {
  return (
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
  );
}
