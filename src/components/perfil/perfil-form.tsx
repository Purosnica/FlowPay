'use client';

import { useEffect, useState } from 'react';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import type { PerfilFormData, UsuarioPerfil } from '@/types/perfil';

interface PerfilFormProps {
  perfil: UsuarioPerfil;
  onSubmit: (data: PerfilFormData) => void;
  isLoading?: boolean;
  error?: string | null;
  success?: string | null;
}

export function PerfilForm({
  perfil,
  onSubmit,
  isLoading = false,
  error,
  success,
}: PerfilFormProps) {
  const [form, setForm] = useState<PerfilFormData>({
    nombre: perfil.nombre,
    email: perfil.email,
    telefono: perfil.telefono ?? '',
    passwordActual: '',
    passwordNueva: '',
    confirmarPassword: '',
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      nombre: perfil.nombre,
      email: perfil.email,
      telefono: perfil.telefono ?? '',
      passwordActual: '',
      passwordNueva: '',
      confirmarPassword: '',
    });
  }, [perfil]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (form.passwordNueva && form.passwordNueva !== form.confirmarPassword) {
      setValidationError('Las contraseñas nuevas no coinciden');
      return;
    }

    if (form.passwordNueva && !form.passwordActual) {
      setValidationError('Ingrese su contraseña actual para cambiarla');
      return;
    }

    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {(error || validationError) && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
          {validationError ?? error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-900/20 dark:text-green-400">
          {success}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">
          Datos personales
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            type="input"
            label="Nombre completo"
            required
            inputProps={{
              value: form.nombre,
              onChange: (e) => setForm({ ...form, nombre: e.target.value }),
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

          <div className="flex flex-col justify-end">
            <span className="mb-1.5 text-sm font-medium text-dark dark:text-white">
              Rol
            </span>
            <span className="rounded-lg border border-stroke bg-gray-1 px-3 py-2 text-sm text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white">
              {perfil.rol.codigo} — {perfil.rol.descripcion}
            </span>
          </div>
        </div>

        {perfil.ultimoAcceso && (
          <p className="mt-3 text-xs text-gray-6 dark:text-dark-6">
            Último acceso:{' '}
            {new Date(perfil.ultimoAcceso).toLocaleString('es-NI')}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <h2 className="mb-1 text-lg font-semibold text-dark dark:text-white">
          Cambiar contraseña
        </h2>
        <p className="mb-4 text-sm text-gray-6 dark:text-dark-6">
          Deje estos campos vacíos si no desea cambiar su contraseña.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            type="input"
            label="Contraseña actual"
            inputProps={{
              type: 'password',
              value: form.passwordActual,
              onChange: (e) =>
                setForm({ ...form, passwordActual: e.target.value }),
              autoComplete: 'current-password',
            }}
          />

          <div className="hidden sm:block" />

          <FormField
            type="input"
            label="Nueva contraseña"
            inputProps={{
              type: 'password',
              value: form.passwordNueva,
              onChange: (e) =>
                setForm({ ...form, passwordNueva: e.target.value }),
              autoComplete: 'new-password',
              placeholder: 'Mínimo 6 caracteres',
            }}
          />

          <FormField
            type="input"
            label="Confirmar nueva contraseña"
            inputProps={{
              type: 'password',
              value: form.confirmarPassword,
              onChange: (e) =>
                setForm({ ...form, confirmarPassword: e.target.value }),
              autoComplete: 'new-password',
            }}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}
