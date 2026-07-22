'use client';

import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AsignacionManualPanel } from '@/components/cobranza/asignacion-manual-panel';
import { AsignacionAutomaticaPanel } from '@/components/cobranza/asignacion-automatica-panel';
import { PermissionGate } from '@/components/auth/permission-gate';
import { PERMISO } from '@/lib/permissions/permiso-codes';

export default function AsignacionCarteraPage() {
  return (
    <PermissionGate
      permiso={PERMISO.CARTERA_WRITE}
      fallback={
        <p className="text-sm text-gray-500">
          No tienes permiso para asignar cartera.
        </p>
      }
    >
    <div className="space-y-6">
      <PageHeader
        title="Asignación de cartera"
        description="Asigne préstamos de forma manual, asistida o hands-off; el cron y post-import cubren la asignación automática si están habilitados."
      />

      <Tabs defaultValue="automatica">
        <TabsList>
          <TabsTrigger value="automatica">Automática / asistida</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="automatica" className="mt-4">
          <AsignacionAutomaticaPanel />
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <AsignacionManualPanel />
        </TabsContent>
      </Tabs>
    </div>
    </PermissionGate>
  );
}
