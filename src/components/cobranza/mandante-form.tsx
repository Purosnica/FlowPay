'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Mandante } from '@/types/cobranza';

export interface MandanteFormData {
  codigo: string;
  nombre: string;
  ruc?: string;
  regulador?: string;
  descuentoMaximo: number;
  estado: boolean;
}

interface MandanteFormProps {
  mandante?: Mandante;
  onSubmit: (data: MandanteFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function MandanteForm({
  mandante,
  onSubmit,
  onCancel,
  isLoading,
}: MandanteFormProps) {
  const [form, setForm] = useState<MandanteFormData>({
    codigo: mandante?.codigo ?? '',
    nombre: mandante?.nombre ?? '',
    ruc: mandante?.ruc ?? '',
    regulador: mandante?.regulador ?? 'CONAMI',
    descuentoMaximo: Number(mandante?.descuentoMaximo ?? 100),
    estado: mandante?.estado ?? true,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Código *</label>
          <input
            required
            disabled={!!mandante}
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white disabled:opacity-60"
          />
        </div>
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
          <label className="mb-1 block text-sm font-medium">RUC</label>
          <input
            value={form.ruc ?? ''}
            onChange={(e) => setForm({ ...form, ruc: e.target.value })}
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Regulador</label>
          <select
            value={form.regulador ?? 'CONAMI'}
            onChange={(e) => setForm({ ...form, regulador: e.target.value })}
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          >
            <option value="CONAMI">CONAMI</option>
            <option value="SIBOIF">SIBOIF</option>
            <option value="NINGUNO">NINGUNO</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Descuento máximo autorizado (%) *
          </label>
          <input
            type="number"
            required
            min={0}
            max={100}
            step={0.5}
            value={form.descuentoMaximo}
            onChange={(e) =>
              setForm({ ...form, descuentoMaximo: Number(e.target.value) })
            }
            className="w-full rounded-lg border border-stroke px-3 py-2 text-sm dark:border-dark-3 dark:bg-dark-2 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-6">
            Límite máximo de descuento en acuerdos de pago para este mandante.
          </p>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.estado}
          onChange={(e) => setForm({ ...form, estado: e.target.checked })}
        />
        Activo
      </label>
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : mandante ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
}
