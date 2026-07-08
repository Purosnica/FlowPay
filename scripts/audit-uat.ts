/**
 * Auditoría estática UAT — documentación y scripts.
 * Ejecutar: npm run audit:uat
 */

import * as fs from 'fs';

interface Check {
  id: string;
  label: string;
  ok: boolean;
}

const checks: Check[] = [];

function check(id: string, label: string, ok: boolean): void {
  checks.push({ id, label, ok });
}

const uatDoc = fs.existsSync('docs/UAT-COBRANZA.md')
  ? fs.readFileSync('docs/UAT-COBRANZA.md', 'utf8')
  : '';

check('U-1', 'Documento UAT existe', uatDoc.length > 0);
check('U-2', 'UAT incluye cobrador', /cobrador@flowpay\.com/i.test(uatDoc));
check('U-3', 'UAT incluye supervisor', /supervisor@flowpay\.com/i.test(uatDoc));
check('U-4', 'UAT incluye gerente', /gerente@flowpay\.com/i.test(uatDoc));
check('U-5', 'UAT incluye admin', /admin@flowpay\.com/i.test(uatDoc));
check(
  'U-6',
  'UAT escenarios de seguridad',
  uatDoc.includes('CSRF') && uatDoc.includes('cookie'),
);
check(
  'U-7',
  'UAT escenarios importación async',
  /importaci[oó]n/i.test(uatDoc) && /async/i.test(uatDoc),
);
check(
  'U-8',
  'UAT checklist de sign-off',
  uatDoc.includes('Sign-off') || uatDoc.includes('sign-off'),
);

check(
  'U-9',
  'Script test-uat-rbac',
  fs.existsSync('scripts/test-uat-rbac.ts'),
);
check(
  'U-10',
  'Smoke test ampliado',
  fs.readFileSync('scripts/smoke-test-cobranza.ts', 'utf8').includes(
    'checkStaticQaArtifacts',
  ),
);

console.log('=== UAT AUDIT ===');
const failed = checks.filter((c) => !c.ok);
for (const c of checks) {
  console.log(`[${c.ok ? 'PASS' : 'FAIL'}] ${c.id}: ${c.label}`);
}
console.log('');
console.log(
  `Total: ${checks.length} | Pass: ${checks.length - failed.length} | Fail: ${failed.length}`,
);
if (failed.length > 0) {
  process.exit(1);
}
