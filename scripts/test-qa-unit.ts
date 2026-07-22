import assert from 'node:assert/strict';
import {
  validarCsrfHeader,
  csrfHeaders,
  CSRF_HEADER,
  CSRF_HEADER_VALUE,
} from '@/lib/security/csrf';
import {
  obtenerImportMaxJobsPerRun,
  obtenerImportMaxConcurrent,
  obtenerAuditRetentionDays,
  usarRateLimitDb,
} from '@/lib/scalability/scalability-config';
import {
  MAX_IMPORT_FILE_BYTES,
  MAX_DOCUMENTO_FILE_BYTES,
  mensajeArchivoExcedeLimite,
} from '@/lib/cobranza/upload-limits';
import {
  BANDEJA_PRIORIDAD_CANDIDATE_LIMIT,
  MI_DIA_PRIORIDAD_CANDIDATE_LIMIT,
  EXPORT_ASYNC_ROW_THRESHOLD,
} from '@/lib/cobranza/performance-limits';
import {
  memoryCacheGet,
  memoryCacheSet,
  memoryCacheDelete,
} from '@/lib/cache/ttl-memory-cache';
import { resumirPerfilMora } from '@/lib/cobranza/mora-recalculo-profile';
import { GRAPHQL_COMPRESS_THRESHOLD_BYTES } from '@/lib/graphql/compress-response';
import { checkRateLimit } from '@/lib/security/rate-limit-service';
import {
  resolvePagination,
  MAX_PAGE_SIZE,
} from '@/lib/pagination/pagination';
import { validarCronAuth } from '@/lib/cron/cron-auth';
import { rateLimiter } from '@/lib/security/rate-limit';
import {
  createMaxDepthRule,
  createMaxFieldsRule,
  GRAPHQL_MAX_DEPTH_DEFAULT,
  GRAPHQL_MAX_FIELDS_DEFAULT,
} from '@/lib/graphql/plugins/query-limits';
import { resolverIpCliente } from '@/lib/middleware/auth';
import { CreatePagoInputSchema } from '@/lib/graphql/resolvers/pago/types';
import { NextRequest } from 'next/server';

function testCsrf(): void {
  const headers = csrfHeaders();
  assert.equal(headers[CSRF_HEADER], CSRF_HEADER_VALUE);

  // Sin Origin/Referer → rechazar
  const sinOrigen = new Request('http://localhost/api/test', {
    headers,
  });
  assert.equal(validarCsrfHeader(sinOrigen), false);

  const sameOrigin = new Request('http://localhost/api/test', {
    headers: {
      ...headers,
      origin: 'http://localhost',
    },
  });
  assert.equal(validarCsrfHeader(sameOrigin), false);

  const sameReferer = new Request('http://localhost/api/test', {
    headers: {
      ...headers,
      referer: 'http://localhost/login',
    },
  });
  assert.equal(validarCsrfHeader(sameReferer), false);

  const crossOrigin = new Request('http://localhost/api/test', {
    headers: {
      ...headers,
      origin: 'https://evil.example',
    },
  });
  assert.equal(validarCsrfHeader(crossOrigin), false);

  const bad = new Request('http://localhost/api/test');
  assert.equal(validarCsrfHeader(bad), false);

  const token = 'abc123csrf';
  const withCookieOk = new Request('http://localhost/api/test', {
    headers: {
      ...headers,
      cookie: `flowpay-csrf=${token}`,
      'x-flowpay-csrf': token,
      origin: 'http://localhost',
    },
  });
  assert.equal(validarCsrfHeader(withCookieOk), true);

  const withCookieBad = new Request('http://localhost/api/test', {
    headers: {
      ...headers,
      cookie: `flowpay-csrf=${token}`,
      'x-flowpay-csrf': 'otro',
      origin: 'http://localhost',
    },
  });
  assert.equal(validarCsrfHeader(withCookieBad), false);

  const withCookieMissingHeader = new Request('http://localhost/api/test', {
    headers: {
      ...headers,
      cookie: `flowpay-csrf=${token}`,
      origin: 'http://localhost',
    },
  });
  assert.equal(validarCsrfHeader(withCookieMissingHeader), false);
}

function testScalabilityConfig(): void {
  const prevJobs = process.env.IMPORT_MAX_JOBS_PER_RUN;
  const prevConcurrent = process.env.IMPORT_MAX_CONCURRENT;

  process.env.IMPORT_MAX_JOBS_PER_RUN = '3';
  process.env.IMPORT_MAX_CONCURRENT = '2';
  assert.equal(obtenerImportMaxJobsPerRun(), 3);
  assert.equal(obtenerImportMaxConcurrent(), 2);

  process.env.IMPORT_MAX_JOBS_PER_RUN = '99';
  assert.equal(obtenerImportMaxJobsPerRun(), 5);

  process.env.IMPORT_MAX_CONCURRENT = '0';
  assert.equal(obtenerImportMaxConcurrent(), 1);

  assert.ok(obtenerAuditRetentionDays() >= 7);

  process.env.RATE_LIMIT_STORE = 'memory';
  assert.equal(usarRateLimitDb(), false);

  process.env.IMPORT_MAX_JOBS_PER_RUN = prevJobs;
  process.env.IMPORT_MAX_CONCURRENT = prevConcurrent;
}

function testUploadLimits(): void {
  assert.ok(MAX_IMPORT_FILE_BYTES > MAX_DOCUMENTO_FILE_BYTES);
  assert.match(
    mensajeArchivoExcedeLimite(MAX_IMPORT_FILE_BYTES),
    /15 MB/,
  );
}

function testPerformanceLimits(): void {
  assert.ok(BANDEJA_PRIORIDAD_CANDIDATE_LIMIT >= MI_DIA_PRIORIDAD_CANDIDATE_LIMIT);
  assert.equal(EXPORT_ASYNC_ROW_THRESHOLD, 10_000);
  assert.ok(GRAPHQL_COMPRESS_THRESHOLD_BYTES >= 1024);
}

function testMemoryKpiCache(): void {
  const key = `qa-cache-${Date.now()}`;
  memoryCacheSet(key, '{"ok":true}', 60);
  assert.equal(memoryCacheGet(key), '{"ok":true}');
  memoryCacheDelete(key);
  assert.equal(memoryCacheGet(key), null);
}

function testMoraProfile(): void {
  const profile = resumirPerfilMora(
    [
      { batchIndex: 0, size: 500, durationMs: 100, actualizados: 10 },
      { batchIndex: 1, size: 500, durationMs: 200, actualizados: 20 },
      { batchIndex: 2, size: 100, durationMs: 50, actualizados: 5 },
    ],
    400,
  );
  assert.equal(profile.evaluados, 1100);
  assert.equal(profile.actualizados, 35);
  assert.equal(profile.batches, 3);
  assert.ok(profile.p95BatchMs >= profile.avgBatchMs);
}

async function testRateLimitMemory(): Promise<void> {
  rateLimiter.clear();
  process.env.RATE_LIMIT_STORE = 'memory';

  const id = `qa-${Date.now()}`;
  assert.equal(await checkRateLimit(id, 2, 60_000), true);
  assert.equal(await checkRateLimit(id, 2, 60_000), true);
  assert.equal(await checkRateLimit(id, 2, 60_000), false);
}

function testPaginationCap(): void {
  const resolved = resolvePagination(1, 999);
  assert.equal(resolved.pageSize, MAX_PAGE_SIZE);
  assert.equal(resolved.skip, 0);
}

function testCronAuth(): void {
  process.env.CRON_SECRET = 'qa-cron-secret';
  const ok = new Request('http://localhost/api/cron/test', {
    headers: { authorization: 'Bearer qa-cron-secret' },
  });
  assert.equal(validarCronAuth(ok), true);

  const queryOnly = new Request(
    'http://localhost/api/cron/test?token=qa-cron-secret',
  );
  assert.equal(validarCronAuth(queryOnly), false);
}

function testIpProxyGate(): void {
  const prev = process.env.TRUST_PROXY;
  delete process.env.TRUST_PROXY;
  const spoof = new NextRequest('http://localhost/api/auth/login', {
    headers: {
      'x-real-ip': '1.2.3.4',
      'x-forwarded-for': '9.9.9.9',
    },
  });
  assert.equal(resolverIpCliente(spoof), null);

  process.env.TRUST_PROXY = 'true';
  assert.equal(resolverIpCliente(spoof), '1.2.3.4');

  if (prev === undefined) {
    delete process.env.TRUST_PROXY;
  } else {
    process.env.TRUST_PROXY = prev;
  }
}

function testGraphQlLimits(): void {
  assert.equal(GRAPHQL_MAX_DEPTH_DEFAULT, 12);
  assert.equal(GRAPHQL_MAX_FIELDS_DEFAULT, 250);
  assert.equal(typeof createMaxDepthRule(), 'function');
  assert.equal(typeof createMaxFieldsRule(), 'function');
}

function testPagoIdempotencySchema(): void {
  const base = {
    idprestamo: 1,
    fechaPago: new Date().toISOString(),
    monto: 100,
    moneda: 'NIO' as const,
  };
  const ok = CreatePagoInputSchema.parse({
    ...base,
    medio: 'efectivo',
    idempotencyKey: 'abc12345_retry',
  });
  assert.equal(ok.medio, 'EFECTIVO');
  assert.equal(ok.idempotencyKey, 'abc12345_retry');

  assert.throws(() =>
    CreatePagoInputSchema.parse({ ...base, medio: 'BITCOIN' }),
  );
  assert.throws(() =>
    CreatePagoInputSchema.parse({ ...base, idempotencyKey: 'short' }),
  );
}

async function run(): Promise<void> {
  testCsrf();
  testScalabilityConfig();
  testUploadLimits();
  testPerformanceLimits();
  testMemoryKpiCache();
  testMoraProfile();
  testPaginationCap();
  testCronAuth();
  testIpProxyGate();
  testGraphQlLimits();
  testPagoIdempotencySchema();
  await testRateLimitMemory();
  console.log('tests QA unitarios: OK');
}

void run();
