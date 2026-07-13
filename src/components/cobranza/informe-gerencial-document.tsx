'use client';

import { formatearMoneda, type InformeGerencial } from '@/types/cobranza';

interface Props {
  informe: InformeGerencial;
  destinatarioNombre: string;
  destinatarioCargo: string;
}

function TableSimple({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <table className="informe-table w-full border-collapse text-sm">
      <thead>
        <tr>
          {headers.map((h) => (
            <th
              key={h}
              className="border border-[#1e3a5f] bg-[#1e3a5f] px-2 py-1.5 text-left font-semibold text-white"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
            {row.map((cell, j) => (
              <td
                key={j}
                className="border border-slate-300 px-2 py-1.5 text-slate-800"
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TicTacLogo({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const text = variant === 'light' ? 'text-white' : 'text-[#0b2a4a]';
  const box = variant === 'light' ? 'bg-white/90' : 'bg-[#0b2a4a]';
  const icon = variant === 'light' ? 'text-[#0b2a4a]' : 'text-white';
  return (
    <div className={`flex items-center gap-2 ${text}`}>
      <div className="flex flex-col gap-0.5">
        <div
          className={`flex h-5 w-5 items-center justify-center ${box} text-[10px] font-bold ${icon}`}
        >
          ⏱
        </div>
        <div
          className={`flex h-5 w-5 items-center justify-center ${box} text-[10px] font-bold ${icon}`}
        >
          $
        </div>
      </div>
      <div className="text-lg font-extrabold leading-tight tracking-wide">
        <div>TIC</div>
        <div>TAC</div>
      </div>
    </div>
  );
}

export function InformeGerencialDocument({
  informe,
  destinatarioNombre,
  destinatarioCargo,
}: Props) {
  const ind = informe.indicadores;
  const n = informe.narrativa;

  return (
    <div id="informe-gerencial-print" className="informe-doc bg-white text-slate-900">
      {/* Portada */}
      <section className="informe-page relative flex min-h-[100vh] flex-col justify-between overflow-hidden bg-[#0b2a4a] p-10 text-white print:min-h-[100vh]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'linear-gradient(135deg, transparent 30%, #1e5a8a 55%, #3b9dd6 100%)',
            clipPath: 'polygon(35% 0, 100% 0, 100% 100%, 15% 100%)',
          }}
        />
        <div
          className="pointer-events-none absolute -right-20 top-1/4 h-[70%] w-[70%] opacity-30"
          style={{
            background:
              'linear-gradient(90deg, #2b6ea8 0%, #5eb8e8 100%)',
            clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)',
          }}
        />
        <div className="relative z-10">
          <TicTacLogo variant="light" />
        </div>
        <div className="relative z-10 max-w-xl space-y-6 pb-8">
          <h1 className="text-4xl font-black uppercase leading-[1.05] tracking-tight md:text-5xl">
            Informe
            <br />
            Gerencial
            <br />
            de Gestión
            <br />
            de Cobranza
          </h1>
          <div>
            <p className="text-sm text-white/70">Dirigido a</p>
            <p className="text-2xl font-bold uppercase tracking-wide">
              {informe.mandanteNombre}
            </p>
          </div>
          <div>
            <p className="text-sm text-white/70">Periodo.</p>
            <p className="text-lg">{informe.periodoLabel}</p>
          </div>
        </div>
      </section>

      {/* Cuerpo */}
      <section className="informe-page relative overflow-hidden px-10 py-8 print:px-10">
        {/* Decoración letterhead */}
        <div
          className="pointer-events-none absolute right-0 top-0 h-20 w-28 bg-[#0b2a4a]"
          style={{ clipPath: 'polygon(25% 0, 100% 0, 100% 100%)' }}
        />
        <div className="pointer-events-none absolute right-0 top-[4.5rem] h-0.5 w-24 bg-[#5eb8e8]" />
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-24 w-40 bg-[#7eb8d8]/30"
          style={{
            clipPath: 'ellipse(80% 100% at 0% 100%)',
          }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 h-16 w-48 bg-[#0b2a4a]"
          style={{
            clipPath: 'ellipse(100% 100% at 100% 100%)',
          }}
        />

        <div className="relative mb-6 flex items-start justify-between">
          <TicTacLogo />
        </div>

        <h2 className="relative mb-2 text-center text-xl font-bold uppercase tracking-wide text-[#0b2a4a]">
          Informe Gerencial de Gestión de Cobranza
        </h2>
        <p className="relative mb-4 text-center text-xs text-slate-500">
          Periodo: {informe.periodoLabel} · Mandante: {informe.mandanteNombre}
        </p>

        <nav className="relative mb-6 rounded border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
          <p className="mb-1 font-semibold text-[#0b2a4a]">Contenido</p>
          <ol className="list-decimal space-y-0.5 pl-4">
            <li>Resumen ejecutivo</li>
            <li>Indicadores clave de gestión</li>
            <li>Alcance de la gestión</li>
            <li>Control y comportamiento de cartera</li>
            <li>Detalle de clientes con promesas y acuerdos</li>
            <li>Clientes que realizaron pagos</li>
            <li>Principales hallazgos y brechas</li>
            <li>Acciones estratégicas recomendadas</li>
            <li>Plan de trabajo próximo período</li>
            <li>Conclusión gerencial</li>
          </ol>
        </nav>

        <div className="relative mb-4 space-y-0.5 text-sm">
          <p>{destinatarioCargo ? `${destinatarioCargo}.` : 'Ingeniero.'}</p>
          <p className="font-semibold">{destinatarioNombre || '—'}</p>
          <p>Gerente General</p>
          <p>{informe.mandanteNombre}</p>
        </div>

        <p className="mb-2 text-sm font-medium">
          De nuestra mayor consideración:
        </p>
        <p className="mb-6 text-sm leading-relaxed">
          Nos permitimos remitir el presente Informe Gerencial de Gestión de
          Cobranza, correspondiente al periodo comprendido del{' '}
          {informe.periodoLabel}, en el marco del servicio de recuperación de
          cartera, detallando los avances, resultados y acciones ejecutadas.
        </p>

        <h3 className="mb-2 text-base font-bold text-[#0b2a4a]">
          1. RESUMEN EJECUTIVO
        </h3>
        <p className="mb-3 text-sm leading-relaxed">{n.resumenEjecutivo}</p>
        <p className="mb-1 text-sm font-semibold">
          Indicadores Clave de Gestión
        </p>
        <p className="mb-2 text-sm">Resultados clave del período:</p>
        <div className="mb-3">
          <TableSimple
            headers={['Indicador', 'Resultado']}
            rows={[
              [
                'Monto total recuperado efectivamente',
                formatearMoneda(ind.montoRecuperado),
              ],
              [
                'Acuerdos de pago formalizados',
                `${ind.acuerdosFormalizados} nuevos acuerdos`,
              ],
              [
                'Acuerdos incumplidos',
                String(ind.acuerdosIncumplidos),
              ],
            ]}
          />
        </div>
        <p className="mb-1 text-sm font-semibold">Valoración general:</p>
        <p className="mb-6 text-sm leading-relaxed">{n.valoracionGeneral}</p>

        <h3 className="mb-2 text-base font-bold text-[#0b2a4a]">
          2. INDICADORES CLAVE DE GESTIÓN
        </h3>
        <div className="mb-6">
          <TableSimple
            headers={['Indicador', 'Valor']}
            rows={[
              ['Monto recuperado', formatearMoneda(ind.montoRecuperado)],
              ['Acuerdos formalizados', String(ind.acuerdosFormalizados)],
              ['Acuerdos incumplidos', String(ind.acuerdosIncumplidos)],
              [
                'Eficacia de acuerdos',
                `${ind.eficaciaAcuerdosPct}% (${ind.acuerdosCumplidos} de ${ind.acuerdosFormalizados} cumplido${ind.acuerdosCumplidos === 1 ? '' : 's'})`,
              ],
            ]}
          />
        </div>

        <h3 className="mb-2 text-base font-bold text-[#0b2a4a]">
          3. ALCANCE DE LA GESTIÓN
        </h3>
        <h4 className="mb-1 text-sm font-semibold">3.1 Acciones desarrolladas</h4>
        <p className="mb-1 text-sm">Las acciones desarrolladas comprendieron:</p>
        <ul className="mb-3 list-disc space-y-1 pl-5 text-sm">
          {informe.accionesDesarrolladas.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <h4 className="mb-1 text-sm font-semibold">3.2 Canales utilizados</h4>
        <div className="mb-6">
          <TableSimple
            headers={['Canal', 'Uso']}
            rows={informe.canales.map((c) => [c.canal, c.uso])}
          />
        </div>

        <h3 className="mb-2 text-base font-bold text-[#0b2a4a]">
          4. CONTROL Y COMPORTAMIENTO DE CARTERA
        </h3>
        <p className="mb-3 text-sm leading-relaxed">
          La cartera se mantiene bajo control operativo, con seguimiento
          individualizado por cliente y priorización basada en nivel de
          morosidad y riesgo de incobrabilidad.
        </p>
        <h4 className="mb-1 text-sm font-semibold">4.1 Segmentos identificados</h4>
        <div className="mb-3">
          <TableSimple
            headers={['Segmento', 'Descripción', 'Porcentaje estimado']}
            rows={informe.segmentos.map((s) => [
              s.segmento,
              s.descripcion,
              `${s.porcentaje}%`,
            ])}
          />
        </div>
        <h4 className="mb-1 text-sm font-semibold">
          4.2 Gestión diferenciada por perfil
        </h4>
        <div className="mb-6">
          <TableSimple
            headers={['Perfil', 'Acción aplicada', 'Frecuencia']}
            rows={informe.perfilesGestion.map((p) => [
              p.perfil,
              p.accion,
              p.frecuencia,
            ])}
          />
        </div>

        <h3 className="mb-2 text-base font-bold text-[#0b2a4a]">
          5. DETALLE DE CLIENTES CON PROMESAS Y ACUERDOS DE PAGO
        </h3>
        <p className="mb-2 text-sm leading-relaxed">
          A continuación, se detallan los{' '}
          <strong>{informe.acuerdos.length} acuerdos formalizados</strong>{' '}
          durante el período, con su estatus actual:
        </p>
        <div className="mb-6 overflow-x-auto">
          <TableSimple
            headers={[
              'N°',
              'Cliente',
              'Saldo Total (C$)',
              'Tipo de Arreglo',
              'Monto de Cuota (C$)',
              'Plazo',
              'Fecha de Primer Pago',
              'Estatus',
            ]}
            rows={
              informe.acuerdos.length > 0
                ? informe.acuerdos.map((a) => [
                    String(a.numero),
                    a.cliente,
                    a.saldoTotal.toLocaleString('es-NI', {
                      minimumFractionDigits: 2,
                    }),
                    a.tipoArreglo,
                    formatearMoneda(a.montoCuota),
                    a.plazo,
                    a.fechaPrimerPago,
                    a.estatus,
                  ])
                : [['—', 'Sin acuerdos en el período', '—', '—', '—', '—', '—', '—']]
            }
          />
        </div>

        <h3 className="mb-2 text-base font-bold text-[#0b2a4a]">
          6. CLIENTES QUE REALIZARON PAGOS
        </h3>
        <p className="mb-2 text-sm">
          Detalle de pagos aplicados en el período (
          {formatearMoneda(ind.montoRecuperado)} recuperados):
        </p>
        <div className="mb-6 overflow-x-auto">
          <table className="informe-table w-full border-collapse text-xs">
            <thead>
              <tr>
                {[
                  'Cliente',
                  'N° Prestamo',
                  'Código único',
                  'Monto original',
                  'Pagado',
                  'Fecha',
                  'Banco-Referencia',
                  'Ejecutivo',
                  'Depto/ciud',
                  'Sucursal',
                  'Tramo mora',
                ].map((h) => (
                  <th
                    key={h}
                    className="border border-[#1e3a5f] bg-[#1e3a5f] px-1.5 py-1 text-left font-semibold text-white"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {informe.pagos.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="border border-slate-300 px-2 py-2 text-center"
                  >
                    Sin pagos aplicados en el período
                  </td>
                </tr>
              ) : (
                informe.pagos.map((p, i) => (
                  <tr
                    key={`${p.noPrestamo}-${p.fechaPago}-${i}`}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                  >
                    <td className="border border-slate-300 px-1.5 py-1">
                      {p.cliente}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1">
                      {p.noPrestamo}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1">
                      {p.codigoUnico}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 font-medium text-red-600">
                      {formatearMoneda(p.montoOriginal)}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1">
                      {formatearMoneda(p.montoPagado)}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1">
                      {p.fechaPago}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1">
                      {p.medioReferencia}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 uppercase">
                      {p.ejecutivo}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1 uppercase">
                      {p.departamentoCiudad}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1">
                      {p.sucursal}
                    </td>
                    <td className="border border-slate-300 px-1.5 py-1">
                      {p.diasMora}
                    </td>
                  </tr>
                ))
              )}
              {informe.pagos.length > 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="border border-slate-300 px-1.5 py-1 text-right font-semibold"
                  >
                    Total recuperado
                  </td>
                  <td className="border border-slate-300 bg-yellow-200 px-1.5 py-1 font-bold">
                    {formatearMoneda(ind.montoRecuperado)}
                  </td>
                  <td colSpan={6} className="border border-slate-300" />
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h3 className="mb-2 text-base font-bold text-[#0b2a4a]">
          7. PRINCIPALES HALLAZGOS Y BRECHAS DE GESTIÓN
        </h3>
        <h4 className="mb-1 text-sm font-semibold">7.1 Hallazgos positivos</h4>
        <ul className="mb-3 list-disc space-y-1 pl-5 text-sm">
          {n.hallazgosPositivos.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <h4 className="mb-1 text-sm font-semibold">
          7.2 Brechas críticas identificadas
        </h4>
        <ul className="mb-6 list-disc space-y-1 pl-5 text-sm">
          {n.brechasCriticas.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>

        <h3 className="mb-2 text-base font-bold text-[#0b2a4a]">
          8. ACCIONES ESTRATÉGICAS RECOMENDADAS
        </h3>
        <p className="mb-2 text-sm">
          Como empresa especializada en recuperación de cartera, implementaremos
          las siguientes acciones en el próximo período:
        </p>
        <div className="mb-6">
          <TableSimple
            headers={['Acción', 'Responsable', 'Fecha límite', 'KPI de éxito']}
            rows={informe.accionesRecomendadas.map((a) => [
              a.accion,
              a.responsable,
              a.fechaLimite,
              a.kpiExito,
            ])}
          />
        </div>

        <h3 className="mb-2 text-base font-bold text-[#0b2a4a]">
          9. PLAN DE TRABAJO PARA EL PRÓXIMO PERÍODO (
          {informe.proximoPeriodoLabel.toUpperCase()})
        </h3>
        <div className="mb-3">
          <TableSimple
            headers={['Actividad', 'Frecuencia', 'Responsable']}
            rows={informe.planTrabajo.map((p) => [
              p.actividad,
              p.frecuencia,
              p.responsable,
            ])}
          />
        </div>
        <p className="mb-1 text-sm font-semibold">
          Compromisos del equipo para{' '}
          {informe.proximoPeriodoLabel.toLowerCase()}:
        </p>
        <ul className="mb-6 list-disc space-y-1 pl-5 text-sm">
          {n.compromisosProximoPeriodo.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>

        <h3 className="mb-2 text-base font-bold text-[#0b2a4a]">
          10. CONCLUSIÓN GERENCIAL
        </h3>
        <div className="mb-8 whitespace-pre-line text-sm leading-relaxed">
          {n.conclusion}
        </div>

        <div className="mt-10 text-sm">
          <p className="mb-8">Atentamente,</p>
          <p className="font-semibold">Equipo de Gestión de Cobranza</p>
          <p>TIC TAC</p>
        </div>
      </section>
    </div>
  );
}
