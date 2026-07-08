/**
 * Auditoría estática de seguridad FlowPay.
 * Ejecutar: npx tsx scripts/audit-security.ts
 */

import * as fs from 'fs';

interface CheckResult {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
}

const checks: CheckResult[] = [];

function read(path: string): string {
  return fs.readFileSync(path, 'utf8');
}

function check(id: string, label: string, ok: boolean, detail?: string): void {
  checks.push({ id, label, ok, detail });
}

// G-1: sin bypass de introspection anónima
const authPlugin = read('src/lib/graphql/plugins/require-auth-plugin.ts');
check(
  'G-1',
  'Plugin auth sin bypass de introspection',
  !authPlugin.includes('IntrospectionQuery') &&
    !authPlugin.includes('esIntrospection'),
);

// G-2: regla de introspection en producción
const gqlRoute = read('src/app/api/graphql/route.ts');
check(
  'G-2',
  'NoSchemaIntrospectionCustomRule en GraphQL',
  gqlRoute.includes('NoSchemaIntrospectionCustomRule'),
);

// J-1: JWT alineado con cookie (8h)
const jwt = read('src/lib/auth/jwt.ts');
check(
  'J-1',
  'JWT default 8h',
  jwt.includes("'8h'") || jwt.includes('"8h"'),
);

// J-2: token no expuesto en login/me
const loginRoute = read('src/app/api/auth/login/route.ts');
const meRoute = read('src/app/api/auth/me/route.ts');
check(
  'J-2a',
  'Login no retorna token en JSON',
  !loginRoute.match(/token:\s*result\.token/),
);
check(
  'J-2b',
  'Me no retorna token en JSON',
  !meRoute.match(/token:\s*tokenNuevo/),
);

const authCtx = read('src/contexts/auth-context.tsx');
check(
  'J-2c',
  'Auth context sin token en memoria',
  !authCtx.includes('setAuthToken') && !authCtx.includes('token: string'),
);

// PE-1: scope mandante en deudor-contacto
const deudorContacto = read(
  'src/lib/graphql/resolvers/deudor-contacto/index.ts',
);
check(
  'PE-1',
  'Deudor-contacto con requerirAccesoCliente',
  deudorContacto.includes('requerirAccesoCliente'),
);

const mandanteScope = read('src/lib/cobranza/mandante-scope.ts');
check(
  'PE-1b',
  'requerirAccesoCliente definido',
  mandanteScope.includes('export async function requerirAccesoCliente'),
);

// CR-1: cron solo Bearer
const cronAuth = read('src/lib/cron/cron-auth.ts');
check(
  'CR-1',
  'Cron auth sin query token',
  !cronAuth.includes("searchParams.get('token')"),
);

// CS-1: mitigación CSRF
const csrf = read('src/lib/security/csrf.ts');
const middleware = read('src/middleware.ts');
check(
  'CS-1a',
  'Módulo CSRF presente',
  csrf.includes('x-flowpay-request'),
);
check(
  'CS-1b',
  'Middleware valida CSRF en API mutating',
  middleware.includes('validarCsrfHeader'),
);
check(
  'CS-1c',
  'GraphQL valida CSRF en POST',
  gqlRoute.includes('validarCsrfHeader'),
);

// M-3: security headers en rutas públicas
const secHeaders = read('src/lib/security/security-headers.ts');
check(
  'M-3a',
  'Helper security headers',
  secHeaders.includes('applySecurityHeaders'),
);
check(
  'M-3b',
  'Middleware aplica headers en /login',
  middleware.includes('responderConSeguridad') &&
    middleware.includes("'/login'"),
);

// Rate limit login por email
check(
  'RL-1',
  'Rate limit login por email',
  loginRoute.includes('login:email:'),
);

// Positivos
const hasRateLimit = fs.existsSync('src/lib/security/rate-limit.ts');
check('POS-1', 'Rate limiting configurado', hasRateLimit);

const hasRbac = read('src/lib/permissions/permission-service.ts').includes(
  'requerirPermiso',
);
check('POS-2', 'RBAC requerirPermiso', hasRbac);

console.log('=== SECURITY AUDIT ===');
const failed = checks.filter((c) => !c.ok);
for (const c of checks) {
  const status = c.ok ? 'PASS' : 'FAIL';
  const extra = c.detail ? ` (${c.detail})` : '';
  console.log(`[${status}] ${c.id}: ${c.label}${extra}`);
}

console.log('');
console.log(`Total: ${checks.length} | Pass: ${checks.length - failed.length} | Fail: ${failed.length}`);

if (failed.length > 0) {
  process.exit(1);
}
