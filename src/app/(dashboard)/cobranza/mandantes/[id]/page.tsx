'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { ComisionCobroPanel } from '@/components/cobranza/comision-cobro-panel';
import { PoliticaDescuentoPanel } from '@/components/cobranza/politica-descuento-panel';
import { HorarioCobranzaPanel } from '@/components/cobranza/horario-cobranza-panel';
import { ContratoMandantePanel } from '@/components/cobranza/contrato-mandante-panel';
import { TipificacionMandantePanel } from '@/components/cobranza/tipificacion-mandante-panel';
import { MandanteMetasPanel } from '@/components/cobranza/mandante-metas-panel';
import { SecuenciasMandantePanel } from '@/components/cobranza/secuencias-mandante-panel';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_MANDANTE_BY_ID } from '@/lib/graphql/queries/cobranza.queries';
import type { Mandante } from '@/types/cobranza';

type TabId =
  | 'resumen'
  | 'metas'
  | 'secuencias'
  | 'contratos'
  | 'politicas'
  | 'horarios'
  | 'tipificacion'
  | 'comisiones';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'metas', label: 'Metas' },
  { id: 'secuencias', label: 'Secuencias' },
  { id: 'contratos', label: 'Contratos' },
  { id: 'politicas', label: 'Políticas' },
  { id: 'horarios', label: 'Horarios' },
  { id: 'tipificacion', label: 'Tipificación' },
  { id: 'comisiones', label: 'Comisiones' },
];

export default function MandanteDetallePage() {
  const params = useParams();
  const idmandante = Number(params.id);
  const [tab, setTab] = useState<TabId>('resumen');

  const { data, isLoading, error } = useGraphQLQuery<{
    mandante: Mandante | null;
  }>(GET_MANDANTE_BY_ID, { id: idmandante }, {
    enabled: Number.isFinite(idmandante) && idmandante > 0,
  });

  const mandante = data?.mandante;

  if (!Number.isFinite(idmandante) || idmandante <= 0) {
    return <p className="text-sm text-red-600">Identificador de mandante inválido.</p>;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/cobranza/mandantes"
        className="text-sm text-primary hover:underline"
      >
        ← Volver a mandantes
      </Link>

      <PageHeader
        title={mandante?.nombre ?? 'Mandante'}
        description={
          mandante
            ? `${mandante.codigo}${mandante.regulador ? ` · ${mandante.regulador}` : ''} · ${mandante.estado ? 'Activo' : 'Inactivo'}`
            : 'Detalle y configuración del mandante'
        }
        actions={
          <>
            <Link href={`/cobranza/plantillas?idmandante=${idmandante}`}>
              <Button variant="outline" size="sm">
                Plantillas importación
              </Button>
            </Link>
            <Link href={`/cobranza/plantillas-mensaje?idmandante=${idmandante}`}>
              <Button variant="outline" size="sm">
                Plantillas mensaje
              </Button>
            </Link>
            <Link href={`/cobranza/campanas?idmandante=${idmandante}`}>
              <Button variant="outline" size="sm">
                Campañas
              </Button>
            </Link>
            <Link href={`/cobranza/cartera?idmandante=${idmandante}`}>
              <Button variant="outline" size="sm">
                Ver cartera
              </Button>
            </Link>
          </>
        }
      />

      {isLoading && (
        <p className="text-sm text-gray-500">Cargando mandante...</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error.message}</p>
      )}

      {mandante && (
        <>
          <div className="flex flex-wrap gap-2 border-b border-stroke pb-2 dark:border-dark-3">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  tab === t.id
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-2 dark:text-gray-300 dark:hover:bg-dark-2'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'resumen' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border p-4 dark:border-dark-3">
                <p className="text-xs text-gray-500">Descuento máximo</p>
                <p className="text-xl font-bold">{mandante.descuentoMaximo}%</p>
              </div>
              <div className="rounded-lg border p-4 dark:border-dark-3">
                <p className="text-xs text-gray-500">RUC</p>
                <p className="text-xl font-bold">{mandante.ruc ?? '—'}</p>
              </div>
              <div className="rounded-lg border p-4 dark:border-dark-3">
                <p className="text-xs text-gray-500">Estado</p>
                <p className="text-xl font-bold">
                  {mandante.estado ? 'Activo' : 'Inactivo'}
                </p>
              </div>
            </div>
          )}

          {tab === 'metas' && <MandanteMetasPanel mandante={mandante} />}
          {tab === 'secuencias' && (
            <SecuenciasMandantePanel mandante={mandante} />
          )}

          {tab === 'contratos' && (
            <ContratoMandantePanel mandante={mandante} />
          )}
          {tab === 'politicas' && (
            <PoliticaDescuentoPanel mandante={mandante} />
          )}
          {tab === 'horarios' && (
            <HorarioCobranzaPanel mandante={mandante} />
          )}
          {tab === 'tipificacion' && (
            <TipificacionMandantePanel mandante={mandante} />
          )}
          {tab === 'comisiones' && (
            <ComisionCobroPanel mandante={mandante} />
          )}
        </>
      )}
    </div>
  );
}
