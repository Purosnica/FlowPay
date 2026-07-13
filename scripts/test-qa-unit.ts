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
} from '@/lib/cobranza/performance-limits';
import { checkRateLimit } from '@/lib/security/rate-limit-service';
import {
  resolvePagination,
  MAX_PAGE_SIZE,
} from '@/lib/pagination/pagination';
import { validarCronAuth } from '@/lib/cron/cron-auth';
import { rateLimiter } from '@/lib/security/rate-limit';

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
  assert.equal(validarCsrfHeader(sameOrigin), true);

  const sameReferer = new Request('http://localhost/api/test', {
    headers: {
      ...headers,
      referer: 'http://localhost/login',
    },
  });
  assert.equal(validarCsrfHeader(sameReferer), true);

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

async function run(): Promise<void> {
  testCsrf();
  testScalabilityConfig();
  testUploadLimits();
  testPerformanceLimits();
  testPaginationCap();
  testCronAuth();
  await testRateLimitMemory();
  console.log('tests QA unitarios: OK');
}

void run();
