'use client';

import Link from 'next/link';
import { ImportarCarteraForm } from '@/components/cobranza/importar-cartera-form';
import { ImportacionJobsPanel } from '@/components/cobranza/importacion-jobs-panel';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';

export default function ImportarCarteraPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar Cartera"
        description="Carga snapshots desde Excel/CSV. Use importación async para archivos grandes."
        actions={
          <>
            <Link href="/cobranza/campanas/wizard">
              <Button variant="outline">Wizard de campaña</Button>
            </Link>
            <Link href="/cobranza/cartera">
              <Button variant="outline">Ver cartera</Button>
            </Link>
          </>
        }
      />

      <ImportacionJobsPanel />

      <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        <ImportarCarteraForm />
      </div>
    </div>
  );
}
