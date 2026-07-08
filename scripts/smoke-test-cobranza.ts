/**
 * Smoke test de cobranza FlowPay.
 *
 * Uso:
 *   npm run smoke:test
 *   SMOKE_BASE_URL=http://localhost:3000 npm run smoke:test:live
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../src/lib/auth/jwt';
import { verifyTokenEdge } from '../src/lib/middleware/jwt-edge';
import { obtenerPermisosUsuario } from '../src/lib/permissions/permission-service';
import { PERMISO } from '../src/lib/permissions/permiso-codes';
import {
  obtenerReglaPermisoRuta,
  usuarioTieneAccesoRuta,
} from '../src/lib/navigation/route-permissions';
import { obtenerReporteAgingCartera } from '../src/lib/cobranza/aging-cartera-service';
import { simularAcuerdo } from '../src/lib/cobranza/acuerdo-simulator';
import { csrfHeaders } from '../src/lib/security/csrf';
import { requerirAccesoCliente } from '../src/lib/cobranza/mandante-scope';
import { GraphQLPermissionError } from '../src/lib/errors/graphql-errors';

const prisma = new PrismaClient();

interface SmokeResult {
  name: string;
  ok: boolean;
  detail?: string;
}

const results: SmokeResult[] = [];

function check(name: string, ok: boolean, detail?: string): void {
  results.push({ name, ok, detail });
  const suffix = detail ? `: ${detail}` : '';
  if (ok) {
    process.stdout.write(`  ✅ ${name}${suffix}\n`);
  } else {
    process.stderr.write(`  ❌ ${name}${suffix}\n`);
  }
}

async function checkEnv(): Promise<void> {
  check('DATABASE_URL definida', !!process.env.DATABASE_URL);
  check(
    'JWT_SECRET definida',
    !!process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16,
    process.env.JWT_SECRET ? `${process.env.JWT_SECRET.length} chars` : 'falta',
  );
}

async function checkDatabase(): Promise<{
  adminId: number;
  cobradorId: number;
  supervisorId: number;
  gerenteId: number;
  mandanteId: number | null;
}> {
  await prisma.$connect();
  check('Conexión MySQL', true);

  const admin = await prisma.tbl_usuario.findFirst({
    where: { email: 'admin@flowpay.com', activo: true, deletedAt: null },
  });
  check('Usuario admin@flowpay.com', !!admin);

  const cobrador = await prisma.tbl_usuario.findFirst({
    where: { email: 'cobrador@flowpay.com', activo: true, deletedAt: null },
  });
  check('Usuario cobrador@flowpay.com', !!cobrador);

  const supervisor = await prisma.tbl_usuario.findFirst({
    where: {
      rol: { codigo: 'SUPERVISOR' },
      activo: true,
      deletedAt: null,
    },
  });
  check('Usuario rol SUPERVISOR', !!supervisor);

  const gerente = await prisma.tbl_usuario.findFirst({
    where: {
      rol: { codigo: 'GERENTE' },
      activo: true,
      deletedAt: null,
    },
  });
  check('Usuario rol GERENTE', !!gerente);

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { codigo: 'CREDICOMPRAS', deletedAt: null },
  });
  check('Mandante CREDICOMPRAS', !!mandante);

  const plantillasPath = path.join(
    __dirname,
    '..',
    'prisma',
    'data',
    'plantillas-credicompras.json',
  );
  const plantillasExist = fs.existsSync(plantillasPath);
  check('Archivo plantillas-credicompras.json', plantillasExist);

  if (mandante) {
    const plantillasDb = await prisma.tbl_plantilla_mensaje.count({
      where: { idmandante: mandante.idmandante, deletedAt: null },
    });
    check(
      'Plantillas mensaje en BD',
      plantillasDb >= 4,
      `${plantillasDb} registros`,
    );
  }

  const permisosCount = await prisma.tbl_permiso.count({
    where: { codigo: { startsWith: 'CARTERA' }, deletedAt: null },
  });
  check('Permisos cobranza en BD', permisosCount >= 2);

  try {
    await prisma.$queryRaw`SELECT 1 FROM tbl_rate_limit LIMIT 1`;
    check('Tabla tbl_rate_limit', true);
  } catch {
    check(
      'Tabla tbl_rate_limit',
      false,
      'ejecute npx prisma db push',
    );
  }

  return {
    adminId: admin?.idusuario ?? 0,
    cobradorId: cobrador?.idusuario ?? 0,
    supervisorId: supervisor?.idusuario ?? 0,
    gerenteId: gerente?.idusuario ?? 0,
    mandanteId: mandante?.idmandante ?? null,
  };
}

async function checkPermisos(
  adminId: number,
  cobradorId: number,
  supervisorId: number,
  gerenteId: number,
): Promise<void> {
  if (!adminId || !cobradorId) {
    check('Permisos RBAC', false, 'usuarios demo no encontrados');
    return;
  }

  const permisosAdmin = await obtenerPermisosUsuario(adminId);
  const permisosCobrador = await obtenerPermisosUsuario(cobradorId);
  const permisosSupervisor = supervisorId
    ? await obtenerPermisosUsuario(supervisorId)
    : [];
  const permisosGerente = gerenteId
    ? await obtenerPermisosUsuario(gerenteId)
    : [];

  check(
    'Admin tiene CARTERA_WRITE',
    permisosAdmin.includes(PERMISO.CARTERA_WRITE),
  );
  check(
    'Admin tiene REPORTE_READ',
    permisosAdmin.includes(PERMISO.REPORTE_READ),
  );
  check(
    'Cobrador NO tiene CARTERA_WRITE',
    !permisosCobrador.includes(PERMISO.CARTERA_WRITE),
  );
  check(
    'Cobrador tiene GESTION_WRITE',
    permisosCobrador.includes(PERMISO.GESTION_WRITE),
  );
  check(
    'Cobrador tiene MANDANTE_READ',
    permisosCobrador.includes(PERMISO.MANDANTE_READ),
  );
  check(
    'Cobrador tiene REPORTE_READ',
    permisosCobrador.includes(PERMISO.REPORTE_READ),
  );

  if (supervisorId) {
    check(
      'Supervisor tiene CARTERA_WRITE',
      permisosSupervisor.includes(PERMISO.CARTERA_WRITE),
    );
    check(
      'Supervisor tiene INTELIGENCIA_READ',
      permisosSupervisor.includes(PERMISO.INTELIGENCIA_READ),
    );
  }

  if (gerenteId) {
    check(
      'Gerente tiene LIQUIDACION_WRITE',
      permisosGerente.includes(PERMISO.LIQUIDACION_WRITE),
    );
    check(
      'Gerente tiene USER_READ',
      permisosGerente.includes(PERMISO.USER_READ),
    );
  }

  const reglaAsignacion = obtenerReglaPermisoRuta('/cobranza/asignacion');
  check('Regla permiso /cobranza/asignacion', !!reglaAsignacion);
  if (reglaAsignacion) {
    check(
      'Cobrador bloqueado en asignación',
      !usuarioTieneAccesoRuta(permisosCobrador, reglaAsignacion),
    );
  }

  const reglaImport = obtenerReglaPermisoRuta('/cobranza/importar');
  check('Regla permiso /cobranza/importar', !!reglaImport);

  if (reglaImport) {
    check(
      'Admin puede importar',
      usuarioTieneAccesoRuta(permisosAdmin, reglaImport),
    );
    check(
      'Cobrador bloqueado en importar',
      !usuarioTieneAccesoRuta(permisosCobrador, reglaImport),
    );
  }
}

function checkMiddlewareFailClosed(): void {
  const reglaCartera = obtenerReglaPermisoRuta('/cobranza/cartera');
  check('Regla permiso /cobranza/cartera', !!reglaCartera);
  if (reglaCartera) {
    check(
      'Middleware fail-closed: permisos vacíos bloqueados',
      !usuarioTieneAccesoRuta([], reglaCartera),
    );
    check(
      'Middleware: admin con CARTERA_READ accede cartera',
      usuarioTieneAccesoRuta([PERMISO.CARTERA_READ], reglaCartera),
    );
  }
}

async function checkJwtPermisos(adminId: number): Promise<void> {
  if (!adminId) {
    return;
  }

  const permisos = await obtenerPermisosUsuario(adminId);
  const token = generateToken({
    idusuario: adminId,
    email: 'admin@flowpay.com',
    nombre: 'Admin',
    idrol: 1,
    permisos,
  });

  const payload = await verifyTokenEdge(token);
  check('JWT incluye permisos', (payload?.permisos?.length ?? 0) > 0);
  check(
    'JWT verificado (jose)',
    payload?.idusuario === adminId,
  );
}

async function checkServicios(
  adminId: number,
  mandanteId: number | null,
): Promise<void> {
  const sim = simularAcuerdo({
    saldoTotal: 10000,
    interesMoratorio: 500,
    porcentajeDesc: 10,
    numeroCuotas: 2,
  });
  check(
    'Simulador acuerdo',
    sim.montoAcordado > 0 && sim.montoCuota > 0,
    `acordado=${sim.montoAcordado}`,
  );

  if (!adminId || !mandanteId) {
    check('Reporte aging', false, 'sin mandante o admin');
    return;
  }

  try {
    const aging = await obtenerReporteAgingCartera(mandanteId, adminId);
    const sumTramos = aging.tramos.reduce(
      (s, t) => s + t.cantidadPrestamos,
      0,
    );
    check(
      'Reporte aging',
      aging.tramos.length === 6 && sumTramos === aging.totalPrestamos,
      `${aging.totalPrestamos} préstamos, ${aging.tramos.length} tramos`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'error';
    check('Reporte aging', false, msg);
  }
}

function checkStaticQaArtifacts(): void {
  const artifacts = [
    'scripts/audit-security.ts',
    'scripts/audit-performance.ts',
    'scripts/audit-scalability.ts',
    'scripts/test-qa-unit.ts',
    'src/lib/security/rate-limit-service.ts',
    'src/components/auth/permission-gate.tsx',
  ];
  for (const file of artifacts) {
    const full = path.join(__dirname, '..', file);
    check(`Artefacto QA: ${file}`, fs.existsSync(full));
  }
}

async function checkScopeCliente(adminId: number): Promise<void> {
  if (!adminId) {
    return;
  }
  try {
    await requerirAccesoCliente(null, 1);
    check('requerirAccesoCliente sin usuario', false);
  } catch (err) {
    check(
      'requerirAccesoCliente sin usuario',
      err instanceof GraphQLPermissionError,
    );
  }
}

async function checkHttpLive(): Promise<void> {
  const baseUrl = process.env.SMOKE_BASE_URL?.replace(/\/$/, '');
  if (!baseUrl) {
    process.stdout.write(
      '\n  ⏭️  Tests HTTP omitidos (defina SMOKE_BASE_URL para activarlos)\n',
    );
    return;
  }

  process.stdout.write(`\n  🌐 Tests HTTP contra ${baseUrl}\n`);

  const loginSinCsrf = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@flowpay.com',
      password: 'admin123',
    }),
  });
  check(
    'Login rechaza sin CSRF',
    loginSinCsrf.status === 403,
    String(loginSinCsrf.status),
  );

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify({
      email: 'admin@flowpay.com',
      password: 'admin123',
    }),
  });
  check('POST /api/auth/login (admin)', loginRes.ok, String(loginRes.status));

  const loginBody = (await loginRes.json()) as {
    success?: boolean;
    token?: string;
    usuario?: unknown;
  };
  check(
    'Login no expone token en JSON',
    loginBody.success === true && loginBody.token === undefined,
  );

  const setCookie = loginRes.headers.get('set-cookie') ?? '';
  const tokenMatch = setCookie.match(/auth-token=([^;]+)/);
  const cookie = tokenMatch ? `auth-token=${tokenMatch[1]}` : '';

  if (cookie) {
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookie, ...csrfHeaders() },
      credentials: 'include',
    });
    const meData = (await meRes.json()) as {
      success?: boolean;
      permisos?: string[];
      token?: string;
    };
    check(
      'GET /api/auth/me con permisos',
      meRes.ok && Array.isArray(meData.permisos) && meData.permisos.length > 0,
    );
    check(
      'Me no expone token en JSON',
      meData.token === undefined,
    );

    const gqlRes = await fetch(`${baseUrl}/api/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
        ...csrfHeaders(),
      },
      credentials: 'include',
      body: JSON.stringify({
        query: `{ resumenDashboardCobranza { totalPrestamos promesasVencidas } }`,
      }),
    });
    const gqlData = (await gqlRes.json()) as {
      data?: { resumenDashboardCobranza?: unknown };
      errors?: unknown[];
    };
    check(
      'GraphQL resumenDashboardCobranza',
      gqlRes.ok && !!gqlData.data?.resumenDashboardCobranza && !gqlData.errors,
    );
  } else {
    check('Cookie auth-token en login', false);
  }

  const cobradorLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify({
      email: 'cobrador@flowpay.com',
      password: 'cobrador123',
    }),
  });
  const cobradorCookieRaw = cobradorLogin.headers.get('set-cookie') ?? '';
  const cobradorToken = cobradorCookieRaw.match(/auth-token=([^;]+)/);
  if (cobradorToken) {
    const importRes = await fetch(`${baseUrl}/cobranza/importar`, {
      redirect: 'manual',
      headers: { Cookie: `auth-token=${cobradorToken[1]}` },
    });
    const blocked =
      importRes.status === 307 ||
      importRes.status === 302 ||
      importRes.status === 308;
    const location = importRes.headers.get('location') ?? '';
    check(
      'Middleware bloquea cobrador en /cobranza/importar',
      blocked && location.includes('dashboard'),
      `status=${importRes.status}`,
    );
  }
}

function printSummary(): number {
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  process.stdout.write('\n────────────────────────────────────\n');
  process.stdout.write(`  Resultado: ${passed}/${results.length} OK\n`);
  if (failed.length > 0) {
    process.stderr.write('\n  Fallos:\n');
    for (const f of failed) {
      process.stderr.write(`    • ${f.name}${f.detail ? ` — ${f.detail}` : ''}\n`);
    }
  }
  process.stdout.write('────────────────────────────────────\n');
  return failed.length;
}

async function main(): Promise<void> {
  process.stdout.write('\n🔍 FlowPay — Smoke test cobranza\n\n');

  process.stdout.write('📋 Entorno\n');
  await checkEnv();

  process.stdout.write('\n📋 Base de datos\n');
  const { adminId, cobradorId, supervisorId, gerenteId, mandanteId } =
    await checkDatabase();

  process.stdout.write('\n📋 RBAC\n');
  await checkPermisos(adminId, cobradorId, supervisorId, gerenteId);

  process.stdout.write('\n📋 JWT / middleware\n');
  checkMiddlewareFailClosed();
  checkStaticQaArtifacts();
  await checkJwtPermisos(adminId);

  process.stdout.write('\n📋 Scope multi-mandante\n');
  await checkScopeCliente(adminId);

  process.stdout.write('\n📋 Servicios cobranza\n');
  await checkServicios(adminId, mandanteId);

  await checkHttpLive();

  const failCount = printSummary();
  await prisma.$disconnect();
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`\n❌ Smoke test abortado: ${msg}\n`);
  void prisma.$disconnect();
  process.exit(1);
});
