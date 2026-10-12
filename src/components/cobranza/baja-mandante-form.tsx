'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { MandanteSelect } from './mandante-select';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { GET_CAMPANAS } from '@/lib/graphql/queries/cobranza.queries';
import { csrfHeaders } from '@/lib/security/csrf';
import type { Campana } from '@/types/cobranza';

type Detalle = {
  iddetalle: number;
  fila: number;
  numeroPtmo: string;
  resultado: string;
  mensaje: string | null;
  saldoSnapshot: number | null;
  cobradorAnterior: string | null;
};
type Lote = {
  idlote: number;
  codigo: string;
  estado: string;
  totalRecibidos: number;
  totalElegibles: number;
  totalExitosos: number;
  totalRechazados: number;
  saldoRetirado: number;
  mandante: { nombre: string };
  detalles: Detalle[];
  resumenCobradores: { nombre: string; cantidad: number }[];
  resumenCarteras: { cartera: string; cantidad: number }[];
};
type LoteResumen = Pick<Lote, 'idlote' | 'codigo' | 'estado' | 'totalRecibidos' | 'totalElegibles' | 'totalExitosos' | 'totalRechazados'> & { createdAt: string; fechaEfectiva: string };

const MOTIVOS = [
  ['REDUCCION_CARTERA', 'Reducción de cartera por el mandante'],
  ['RETIRO_SOLICITADO', 'Retiro solicitado por el mandante'],
  ['FINALIZACION_GESTION', 'Finalización de gestión'],
  ['REASIGNACION_MANDANTE', 'Reasignación de cartera por el mandante'],
  ['OTRO', 'Otro motivo'],
] as const;

export function BajaMandanteForm() {
  const [idmandante, setIdmandante] = useState<number | ''>('');
  const [mandanteNombre, setMandanteNombre] = useState('');
  const [idcampana, setIdcampana] = useState<number | ''>('');
  const [motivo, setMotivo] = useState<string>(MOTIVOS[0][0]);
  const [fechaEfectiva, setFechaEfectiva] = useState(new Date().toISOString().slice(0, 10));
  const [observaciones, setObservaciones] = useState('');
  const [referencia, setReferencia] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [lote, setLote] = useState<Lote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [confirmarReversion, setConfirmarReversion] = useState(false);
  const [motivoReversion, setMotivoReversion] = useState('');
  const [historial, setHistorial] = useState<LoteResumen[]>([]);

  const { data: campanasData } = useGraphQLQuery<{ campanas: { campanas: Campana[] } }>(
    GET_CAMPANAS,
    { idmandante: Number(idmandante), page: 1, pageSize: 100 },
    { enabled: typeof idmandante === 'number' },
  );
  const campanas = campanasData?.campanas.campanas ?? [];
  const conteos = useMemo(() => {
    const result: Record<string, number> = {};
    for (const d of lote?.detalles ?? []) result[d.resultado] = (result[d.resultado] ?? 0) + 1;
    return result;
  }, [lote]);

  useEffect(() => {
    if (!idmandante) { setHistorial([]); return; }
    void fetch(`/api/cobranza/bajas-mandante?idmandante=${idmandante}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((json: { success: boolean; data?: LoteResumen[] }) => setHistorial(json.success ? json.data ?? [] : []))
      .catch(() => setHistorial([]));
  }, [idmandante, lote?.estado]);

  async function abrirLote(idlote: number) {
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/cobranza/bajas-mandante?idlote=${idlote}`, { credentials: 'include' });
      const json = await response.json() as { success: boolean; data?: Lote; error?: string };
      if (!response.ok || !json.success || !json.data) throw new Error(json.error ?? 'No fue posible consultar el lote.');
      setLote(json.data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible consultar el lote.'); }
    finally { setLoading(false); }
  }

  async function validar() {
    setError(null);
    setLote(null);
    if (!idmandante || !archivo || !fechaEfectiva || (motivo === 'OTRO' && !observaciones.trim())) {
      setError('Complete mandante, fecha, motivo, archivo y la explicación requerida.');
      return;
    }
    const form = new FormData();
    form.append('archivo', archivo);
    form.append('idmandante', String(idmandante));
    if (idcampana) form.append('idcampana', String(idcampana));
    form.append('motivo', motivo);
    form.append('fechaEfectiva', `${fechaEfectiva}T00:00:00`);
    form.append('observaciones', observaciones);
    form.append('referenciaMandante', referencia);
    setLoading(true);
    try {
      const response = await fetch('/api/cobranza/bajas-mandante', {
        method: 'POST', credentials: 'include', body: form,
        headers: { ...csrfHeaders(), 'idempotency-key': crypto.randomUUID() },
      });
      const json = await response.json() as { success: boolean; data?: Lote; error?: string };
      if (!response.ok || !json.success || !json.data) throw new Error(json.error ?? 'No fue posible validar el archivo.');
      setLote(json.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible validar el archivo.');
    } finally { setLoading(false); }
  }

  async function ejecutar() {
    if (!lote) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/cobranza/bajas-mandante', {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ accion: 'ejecutar', idlote: lote.idlote }),
      });
      const json = await response.json() as { success: boolean; data?: Lote; error?: string };
      if (!response.ok || !json.success || !json.data) throw new Error(json.error ?? 'No fue posible ejecutar la baja.');
      setLote(json.data);
      setConfirmar(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible ejecutar la baja.'); }
    finally { setLoading(false); }
  }

  async function revertir() {
    if (!lote || motivoReversion.trim().length < 5) return;
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/cobranza/bajas-mandante', {
        method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ accion: 'revertir', idlote: lote.idlote, motivo: motivoReversion }),
      });
      const json = await response.json() as { success: boolean; data?: Lote; error?: string };
      if (!response.ok || !json.success || !json.data) throw new Error(json.error ?? 'No fue posible revertir la baja.');
      setLote(json.data); setConfirmarReversion(false); setMotivoReversion('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible revertir la baja.'); }
    finally { setLoading(false); }
  }

  function descargarResultado() {
    if (!lote) return;
    const q = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`;
    const rows = [['fila', 'numero_ptmo', 'resultado', 'mensaje', 'cobrador_anterior', 'saldo'], ...lote.detalles.map((d) => [d.fila, d.numeroPtmo, d.resultado, d.mensaje ?? '', d.cobradorAnterior ?? '', d.saldoSnapshot ?? ''])];
    const blob = new Blob([`\ufeff${rows.map((r) => r.map(q).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${lote.codigo}-resultado.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return <div className="space-y-6">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <MandanteSelect value={idmandante} required onChange={(value, m) => { setIdmandante(value); setMandanteNombre(m?.nombre ?? ''); setIdcampana(''); setLote(null); }} />
      <label className="text-sm font-medium">Cartera/campaña (opcional)
        <select value={idcampana} disabled={!idmandante} onChange={(e) => setIdcampana(e.target.value ? Number(e.target.value) : '')} className="mt-1.5 w-full rounded-lg border border-stroke bg-transparent px-3 py-2 dark:border-dark-3 dark:bg-dark-2">
          <option value="">Todas las carteras del mandante</option>{campanas.map((c) => <option key={c.idcampana} value={c.idcampana}>{c.nombre}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium">Motivo *
        <select value={motivo} onChange={(e) => setMotivo(e.target.value as typeof motivo)} className="mt-1.5 w-full rounded-lg border border-stroke bg-transparent px-3 py-2 dark:border-dark-3 dark:bg-dark-2">
          {MOTIVOS.map(([v, label]) => <option value={v} key={v}>{label}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium">Fecha efectiva *
        <input type="date" value={fechaEfectiva} onChange={(e) => setFechaEfectiva(e.target.value)} className="mt-1.5 w-full rounded-lg border border-stroke bg-transparent px-3 py-2 dark:border-dark-3 dark:bg-dark-2" />
      </label>
      <label className="text-sm font-medium">Referencia del mandante
        <input value={referencia} maxLength={150} onChange={(e) => setReferencia(e.target.value)} className="mt-1.5 w-full rounded-lg border border-stroke bg-transparent px-3 py-2 dark:border-dark-3 dark:bg-dark-2" />
      </label>
      <label className="text-sm font-medium">Archivo .xlsx o .csv *
        <input type="file" accept=".xlsx,.csv" onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); setLote(null); }} className="mt-2 block w-full text-sm" />
      </label>
      <label className="text-sm font-medium md:col-span-2">Observaciones {motivo === 'OTRO' ? '*' : ''}
        <textarea value={observaciones} maxLength={2000} onChange={(e) => setObservaciones(e.target.value)} rows={3} className="mt-1.5 w-full rounded-lg border border-stroke bg-transparent px-3 py-2 dark:border-dark-3 dark:bg-dark-2" />
      </label>
    </div>
    {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">{error}</div>}
    <Button onClick={validar} disabled={loading}>{loading ? 'Procesando…' : 'Validar archivo'}</Button>

    {lote && <section className="space-y-4 rounded-lg border border-stroke p-4 dark:border-dark-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Lote {lote.codigo}</h2><p className="text-sm text-gray-500">Estado: {lote.estado}</p></div><Button variant="outline" onClick={descargarResultado}>Descargar validación CSV</Button></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['Recibidos', lote.totalRecibidos], ['Elegibles', lote.totalElegibles], ['Ya inactivos', conteos.YA_INACTIVO ?? 0], ['Duplicados', conteos.DUPLICADO ?? 0], ['No encontrados', conteos.NO_ENCONTRADO ?? 0], ['Otro mandante/cartera', (conteos.OTRO_MANDANTE ?? 0) + (conteos.FUERA_CARTERA ?? 0)], ['Ambiguos/errores', (conteos.AMBIGUO ?? 0) + (conteos.ERROR_FORMATO ?? 0)], ['Saldo elegible', lote.detalles.filter((d) => d.resultado === 'ELEGIBLE').reduce((s, d) => s + (d.saldoSnapshot ?? 0), 0).toLocaleString('es-NI')]].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-gray-2 p-3 dark:bg-dark-2"><p className="text-xs text-gray-500">{label}</p><p className="font-semibold">{value}</p></div>)}
      </div>
      <div className="grid gap-4 md:grid-cols-2"><div><h3 className="text-sm font-semibold">Cobradores afectados</h3>{lote.resumenCobradores.map((x) => <p key={x.nombre} className="text-sm">{x.nombre}: {x.cantidad}</p>)}</div><div><h3 className="text-sm font-semibold">Distribución por cartera</h3>{lote.resumenCarteras.map((x) => <p key={x.cartera} className="text-sm">{x.cartera}: {x.cantidad}</p>)}</div></div>
      <div className="max-h-80 overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-white dark:bg-dark"><tr><th className="p-2">Fila</th><th className="p-2">PTMO</th><th className="p-2">Resultado</th><th className="p-2">Detalle</th></tr></thead><tbody>{lote.detalles.slice(0, 500).map((d) => <tr key={d.iddetalle} className="border-t border-stroke dark:border-dark-3"><td className="p-2">{d.fila}</td><td className="p-2 font-mono">{d.numeroPtmo}</td><td className="p-2">{d.resultado}</td><td className="p-2">{d.mensaje ?? '—'}</td></tr>)}</tbody></table>{lote.detalles.length > 500 && <p className="p-2 text-xs text-gray-500">Se muestran 500 filas. Descargue el CSV para ver todas.</p>}</div>
      {lote.estado === 'VALIDADO' && <Button variant="danger" disabled={lote.totalElegibles === 0} onClick={() => setConfirmar(true)}>Confirmar baja de {lote.totalElegibles} préstamos</Button>}
      {lote.estado.startsWith('COMPLETADO') && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-green-50 p-3 text-sm text-green-800"><span>Baja finalizada: {lote.totalExitosos} préstamos retirados; {lote.totalRechazados} rechazados.</span><Button variant="outline" onClick={() => setConfirmarReversion(true)}>Reactivar lote</Button></div>}
    </section>}
    {historial.length > 0 && <section className="rounded-lg border border-stroke p-4 dark:border-dark-3"><h2 className="mb-3 font-semibold">Historial de bajas</h2><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Lote</th><th className="p-2">Estado</th><th className="p-2">Fecha efectiva</th><th className="p-2">Recibidos</th><th className="p-2">Exitosos</th><th className="p-2"></th></tr></thead><tbody>{historial.map((h) => <tr key={h.idlote} className="border-t border-stroke dark:border-dark-3"><td className="p-2 font-mono">{h.codigo}</td><td className="p-2">{h.estado}</td><td className="p-2">{String(h.fechaEfectiva).slice(0, 10)}</td><td className="p-2">{h.totalRecibidos}</td><td className="p-2">{h.totalExitosos}</td><td className="p-2"><Button size="sm" variant="outline" onClick={() => abrirLote(h.idlote)}>Ver</Button></td></tr>)}</tbody></table></div></section>}
    <ConfirmDialog isOpen={confirmar} onClose={() => setConfirmar(false)} onConfirm={ejecutar} isLoading={loading} title="Confirmar baja masiva" confirmLabel={`Dar de baja ${lote?.totalElegibles ?? 0} préstamos`} description={<>Se retirarán de la gestión activa <strong>{lote?.totalElegibles ?? 0}</strong> préstamos del mandante <strong>{mandanteNombre || lote?.mandante.nombre}</strong>. El historial será conservado.</>} />
    <ConfirmDialog isOpen={confirmarReversion} onClose={() => setConfirmarReversion(false)} onConfirm={revertir} isLoading={loading} disabled={motivoReversion.trim().length < 5} variant="warning" title="Reactivar préstamos" confirmLabel="Confirmar reactivación" description="Los préstamos volverán a la cartera activa sin asignarse automáticamente al cobrador anterior."><label className="block text-sm font-medium">Motivo de reactivación *<textarea value={motivoReversion} onChange={(e) => setMotivoReversion(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-stroke p-2 dark:border-dark-3 dark:bg-dark-2" /></label></ConfirmDialog>
  </div>;
}
