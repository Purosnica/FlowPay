'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MAPEO_CREDICOMPRAS } from '@/lib/cobranza/import/mapeo-default';
import type { PlantillaImportacion } from '@/types/cobranza';

export interface PlantillaFormData {
  idmandante: number;
  nombre: string;
  mapeo: string;
  formatoFecha?: string;
  estado: boolean;
}

interface PlantillaImportacionFormProps {
  idmandante: number;
  plantilla?: PlantillaImportacion;
  onSubmit: (data: PlantillaFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function PlantillaImportacionForm({
  idmandante,
  plantilla,
  onSubmit,
  onCancel,
  isLoading,
}: PlantillaImportacionFormProps) {
  const [form, setForm] = useState<PlantillaFormData>({
    idmandante,
    nombre: plantilla?.nombre ?? '',
    mapeo: plantilla?.mapeo ?? JSON.stringify(MAPEO_CREDICOMPRAS, null, 2),
    formatoFecha: plantilla?.formatoFecha ?? 'DD/MM/YYYY',
    estado: plantilla?.estado ?? true,
  });
  const [mapeoError, setMapeoError] = useState<string | null>(null);

  const usarPlantillaDefault = () => {
    setForm({
      ...form,
      mapeo: JSON.stringify(MAPEO_CREDICOMPRAS, null, 2),
    });
    setMapeoError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      JSON.parse(form.mapeo);
      setMapeoError(null);
      onSubmit(form);
    } catch {
      setMapeoError('El mapeo debe ser JSON válido.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Nombre *</label>
        <input
          required
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Formato fecha</label>
        <input
          value={form.formatoFecha ?? ''}
          onChange={(e) =>
            setForm({ ...form, formatoFecha: e.target.value || undefined })
          }
          placeholder="DD/MM/YYYY"
          className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
        />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-sm font-medium">
            Mapeo JSON (campo → columna Excel) *
          </label>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={usarPlantillaDefault}
          >
            Usar CREDICOMPRAS
          </button>
        </div>
        <textarea
          required
          rows={12}
          value={form.mapeo}
          onChange={(e) => setForm({ ...form, mapeo: e.target.value })}
          className="w-full font-mono text-xs rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark-2 dark:text-white"
        />
        {mapeoError && (
          <p className="mt-1 text-xs text-red-600">{mapeoError}</p>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.estado}
          onChange={(e) => setForm({ ...form, estado: e.target.checked })}
        />
        Activa
      </label>
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : plantilla ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
}
