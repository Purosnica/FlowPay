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
        description="Asigne préstamos de forma manual o con distribución asistida; la asignación sin intervención corre post-import si está habilitada en config."
      />

      <Tabs defaultValue="manual">
        <TabsList>
          <TabsTrigger value="manual">Manual</TabsTrigger>
          <TabsTrigger value="automatica">Distribución asistida</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-4">
          <AsignacionManualPanel />
        </TabsContent>

        <TabsContent value="automatica" className="mt-4">
          <AsignacionAutomaticaPanel />
        </TabsContent>
      </Tabs>
    </div>
    </PermissionGate>
  );
}
