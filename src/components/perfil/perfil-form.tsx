'use client';

import { useEffect, useState } from 'react';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import type { PerfilFormData, UsuarioPerfil } from '@/types/perfil';
import { csrfHeaders } from '@/lib/security/csrf';

interface PerfilFormProps {
  perfil: UsuarioPerfil;
  onSubmit: (data: PerfilFormData) => void;
  isLoading?: boolean;
  error?: string | null;
  success?: string | null;
  onFotoSubida?: () => Promise<void> | void;
}

export function PerfilForm({
  perfil,
  onSubmit,
  isLoading = false,
  error,
  success,
  onFotoSubida,
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
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [fotoError, setFotoError] = useState<string | null>(null);

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

  const subirFoto = async (archivo: File) => {
    setFotoError(null);
    setSubiendoFoto(true);
    try {
      const datos = new FormData();
      datos.append('foto', archivo);
      const response = await fetch('/api/perfil/foto', {
        method: 'POST',
        credentials: 'include',
        headers: csrfHeaders(),
        body: datos,
      });
      const resultado = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !resultado.success) {
        throw new Error(resultado.error ?? 'No se pudo subir la foto.');
      }
      await onFotoSubida?.();
    } catch (err) {
      setFotoError(err instanceof Error ? err.message : 'No se pudo subir la foto.');
    } finally {
      setSubiendoFoto(false);
    }
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
        <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Datos personales</h2>

        <div className="mb-5 flex items-center gap-4">
          {perfil.fotoPerfil ? (
            <img
              src={perfil.fotoPerfil}
              alt="Foto de perfil"
              className="size-16 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-white">
              {perfil.nombre.trim().charAt(0).toUpperCase() || 'U'}
            </span>
          )}
          <div>
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white">
              {subiendoFoto ? 'Subiendo...' : perfil.fotoPerfil ? 'Cambiar foto' : 'Subir foto'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={subiendoFoto}
                onChange={(event) => {
                  const archivo = event.target.files?.[0];
                  if (archivo) void subirFoto(archivo);
                  event.currentTarget.value = '';
                }}
              />
            </label>
            <p className="mt-1 text-xs text-gray-6 dark:text-dark-6">
              JPG, PNG o WebP; máximo 2 MB.
            </p>
            {fotoError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fotoError}</p>
            )}
          </div>
        </div>

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
            <span className="mb-1.5 text-sm font-medium text-dark dark:text-white">Rol</span>
            <span className="rounded-lg border border-stroke bg-gray-1 px-3 py-2 text-sm text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white">
              {perfil.rol.codigo} — {perfil.rol.descripcion}
            </span>
          </div>
        </div>

        {perfil.ultimoAcceso && (
          <p className="mt-3 text-xs text-gray-6 dark:text-dark-6">
            Último acceso: {new Date(perfil.ultimoAcceso).toLocaleString('es-NI')}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <h2 className="mb-1 text-lg font-semibold text-dark dark:text-white">Cambiar contraseña</h2>
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
              onChange: (e) => setForm({ ...form, passwordActual: e.target.value }),
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
              onChange: (e) => setForm({ ...form, passwordNueva: e.target.value }),
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
              onChange: (e) => setForm({ ...form, confirmarPassword: e.target.value }),
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
