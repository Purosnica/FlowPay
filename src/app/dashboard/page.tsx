/**
 * PÁGINA PRINCIPAL DEL DASHBOARD
 * 
 * Muestra el dashboard principal con menús (Sidebar y Header)
 */

"use client";

import { DashboardAvanzado } from "@/components/dashboard/dashboard-avanzado";

export default function DashboardPage() {
  return (
    <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
      <DashboardAvanzado />
    </div>
  );
}


