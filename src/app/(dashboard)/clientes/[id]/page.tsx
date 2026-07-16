'use client';

import { use } from 'react';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_CLIENTE_VISTA_360 } from '@/lib/graphql/queries/cobranza.queries';
import {
  ClienteVista360Error,
  ClienteVista360Loading,
  ClienteVista360View,
} from '@/components/clientes/cliente-vista-360';
import type { ClienteVista360 } from '@/types/cliente';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClienteDetallePage({ params }: PageProps) {
  const { id } = use(params);
  const idcliente = Number(id);

  const { data, isLoading, error } = useGraphQLQuery<{
    clienteVista360: ClienteVista360;
  }>(GET_CLIENTE_VISTA_360, { idcliente }, { enabled: Number.isFinite(idcliente) });

  if (isLoading) {
    return <ClienteVista360Loading />;
  }

  if (error || !data?.clienteVista360) {
    return <ClienteVista360Error />;
  }

  return <ClienteVista360View data={data.clienteVista360} />;
}
