'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PerfilForm } from '@/components/perfil/perfil-form';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import { useAuth } from '@/contexts/auth-context';
import {
  GET_MI_PERFIL,
  ACTUALIZAR_MI_PERFIL,
} from '@/lib/graphql/queries/perfil.queries';
import type { PerfilFormData, UsuarioPerfil } from '@/types/perfil';

export default function PerfilPage() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, isLoading, error } = useGraphQLQuery<{ miPerfil: UsuarioPerfil }>(
    GET_MI_PERFIL,
  );

  const updateMutation = useGraphQLMutation(ACTUALIZAR_MI_PERFIL, {
    onSuccess: async () => {
      setSuccessMessage('Perfil actualizado correctamente');
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: [GET_MI_PERFIL] });
      await refreshUser();
    },
    onError: (err) => {
      setSuccessMessage(null);
      setErrorMessage(err.message || 'Error al actualizar el perfil');
    },
  });

  const handleSubmit = (formData: PerfilFormData) => {
    setSuccessMessage(null);
    setErrorMessage(null);

    const input: Record<string, string | null | undefined> = {
      nombre: formData.nombre,
      email: formData.email,
      telefono: formData.telefono || null,
    };

    if (formData.passwordNueva) {
      input.passwordActual = formData.passwordActual;
      input.passwordNueva = formData.passwordNueva;
    }

    updateMutation.mutate({ input });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !data?.miPerfil) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
        No se pudo cargar su perfil. Verifique que haya iniciado sesión.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          Mi perfil
        </h1>
        <p className="mt-1 text-sm text-gray-6 dark:text-dark-6">
          Actualice sus datos personales y contraseña de acceso.
        </p>
      </div>

      <div className="max-w-3xl">
        <PerfilForm
          perfil={data.miPerfil}
          onSubmit={handleSubmit}
          isLoading={updateMutation.isPending}
          error={errorMessage}
          success={successMessage}
        />
      </div>
    </div>
  );
}
