"use client";

import { useState } from "react";
import { AgingCarteraChart } from "./aging-cartera-chart";
import { RecuperacionChart } from "./recuperacion-chart";
import { RankingGestoresTable } from "./ranking-gestores-table";
import { MoraPromedioChart } from "./mora-promedio-chart";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function ReportesDashboard() {
  const [filters, setFilters] = useState<{
    fechaDesde?: string;
    fechaHasta?: string;
    tipoprestamo?: string;
    idusuarioGestor?: number;
  }>({});

  const handleFilterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newFilters: any = {};
    
    if (formData.get("fechaDesde")) {
      newFilters.fechaDesde = formData.get("fechaDesde");
    }
    if (formData.get("fechaHasta")) {
      newFilters.fechaHasta = formData.get("fechaHasta");
    }
    if (formData.get("tipoprestamo")) {
      newFilters.tipoprestamo = formData.get("tipoprestamo");
    }
    if (formData.get("idusuarioGestor")) {
      newFilters.idusuarioGestor = parseInt(formData.get("idusuarioGestor") as string);
    }

    setFilters(newFilters);
  };

  const handleReset = () => {
    setFilters({});
    // Resetear formulario
    const form = document.getElementById("filters-form") as HTMLFormElement;
    if (form) form.reset();
  };

  // Fechas por defecto (último año)
  const fechaHasta = new Date().toISOString().split("T")[0];
  const fechaDesde = new Date(new Date().setFullYear(new Date().getFullYear() - 1))
    .toISOString()
    .split("T")[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Reportes y KPIs</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Análisis avanzado de cartera y rendimiento
          </p>
        </div>
      </div>

      <form
        id="filters-form"
        onSubmit={handleFilterSubmit}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-dark-2"
      >
        <div className="w-full md:w-1/5">
          <Input
            name="fechaDesde"
            label="Fecha Desde"
            type="date"
            defaultValue={fechaDesde}
          />
        </div>
        <div className="w-full md:w-1/5">
          <Input
            name="fechaHasta"
            label="Fecha Hasta"
            type="date"
            defaultValue={fechaHasta}
          />
        </div>
        <div className="w-full md:w-1/5">
          <Select
            name="tipoprestamo"
            label="Tipo Préstamo"
            options={[
              { value: "PROPIO", label: "Propio" },
              { value: "TERCERIZADO", label: "Tercerizado" },
            ]}
            placeholder="Todos"
            defaultValue=""
          />
        </div>
        <div className="w-full md:w-1/5">
          <Input
            name="idusuarioGestor"
            label="ID Gestor"
            type="number"
            placeholder="Opcional"
            defaultValue=""
          />
        </div>
        <div className="w-full md:w-1/5 flex gap-2">
          <Button type="submit" size="sm">
            Aplicar
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleReset}>
            Limpiar
          </Button>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <AgingCarteraChart filters={filters} />
        </div>

        <div className="lg:col-span-2">
          <RecuperacionChart filters={filters} />
        </div>

        <div className="lg:col-span-2">
          <MoraPromedioChart filters={filters} />
        </div>

        <div className="lg:col-span-2">
          <RankingGestoresTable filters={filters} />
        </div>
      </div>
    </div>
  );
}




