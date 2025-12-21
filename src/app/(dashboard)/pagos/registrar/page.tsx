"use client";

import { PagoCreateForm } from "@/components/finanzas/pago-create-form";

export default function RegistrarPagoPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-dark dark:text-white">Registrar pago</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Registra pagos asociados a préstamos y cuotas con trazabilidad.
        </p>
      </div>
      <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <PagoCreateForm />
      </div>
    </div>
  );
}

