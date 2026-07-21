'use client';

import { useState } from 'react';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import type { UsuarioFormData, UsuarioGestion } from '@/types/admin';

interface UsuarioFormProps {
  initial?: UsuarioGestion;
  roles: { idrol: number; codigo: string; descripcion: string }[];
  supervisores?: { idusuario: number; nombre: string; idrol: number }[];
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
  const [errorJerarquia, setErrorJerarquia] = useState<string | undefined>();

  const rolCodigo = roles.find((r) => r.idrol === form.idrol)?.codigo;
  const esSupervisor = rolCodigo === 'SUPERVISOR';
  const mostrarJerarquia =
    rolCodigo === 'COBRADOR' || esSupervisor;

  const codigoPorRol = (idrol: number) =>
    roles.find((r) => r.idrol === idrol)?.codigo;

  const opcionesJerarquia = supervisores.filter((s) => {
    if (initial && s.idusuario === initial.idusuario) {
      return false;
    }
    const codigo = codigoPorRol(s.idrol);
    if (esSupervisor) {
      return codigo === 'GERENTE' || codigo === 'ADMIN';
    }
    return (
      codigo === 'SUPERVISOR' ||
      codigo === 'GERENTE' ||
      codigo === 'ADMIN'
    );
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (esSupervisor && !form.idsupervisor) {
      setErrorJerarquia('Debe asignar un gerente al supervisor.');
      return;
    }
    setErrorJerarquia(undefined);
    onSubmit(form);
  };
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
          onChange: (e) => {
            const idrol = Number(e.target.value);
            const codigo = codigoPorRol(idrol);
            const requiereJerarquia =
              codigo === 'COBRADOR' || codigo === 'SUPERVISOR';

            let idsupervisor: number | null = null;
            if (requiereJerarquia && form.idsupervisor) {
              const superior = supervisores.find(
                (s) => s.idusuario === form.idsupervisor,
              );
              const codigoSuperior = superior
                ? codigoPorRol(superior.idrol)
                : undefined;
              const validoParaSupervisor =
                codigoSuperior === 'GERENTE' || codigoSuperior === 'ADMIN';
              const validoParaCobrador =
                codigoSuperior === 'SUPERVISOR' ||
                codigoSuperior === 'GERENTE' ||
                codigoSuperior === 'ADMIN';

              if (
                (codigo === 'SUPERVISOR' && validoParaSupervisor) ||
                (codigo === 'COBRADOR' && validoParaCobrador)
              ) {
                idsupervisor = form.idsupervisor;
              }
            }

            setForm({
              ...form,
              idrol,
              idsupervisor,
            });
          },
          options: [
            { value: '', label: 'Seleccionar rol...' },
            ...roles.map((r) => ({
              value: r.idrol,
              label: `${r.codigo} — ${r.descripcion}`,
            })),
          ],
        }}
      />

      {mostrarJerarquia && (
        <FormField
          type="select"
          label={esSupervisor ? 'Reporta a (Gerente)' : 'Supervisor'}
          hint={
            esSupervisor
              ? 'Obligatorio para que el supervisor aparezca en Mi equipo del gerente.'
              : 'Jerarquía para dashboards de equipo y gamificación.'
          }
          required={esSupervisor}
          error={errorJerarquia}
          inputProps={{
            value: form.idsupervisor?.toString() ?? '',
            onChange: (e) => {
              setErrorJerarquia(undefined);
              setForm({
                ...form,
                idsupervisor: e.target.value ? Number(e.target.value) : null,
              });
            },
            options: [
              {
                value: '',
                label: esSupervisor
                  ? 'Seleccionar gerente...'
                  : 'Sin supervisor asignado',
              },
              ...opcionesJerarquia.map((s) => ({
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
