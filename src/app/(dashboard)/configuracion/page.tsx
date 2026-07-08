'use client';

import { ConfiguracionForm } from '@/components/configuracion/configuracion-form';
import { ConfiguracionCobranzaPanel } from '@/components/cobranza/configuracion-cobranza-panel';
import { useAuth } from '@/contexts/auth-context';

export default function ConfiguracionPage() {
  const { usuario } = useAuth();
  const idusuario = usuario?.idusuario;

  return (
    <div className="space-y-8 p-4 md:p-6">
      <ConfiguracionCobranzaPanel />
      {idusuario ? (
        <ConfiguracionForm idusuario={idusuario} />
      ) : (
        <p className="text-sm text-gray-500">Cargando configuración...</p>
      )}
    </div>
  );
}
