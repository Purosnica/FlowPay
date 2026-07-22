'use client';

import { Button } from '@/components/ui/button';

export interface ColumnaOpcion {
  id: string;
  label: string;
}

interface ReporteColumnasPickerProps {
  columnas: ColumnaOpcion[];
  visibleIds: string[];
  onToggle: (id: string) => void;
  onReset: () => void;
}

/**
 * Selector de columnas salvables para reportes (I183).
 */
export function ReporteColumnasPicker({
  columnas,
  visibleIds,
  onToggle,
  onReset,
}: ReporteColumnasPickerProps) {
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-lg border border-stroke px-3 py-1.5 text-sm dark:border-dark-3">
        Columnas
      </summary>
      <div className="absolute right-0 z-20 mt-1 min-w-[220px] rounded-lg border border-stroke bg-white p-3 shadow-md dark:border-dark-3 dark:bg-gray-dark">
        <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
          {columnas.map((col) => (
            <li key={col.id}>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={visibleIds.includes(col.id)}
                  onChange={() => onToggle(col.id)}
                />
                <span>{col.label}</span>
              </label>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 w-full"
          onClick={onReset}
        >
          Restablecer
        </Button>
      </div>
    </details>
  );
}
