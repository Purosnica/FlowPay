'use client';

import Link from 'next/link';
import { use } from 'react';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_CLIENTE_VISTA_360 } from '@/lib/graphql/queries/cobranza.queries';
import { formatearMoneda } from '@/types/cobranza';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClienteDetallePage({ params }: PageProps) {
  const { id } = use(params);
  const idcliente = Number(id);

  const { data, isLoading, error } = useGraphQLQuery<{
    clienteVista360: {
      cliente: {
        idcliente: number;
        nombreCompleto: string;
        numerodocumento: string;
        celular: string | null;
        telefono: string | null;
        email: string | null;
        direccion: string | null;
      };
      totales: {
        saldoTotal: number;
        prestamosActivos: number;
        gestionesTotal: number;
        pagosMes: number;
      };
      prestamos: Array<{
        idprestamo: number;
        noPrestamo: string;
        estado: string;
        saldoTotal: number;
        diasMora: number;
        mandante: string;
      }>;
      gestionesRecientes: Array<{
        idgestion: number;
        fechaGestion: string;
        tipo: string;
        resultado: string | null;
        gestor: string | null;
      }>;
      pagosRecientes: Array<{
        idpago: number;
        fechaPago: string;
        monto: number;
        medio: string | null;
      }>;
      reclamos: Array<{
        idreclamo: number;
        estado: string;
        descripcion: string;
        fechaLimite: string;
      }>;
      contactos: Array<{
        idcontacto: number;
        tipo: string;
        valor: string;
        autorizado: boolean;
        noContactar: boolean;
      }>;
    };
  }>(GET_CLIENTE_VISTA_360, { idcliente }, { enabled: Number.isFinite(idcliente) });

  const v = data?.clienteVista360;

  return (
    <div className="space-y-8 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <Link href="/clientes" className="text-sm text-primary hover:underline">
          ← Clientes
        </Link>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Cargando vista 360°...</p>}
      {error && (
        <p className="text-sm text-red-600">No se pudo cargar el cliente.</p>
      )}

      {v && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-dark dark:text-white">
              {v.cliente.nombreCompleto}
            </h1>
            <p className="text-sm text-gray-500">
              {v.cliente.numerodocumento} · {v.cliente.celular ?? v.cliente.telefono ?? 'Sin teléfono'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg border p-4 dark:border-dark-3">
              <p className="text-xs text-gray-500">Saldo total</p>
              <p className="text-xl font-bold">{formatearMoneda(v.totales.saldoTotal)}</p>
            </div>
            <div className="rounded-lg border p-4 dark:border-dark-3">
              <p className="text-xs text-gray-500">Préstamos activos</p>
              <p className="text-xl font-bold">{v.totales.prestamosActivos}</p>
            </div>
            <div className="rounded-lg border p-4 dark:border-dark-3">
              <p className="text-xs text-gray-500">Pagos del mes</p>
              <p className="text-xl font-bold">{formatearMoneda(v.totales.pagosMes)}</p>
            </div>
            <div className="rounded-lg border p-4 dark:border-dark-3">
              <p className="text-xs text-gray-500">Gestiones recientes</p>
              <p className="text-xl font-bold">{v.gestionesRecientes.length}</p>
            </div>
          </div>

          <section className="rounded-lg border p-4 dark:border-dark-3">
            <h2 className="mb-3 font-semibold">Préstamos</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2">No.</th>
                    <th>Mandante</th>
                    <th>Estado</th>
                    <th>Mora</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {v.prestamos.map((p) => (
                    <tr key={p.idprestamo} className="border-b dark:border-dark-3">
                      <td className="py-2">
                        <Link
                          href={`/cobranza/prestamos/${p.idprestamo}`}
                          className="text-primary hover:underline"
                        >
                          {p.noPrestamo}
                        </Link>
                      </td>
                      <td>{p.mandante}</td>
                      <td>{p.estado}</td>
                      <td>{p.diasMora}d</td>
                      <td>{formatearMoneda(p.saldoTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg border p-4 dark:border-dark-3">
              <h2 className="mb-3 font-semibold">Gestiones recientes</h2>
              <ul className="space-y-2 text-sm">
                {v.gestionesRecientes.map((g) => (
                  <li key={g.idgestion} className="border-b pb-2 dark:border-dark-3">
                    <span className="font-medium">{g.tipo}</span>
                    <span className="text-gray-500"> — {g.resultado ?? 'Sin resultado'}</span>
                    <p className="text-xs text-gray-400">
                      {new Date(g.fechaGestion).toLocaleString('es-NI')} · {g.gestor ?? '—'}
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border p-4 dark:border-dark-3">
              <h2 className="mb-3 font-semibold">Contactos (Ley 787)</h2>
              <ul className="space-y-2 text-sm">
                {v.contactos.map((c) => (
                  <li key={c.idcontacto} className="flex justify-between border-b pb-2 dark:border-dark-3">
                    <span>
                      {c.tipo}: {c.valor}
                    </span>
                    <span className="text-xs text-gray-500">
                      {c.noContactar ? 'No contactar' : c.autorizado ? 'Autorizado' : 'Pendiente'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
