"use client";

import { PrestamoCreateForm } from "@/components/finanzas/prestamo-create-form";

export default function NuevaSolicitudPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-dark dark:text-white">Crear préstamo</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Registra una nueva solicitud de préstamo (propio o tercerizado).
        </p>
      </div>
      <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-dark-2">
        <PrestamoCreateForm />
      </div>
    </div>
  );
}

