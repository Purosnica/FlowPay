'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  cellEstadoBadge,
  cellMoneda,
  cellMoraDias,
  cellPrestamoLink,
  cellTexto,
} from '@/components/cobranza/reporte-table-cells';
import { getContactoEstadoUi } from '@/lib/logic/cliente-contacto-estado';
import { LEY_787 } from '@/lib/compliance/ley-787-microcopy';
import { rutaComprobantePago } from '@/lib/logic/comprobante-pago-logic';
import { formatearMoneda } from '@/types/cobranza';
import type { ClienteVista360 } from '@/types/cliente';
import { formatFechaHoraNegocio } from '@/lib/utils/timezone';

interface ClienteVista360ViewProps {
  data: ClienteVista360;
}

function SectionPanel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
      <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">
        {title}
      </h2>
      {children}
    </section>
  );
}

function KpiTile({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string | number;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-1 dark:bg-gray-dark">
      <p className="text-xs text-gray-6">{label}</p>
      <p
        className={
          emphasize
            ? 'text-lg font-bold text-primary'
            : 'text-lg font-bold text-dark dark:text-white'
        }
      >
        {value}
      </p>
    </div>
  );
}

export function ClienteVista360View({ data }: ClienteVista360ViewProps) {
  const { cliente, totales, prestamos, gestionesRecientes, pagosRecientes, reclamos, contactos } =
    data;

  const telefono =
    cliente.celular ?? cliente.telefono ?? 'Sin teléfono';

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/clientes"
          className="text-sm text-primary hover:underline"
        >
          ← Clientes
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-dark dark:text-white">
          {cliente.nombreCompleto}
        </h1>
        <p className="text-gray-6">
          {cliente.numerodocumento} · {telefono}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiTile
          label="Saldo total"
          value={formatearMoneda(totales.saldoTotal)}
          emphasize
        />
        <KpiTile
          label="Préstamos activos"
          value={totales.prestamosActivos}
        />
        <KpiTile
          label="Pagos del mes"
          value={formatearMoneda(totales.pagosMes)}
        />
        <KpiTile
          label="Gestiones"
          value={totales.gestionesTotal}
        />
      </div>

      <Tabs defaultValue="resumen">
        <TabsList className="w-full">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="prestamos">
            Préstamos ({prestamos.length})
          </TabsTrigger>
          <TabsTrigger value="gestiones">
            Gestiones ({gestionesRecientes.length})
          </TabsTrigger>
          <TabsTrigger value="pagos">
            Pagos ({pagosRecientes.length})
          </TabsTrigger>
          <TabsTrigger value="contactos">
            Contactos ({contactos.length})
          </TabsTrigger>
          <TabsTrigger value="reclamos">
            Reclamos ({reclamos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-4 space-y-6">
          <SectionPanel title="Datos del cliente">
            <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div>
                <dt className="text-gray-6">Documento</dt>
                <dd className="font-medium text-dark dark:text-white">
                  {cliente.numerodocumento}
                </dd>
              </div>
              <div>
                <dt className="text-gray-6">Celular</dt>
                <dd className="font-medium text-dark dark:text-white">
                  {cellTexto(cliente.celular)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-6">Teléfono</dt>
                <dd className="font-medium text-dark dark:text-white">
                  {cellTexto(cliente.telefono)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-6">Email</dt>
                <dd className="font-medium text-dark dark:text-white">
                  {cellTexto(cliente.email)}
                </dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-gray-6">Dirección</dt>
                <dd className="font-medium text-dark dark:text-white">
                  {cellTexto(cliente.direccion)}
                </dd>
              </div>
            </dl>
          </SectionPanel>

          <SectionPanel title="Préstamos">
            <PrestamosTable prestamos={prestamos} />
          </SectionPanel>
        </TabsContent>

        <TabsContent value="prestamos" className="mt-4">
          <SectionPanel title="Préstamos">
            <PrestamosTable prestamos={prestamos} />
          </SectionPanel>
        </TabsContent>

        <TabsContent value="gestiones" className="mt-4">
          <SectionPanel title="Gestiones recientes">
            {gestionesRecientes.length === 0 ? (
              <EmptyState message="No hay gestiones recientes." />
            ) : (
              <ul className="divide-y divide-stroke dark:divide-dark-3">
                {gestionesRecientes.map((g) => (
                  <li
                    key={g.idgestion}
                    className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-dark dark:text-white">
                        {g.tipo}
                        <span className="font-normal text-gray-5">
                          {' '}
                          — {g.resultado ?? 'Sin resultado'}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-gray-5">
                        {formatFechaHoraNegocio(g.fechaGestion)} ·{' '}
                        {g.gestor ?? '—'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionPanel>
        </TabsContent>

        <TabsContent value="pagos" className="mt-4">
          <SectionPanel title="Pagos recientes">
            {pagosRecientes.length === 0 ? (
              <EmptyState message="No hay pagos recientes." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stroke bg-gray-2 text-left text-gray-6 dark:border-dark-3 dark:bg-dark-2">
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium">Medio</th>
                      <th className="px-4 py-3 font-medium">Monto</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {pagosRecientes.map((p) => (
                      <tr
                        key={p.idpago}
                        className="border-b border-stroke dark:border-dark-3"
                      >
                        <td className="px-4 py-3">
                          {new Date(p.fechaPago).toLocaleDateString('es-NI')}
                        </td>
                        <td className="px-4 py-3">{cellTexto(p.medio)}</td>
                        <td className="px-4 py-3 font-medium text-primary">
                          {cellMoneda(p.monto)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={rutaComprobantePago(p.idpago)}>
                            <Button size="sm" variant="outline">
                              Comprobante
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionPanel>
        </TabsContent>

        <TabsContent value="contactos" className="mt-4">
          <SectionPanel title={`Contactos (${LEY_787.tituloCorto})`}>
            {contactos.length === 0 ? (
              <EmptyState message="No hay contactos registrados." />
            ) : (
              <>
                <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
                  {LEY_787.panelContactos}
                </p>
                <ul className="divide-y divide-stroke dark:divide-dark-3">
                {contactos.map((c) => {
                  const estado = getContactoEstadoUi(c);
                  return (
                    <li
                      key={c.idcontacto}
                      className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                    >
                      <span className="font-medium text-dark dark:text-white">
                        {c.tipo}: {c.valor}
                      </span>
                      <Badge variant={estado.variant} size="sm">
                        {estado.label}
                      </Badge>
                    </li>
                  );
                })}
                </ul>
              </>
            )}
          </SectionPanel>
        </TabsContent>

        <TabsContent value="reclamos" className="mt-4">
          <SectionPanel title="Reclamos">
            {reclamos.length === 0 ? (
              <EmptyState message="No hay reclamos registrados." />
            ) : (
              <ul className="divide-y divide-stroke dark:divide-dark-3">
                {reclamos.map((r) => (
                  <li
                    key={r.idreclamo}
                    className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-dark dark:text-white">
                        {r.descripcion}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-5">
                        Límite:{' '}
                        {new Date(r.fechaLimite).toLocaleDateString('es-NI')}
                      </p>
                    </div>
                    {cellEstadoBadge(r.estado)}
                  </li>
                ))}
              </ul>
            )}
          </SectionPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PrestamosTable({
  prestamos,
}: {
  prestamos: ClienteVista360['prestamos'];
}) {
  if (prestamos.length === 0) {
    return <EmptyState message="Este cliente no tiene préstamos." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stroke bg-gray-2 text-left text-gray-6 dark:border-dark-3 dark:bg-dark-2">
            <th className="px-4 py-3 font-medium">No.</th>
            <th className="px-4 py-3 font-medium">Mandante</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Mora</th>
            <th className="px-4 py-3 font-medium">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {prestamos.map((p) => (
            <tr
              key={p.idprestamo}
              className="border-b border-stroke dark:border-dark-3"
            >
              <td className="px-4 py-3">
                {cellPrestamoLink(p.idprestamo, p.noPrestamo)}
              </td>
              <td className="px-4 py-3">{p.mandante}</td>
              <td className="px-4 py-3">{cellEstadoBadge(p.estado)}</td>
              <td className="px-4 py-3">
                {cellMoraDias(p.diasMora)}
                <span className="text-gray-5">d</span>
              </td>
              <td className="px-4 py-3 font-medium text-primary">
                {cellMoneda(p.saldoTotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ClienteVista360Loading() {
  return (
    <div className="flex justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export function ClienteVista360Error() {
  return (
    <div className="space-y-4">
      <p className="text-red-600">No se pudo cargar el cliente o sin acceso.</p>
      <Link href="/clientes">
        <Button variant="outline">Volver a clientes</Button>
      </Link>
    </div>
  );
}
