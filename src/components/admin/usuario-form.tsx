'use client';

import { useState } from 'react';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import type { UsuarioFormData, UsuarioGestion } from '@/types/admin';

interface UsuarioFormProps {
  initial?: UsuarioGestion;
  roles: { idrol: number; codigo: string; descripcion: string }[];
  supervisores?: { idusuario: number; nombre: string }[];
  onSubmit: (data: UsuarioFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const emptyForm: UsuarioFormData = {
  nombre: '',
  email: '',
  telefono: '',
  idrol: 0,
  password: '',
  porcentajeComision: 0,
  activo: true,
  idsupervisor: null,
};

export function UsuarioForm({
  initial,
  roles,
  supervisores = [],
  onSubmit,
  onCancel,
  isLoading = false,
}: UsuarioFormProps) {
  const [form, setForm] = useState<UsuarioFormData>(() =>
    initial
      ? {
          nombre: initial.nombre,
          email: initial.email,
          telefono: initial.telefono ?? '',
          idrol: initial.idrol,
          password: '',
          porcentajeComision: Number(initial.porcentajeComision ?? 0),
          activo: initial.activo,
          idsupervisor: initial.idsupervisor,
        }
      : emptyForm,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const rolCodigo = roles.find((r) => r.idrol === form.idrol)?.codigo;
  const mostrarSupervisor = rolCodigo === 'COBRADOR';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        type="input"
        label="Nombre completo"
        required
        inputProps={{
          value: form.nombre,
          onChange: (e) => setForm({ ...form, nombre: e.target.value }),
          placeholder: 'Ej. Juan Pérez',
        }}
      />

      <FormField
        type="input"
        label="Email"
        required
        inputProps={{
          type: 'email',
          value: form.email,
          onChange: (e) => setForm({ ...form, email: e.target.value }),
          placeholder: 'usuario@flowpay.com',
        }}
      />

      <FormField
        type="input"
        label="Teléfono"
        inputProps={{
          value: form.telefono,
          onChange: (e) => setForm({ ...form, telefono: e.target.value }),
          placeholder: 'Opcional',
        }}
      />

      <FormField
        type="input"
        label="Comisión cobrador (%)"
        hint="Porcentaje sobre el ingreso de la empresa, no sobre el monto recuperado."
        inputProps={{
          type: 'number',
          min: 0,
          max: 100,
          step: 0.01,
          value: form.porcentajeComision,
          onChange: (e) =>
            setForm({
              ...form,
              porcentajeComision: Number(e.target.value),
            }),
          placeholder: 'Ej. 3',
        }}
      />

      <FormField
        type="select"
        label="Rol"
        required
        inputProps={{
          value: form.idrol || '',
          onChange: (e) =>
            setForm({ ...form, idrol: Number(e.target.value) }),
          options: [
            { value: '', label: 'Seleccionar rol...' },
            ...roles.map((r) => ({
              value: r.idrol,
              label: `${r.codigo} — ${r.descripcion}`,
            })),
          ],
        }}
      />

      {mostrarSupervisor && (
        <FormField
          type="select"
          label="Supervisor"
          hint="Jerarquía para dashboards de equipo y gamificación."
          inputProps={{
            value: form.idsupervisor?.toString() ?? '',
            onChange: (e) =>
              setForm({
                ...form,
                idsupervisor: e.target.value ? Number(e.target.value) : null,
              }),
            options: [
              { value: '', label: 'Sin supervisor asignado' },
              ...supervisores.map((s) => ({
                value: s.idusuario,
                label: s.nombre,
              })),
            ],
          }}
        />
      )}

      <FormField
        type="input"
        label={initial ? 'Nueva contraseña' : 'Contraseña'}
        hint={initial ? 'Dejar vacío para no cambiar' : undefined}
        required={!initial}
        inputProps={{
          type: 'password',
          value: form.password,
          onChange: (e) => setForm({ ...form, password: e.target.value }),
          placeholder: initial ? '••••••••' : 'Mínimo 6 caracteres',
        }}
      />

      <label className="flex items-center gap-2 text-sm text-dark dark:text-white">
        <input
          type="checkbox"
          checked={form.activo}
          onChange={(e) => setForm({ ...form, activo: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300"
        />
        Usuario activo
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : initial ? 'Actualizar' : 'Crear usuario'}
        </Button>
      </div>
    </form>
  );
}
