'use client';

import { useId, useState } from 'react';
import type { BandejaFilters } from '@/types/cobranza';
import { MandanteSelect } from '@/components/cobranza/mandante-select';
import {
  decodeTramoMoraKey,
  encodeTramoMoraKey,
} from '@/lib/cobranza/tramos-mora';
import { useBandejaPresets } from '@/hooks/use-bandeja-presets';
import { notificationToast } from '@/lib/notifications/notification-toast';
import { useTramosMoraMandante } from '@/hooks/use-tramos-mora-mandante';
import { presetCoincideConFiltros } from '@/lib/cobranza/bandeja-presets';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';

interface BandejaFiltersPanelProps {
  filters: BandejaFilters;
  searchInput: string;
  onSearchChange: (value: string) => void;
  onChange: (filters: BandejaFilters) => void;
  onReset: () => void;
}

const selectClassName =
  'w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white';

export function BandejaFiltersPanel({
  filters,
  searchInput,
  onSearchChange,
  onChange,
  onReset,
}: BandejaFiltersPanelProps) {
  const tramoId = useId();
  const ordenId = useId();
  const searchId = useId();
  const { usuario } = useAuth();

  const { todos, personalizados, guardarPreset, eliminarPreset } =
    useBandejaPresets(usuario?.idusuario ?? null);
  const [nombreNuevoPreset, setNombreNuevoPreset] = useState('');
  const [mostrarGuardar, setMostrarGuardar] = useState(false);

  const { tramos, isLoading: tramosLoading } = useTramosMoraMandante(
    filters.idmandante,
  );

  const tramoKey =
    filters.tramoMoraMin !== undefined
      ? encodeTramoMoraKey(
          filters.tramoMoraMin,
          filters.tramoMoraMax ?? null,
        )
      : '';

  return (
    <div className="rounded-lg bg-white p-4 shadow-1 dark:bg-gray-dark">
      <div className="mb-4">
        <p className="mb-2 text-sm font-medium text-dark dark:text-white">
          Vistas rápidas
        </p>
        <div className="flex flex-wrap gap-2">
          {todos.map((preset) => {
            const activo = presetCoincideConFiltros(preset, filters);
            const esPersonalizado = personalizados.some(
              (p) => p.id === preset.id,
            );
            return (
              <div key={preset.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onChange({ ...preset.filters })}
                  className={cn(
                    'rounded-full border-2 px-3 py-1 text-xs font-semibold transition-all',
                    activo
                      ? 'border-primary bg-primary text-white shadow-sm shadow-primary/25'
                      : 'border-primary/40 bg-primary/5 text-primary hover:border-primary hover:bg-primary/15 dark:bg-primary/10',
                  )}
                >
                  {preset.nombre}
                </button>
                {esPersonalizado && (
                  <button
                    type="button"
                    aria-label={`Eliminar ${preset.nombre}`}
                    onClick={() => {
                      eliminarPreset(preset.id);
                      notificationToast.success('Vista eliminada correctamente');
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setMostrarGuardar((v) => !v)}
            className="rounded-full border border-dashed border-gray-400 px-3 py-1 text-xs text-gray-500 hover:border-primary hover:text-primary"
          >
            + Guardar vista
          </button>
        </div>
        {mostrarGuardar && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Nombre de la vista..."
              value={nombreNuevoPreset}
              onChange={(e) => setNombreNuevoPreset(e.target.value)}
              className="rounded border px-2 py-1 text-sm dark:border-dark-3 dark:bg-dark-2"
            />
            <Button
              size="sm"
              type="button"
              disabled={!nombreNuevoPreset.trim()}
              onClick={() => {
                guardarPreset(nombreNuevoPreset, filters);
                notificationToast.success('Vista guardada correctamente');
                setNombreNuevoPreset('');
                setMostrarGuardar(false);
              }}
            >
              Guardar
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MandanteSelect
          value={filters.idmandante ?? ''}
          onChange={(value) =>
            onChange({
              ...filters,
              idmandante: value === '' ? undefined : value,
              tramoMoraMin: undefined,
              tramoMoraMax: undefined,
            })
          }
          allowAll
          selectClassName={selectClassName}
        />

        <div>
          <label
            htmlFor={tramoId}
            className="mb-1 block text-sm font-medium text-dark dark:text-white"
          >
            Tipo de mora
          </label>
          <select
            id={tramoId}
            value={tramoKey}
            disabled={!filters.idmandante || tramosLoading}
            onChange={(e) => {
              if (!e.target.value) {
                onChange({
                  ...filters,
                  tramoMoraMin: undefined,
                  tramoMoraMax: undefined,
                });
                return;
              }
              const tramo = decodeTramoMoraKey(e.target.value);
              if (!tramo) {
                return;
              }
              onChange({
                ...filters,
                tramoMoraMin: tramo.tramoMoraMin,
                tramoMoraMax: tramo.tramoMoraMax,
              });
            }}
            className={selectClassName}
          >
            <option value="">
              {!filters.idmandante
                ? 'Seleccione mandante'
                : tramosLoading
                  ? 'Cargando tramos...'
                  : tramos.length === 0
                    ? 'Sin tramos configurados'
                    : 'Todos los tramos'}
            </option>
            {tramos.map((t) => (
              <option
                key={encodeTramoMoraKey(t.tramoMoraMin, t.tramoMoraMax)}
                value={encodeTramoMoraKey(t.tramoMoraMin, t.tramoMoraMax)}
              >
                {t.tramo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={ordenId}
            className="mb-1 block text-sm font-medium text-dark dark:text-white"
          >
            Ordenar por monto
          </label>
          <select
            id={ordenId}
            value={filters.ordenarPor ?? 'prioridad'}
            onChange={(e) =>
              onChange({
                ...filters,
                ordenarPor:
                  e.target.value === 'prioridad'
                    ? undefined
                    : (e.target.value as BandejaFilters['ordenarPor']),
              })
            }
            className={selectClassName}
          >
            <option value="prioridad">
              Prioridad inteligente (recomendado)
            </option>
            <option value="saldo_desc">Saldo: mayor a menor</option>
            <option value="saldo_asc">Saldo: menor a mayor</option>
          </select>
        </div>

        <div>
          <label
            htmlFor={searchId}
            className="mb-1 block text-sm font-medium text-dark dark:text-white"
          >
            No. préstamo
          </label>
          <input
            id={searchId}
            type="text"
            placeholder="Buscar por número o código único..."
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            className={selectClassName}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!filters.soloPromesaVencida}
            onChange={(e) =>
              onChange({
                ...filters,
                soloPromesaVencida: e.target.checked || undefined,
              })
            }
          />
          Solo promesa vencida
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!filters.soloAgendaHoy}
            onChange={(e) =>
              onChange({
                ...filters,
                soloAgendaHoy: e.target.checked || undefined,
              })
            }
          />
          Agenda hoy
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!filters.soloSinGestion}
            onChange={(e) =>
              onChange({
                ...filters,
                soloSinGestion: e.target.checked || undefined,
              })
            }
          />
          Sin gestión prolongada
        </label>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onReset}
          className="text-sm text-primary hover:underline"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}
