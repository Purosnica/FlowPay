'use client';

import { PermissionGate } from '@/components/auth/permission-gate';
import { BajaMandanteForm } from '@/components/cobranza/baja-mandante-form';
import { PageHeader } from '@/components/ui/page-header';
import { PERMISO } from '@/lib/permissions/permiso-codes';

export default function BajasMandantePage() {
  return <PermissionGate permiso={PERMISO.BAJA_MANDANTE_EXECUTE} fallback={<p className="text-sm text-gray-500">No tienes autorización para ejecutar bajas por mandante.</p>}>
    <div className="space-y-6">
      <PageHeader title="Baja masiva de préstamos" description="Valide PTMO retirados por un mandante, revise el impacto y confirme la baja sin eliminar el historial." />
      <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark"><BajaMandanteForm /></div>
    </div>
  </PermissionGate>;
}
