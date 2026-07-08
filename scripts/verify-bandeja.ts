/**
 * Validación funcional y de rendimiento de la bandeja del cobrador.
 *
 * Uso: npx tsx scripts/verify-bandeja.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import {
  buildBandejaOrderBy,
  buildBandejaWhere,
  listarBandejaCobrador,
} from '../src/lib/cobranza/bandeja-cobrador-service';
import { filtroMandante } from '../src/lib/cobranza/mandante-scope';

const prisma = new PrismaClient();

interface Check {
  name: string;
  ok: boolean;
  detail?: string;
}

const checks: Check[] = [];

function check(name: string, ok: boolean, detail?: string): void {
  checks.push({ name, ok, detail });
  const suffix = detail ? `: ${detail}` : '';
  process.stdout.write(ok ? `  ✅ ${name}${suffix}\n` : `  ❌ ${name}${suffix}\n`);
}

async function main(): Promise<void> {
  process.stdout.write('\nValidación bandeja cobrador\n\n');

  const cobrador = await prisma.tbl_usuario.findFirst({
    where: { email: 'cobrador@flowpay.com', activo: true, deletedAt: null },
  });
  check('Usuario cobrador de prueba', !!cobrador);

  if (!cobrador) {
    await prisma.$disconnect();
    process.exit(1);
  }

  const mandanteFilter = await filtroMandante(cobrador.idusuario);
  const baseWhere = buildBandejaWhere(cobrador.idusuario, mandanteFilter, {});
  check(
    'Filtro base exige mora activa',
    JSON.stringify(baseWhere.diasMora) === JSON.stringify({ gt: 0 }),
  );

  const tramoWhere = buildBandejaWhere(cobrador.idusuario, mandanteFilter, {
    tramoMoraMin: 121,
  });
  check(
    'Tramo 121+ usa gte sin límite superior',
    JSON.stringify(tramoWhere.diasMora) === JSON.stringify({ gte: 121 }),
  );

  const tramoAcotado = buildBandejaWhere(cobrador.idusuario, mandanteFilter, {
    tramoMoraMin: 1,
    tramoMoraMax: 30,
  });
  check(
    'Tramo 1-30 acota rango',
    JSON.stringify(tramoAcotado.diasMora) ===
      JSON.stringify({ gte: 1, lte: 30 }),
  );

  const searchWhere = buildBandejaWhere(cobrador.idusuario, mandanteFilter, {
    search: 'TEST',
  });
  check(
    'Búsqueda incluye noPrestamo y codigoUnico',
    Array.isArray(searchWhere.OR) && searchWhere.OR.length === 2,
  );

  check(
    'Orden saldo descendente',
    buildBandejaOrderBy('saldo_desc')[0]?.saldoTotal === 'desc',
  );
  check(
    'Orden saldo ascendente',
    buildBandejaOrderBy('saldo_asc')[0]?.saldoTotal === 'asc',
  );

  const failedLogic = checks.filter((c) => !c.ok).length;
  if (failedLogic > 0) {
    process.stdout.write(`\n${checks.length - failedLogic}/${checks.length} checks OK (lógica)\n`);
    await prisma.$disconnect();
    process.exit(1);
  }

  try {
    const t0 = performance.now();
    const resultado = await listarBandejaCobrador(
      cobrador.idusuario,
      mandanteFilter,
      {},
      1,
      50,
    );
    const elapsedMs = Math.round(performance.now() - t0);
    check(
      'Consulta bandeja responde',
      Array.isArray(resultado.prestamos),
      `${resultado.total} préstamos en ${elapsedMs}ms`,
    );
    check('Consulta bandeja < 2000ms', elapsedMs < 2000, `${elapsedMs}ms`);

    if (resultado.prestamos.length > 0) {
      const prestamo = resultado.prestamos[0];
      check('Incluye cliente reducido', !!prestamo.cliente?.primer_nombres);
      check('Incluye mandante reducido', !!prestamo.mandante?.nombre);
      check('No carga relación gestor', !('gestor' in prestamo));
    }

    const t1 = performance.now();
    await listarBandejaCobrador(
      cobrador.idusuario,
      mandanteFilter,
      { ordenarPor: 'saldo_desc' },
      1,
      50,
    );
    const sortMs = Math.round(performance.now() - t1);
    check('Orden por saldo < 2000ms', sortMs < 2000, `${sortMs}ms`);

    try {
      const indexRows = await prisma.$queryRaw<Array<{ Key_name: string }>>`
        SHOW INDEX FROM tbl_prestamo WHERE Key_name = 'tbl_prestamo_idgestorAsignado_deletedAt_diasMora_idx'
      `;
      check(
        'Índice compuesto bandeja existe',
        indexRows.length > 0,
        indexRows.length > 0 ? 'ok' : 'ejecutar: npx prisma db push',
      );
    } catch {
      check(
        'Índice compuesto bandeja existe',
        false,
        'no verificado — ejecutar: npx prisma db push',
      );
    }
  } catch (error) {
    check(
      'Consulta bandeja en BD',
      false,
      error instanceof Error ? error.message.split('\n')[0] : String(error),
    );
  }

  const failed = checks.filter((c) => !c.ok).length;
  process.stdout.write(`\n${checks.length - failed}/${checks.length} checks OK\n`);

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (error: unknown) => {
  process.stderr.write(
    `Error: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  await prisma.$disconnect();
  process.exit(1);
});
