'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import type { PermisoCatalogo, RolFormData, RolGestion } from '@/types/admin';

interface RolPermisosPanelProps {
  roles: RolGestion[];
  permisos: PermisoCatalogo[];
  selectedRol?: RolGestion;
  onSelectRol: (rol: RolGestion) => void;
  onCreateRol: (data: RolFormData) => void;
  onUpdateRol: (idrol: number, data: Partial<RolFormData>) => void;
  onSavePermisos: (idrol: number, idpermisos: number[]) => void;
  isSaving?: boolean;
}

const emptyRol: RolFormData = {
  codigo: '',
  descripcion: '',
  estado: true,
};

export function RolPermisosPanel({
  roles,
  permisos,
  selectedRol,
  onSelectRol,
  onCreateRol,
  onUpdateRol,
  onSavePermisos,
  isSaving = false,
}: RolPermisosPanelProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newRol, setNewRol] = useState<RolFormData>(emptyRol);
  const [editDescripcion, setEditDescripcion] = useState('');
  const [selectedPermisos, setSelectedPermisos] = useState<number[]>([]);

  useEffect(() => {
    if (selectedRol) {
      setEditDescripcion(selectedRol.descripcion);
      const ids = permisos
        .filter((p) => selectedRol.permisos.includes(p.codigo))
        .map((p) => p.idpermiso);
      setSelectedPermisos(ids);
    }
  }, [selectedRol, permisos]);

  const permisosPorCategoria = useMemo(() => {
    const map = new Map<string, PermisoCatalogo[]>();
    for (const permiso of permisos) {
      const cat = permiso.categoria ?? 'GENERAL';
      const list = map.get(cat) ?? [];
      list.push(permiso);
      map.set(cat, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [permisos]);

  const togglePermiso = (idpermiso: number) => {
    setSelectedPermisos((prev) =>
      prev.includes(idpermiso)
        ? prev.filter((id) => id !== idpermiso)
        : [...prev, idpermiso],
    );
  };

  const toggleCategoria = (items: PermisoCatalogo[]) => {
    const ids = items.map((p) => p.idpermiso);
    const allSelected = ids.every((id) => selectedPermisos.includes(id));
    if (allSelected) {
      setSelectedPermisos((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedPermisos((prev) => [...new Set([...prev, ...ids])]);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-dark dark:text-white">
            Roles
          </h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowCreate((v) => !v)}
          >
            {showCreate ? 'Cancelar' : 'Nuevo rol'}
          </Button>
        </div>

        {showCreate && (
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <FormField
              type="input"
              label="Código"
              required
              inputProps={{
                value: newRol.codigo,
                onChange: (e) =>
                  setNewRol({
                    ...newRol,
                    codigo: e.target.value.toUpperCase(),
                  }),
                placeholder: 'EJ: SUPERVISOR',
              }}
            />
            <div className="mt-2">
              <FormField
                type="input"
                label="Descripción"
                required
                inputProps={{
                  value: newRol.descripcion,
                  onChange: (e) =>
                    setNewRol({ ...newRol, descripcion: e.target.value }),
                }}
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="mt-3 w-full"
              disabled={isSaving}
              onClick={() => {
                onCreateRol(newRol);
                setNewRol(emptyRol);
                setShowCreate(false);
              }}
            >
              Crear rol
            </Button>
          </div>
        )}

        <ul className="space-y-1">
          {roles.map((rol) => (
            <li key={rol.idrol}>
              <button
                type="button"
                onClick={() => onSelectRol(rol)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selectedRol?.idrol === rol.idrol
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-gray-1 dark:hover:bg-dark-2'
                }`}
              >
                <span className="font-medium">{rol.codigo}</span>
                <span className="mt-0.5 block text-xs text-gray-6 dark:text-dark-6">
                  {rol.cantidadUsuarios} usuario(s) · {rol.permisos.length}{' '}
                  permiso(s)
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        {!selectedRol ? (
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-6 dark:border-gray-700 dark:text-dark-6">
            Seleccione un rol para ver y editar sus permisos
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-dark dark:text-white">
                {selectedRol.codigo}
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <FormField
                  type="input"
                  label="Descripción"
                  inputProps={{
                    value: editDescripcion,
                    onChange: (e) => setEditDescripcion(e.target.value),
                  }}
                />
                <label className="flex items-end gap-2 pb-2 text-sm text-dark dark:text-white">
                  <input
                    type="checkbox"
                    checked={selectedRol.estado}
                    onChange={(e) =>
                      onUpdateRol(selectedRol.idrol, {
                        estado: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded"
                  />
                  Rol activo
                </label>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2"
                disabled={isSaving || editDescripcion === selectedRol.descripcion}
                onClick={() =>
                  onUpdateRol(selectedRol.idrol, {
                    descripcion: editDescripcion,
                  })
                }
              >
                Guardar descripción
              </Button>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="font-medium text-dark dark:text-white">
                  Permisos asignados
                </h4>
                <span className="text-xs text-gray-6 dark:text-dark-6">
                  {selectedPermisos.length} de {permisos.length} seleccionados
                </span>
              </div>

              <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
                {permisosPorCategoria.map(([categoria, items]) => {
                  const allSelected = items.every((p) =>
                    selectedPermisos.includes(p.idpermiso),
                  );
                  return (
                    <div key={categoria}>
                      <button
                        type="button"
                        onClick={() => toggleCategoria(items)}
                        className="mb-2 flex w-full items-center gap-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-6 dark:text-dark-6"
                      >
                        <input
                          type="checkbox"
                          readOnly
                          checked={allSelected}
                          className="h-3.5 w-3.5 rounded"
                        />
                        {categoria}
                      </button>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {items.map((permiso) => (
                          <label
                            key={permiso.idpermiso}
                            className="flex cursor-pointer items-start gap-2 rounded-md border border-gray-100 p-2 text-sm hover:bg-gray-1 dark:border-gray-800 dark:hover:bg-dark-2"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermisos.includes(
                                permiso.idpermiso,
                              )}
                              onChange={() => togglePermiso(permiso.idpermiso)}
                              className="mt-0.5 h-4 w-4 rounded"
                            />
                            <span>
                              <span className="font-medium text-dark dark:text-white">
                                {permiso.nombre}
                              </span>
                              <span className="mt-0.5 block text-xs text-gray-6 dark:text-dark-6">
                                {permiso.codigo}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                className="mt-4"
                disabled={isSaving}
                onClick={() =>
                  onSavePermisos(selectedRol.idrol, selectedPermisos)
                }
              >
                {isSaving ? 'Guardando...' : 'Guardar permisos del rol'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
