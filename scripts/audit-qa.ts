/**
 * Puerta de calidad QA — ejecuta auditorías y tests del proyecto.
 * Ejecutar: npm run audit:qa
 */

import { spawnSync } from 'node:child_process';
import * as fs from 'fs';

interface StepResult {
  name: string;
  ok: boolean;
  code: number | null;
}

const steps: Array<{ name: string; command: string }> = [
  { name: 'audit:code', command: 'npm run audit:code' },
  { name: 'audit:graphql', command: 'npm run audit:graphql' },
  { name: 'audit:frontend', command: 'npm run audit:frontend' },
  { name: 'audit:security', command: 'npm run audit:security' },
  { name: 'audit:performance', command: 'npm run audit:performance' },
  { name: 'audit:scalability', command: 'npm run audit:scalability' },
  { name: 'test:unit', command: 'npm run test:unit' },
  { name: 'test:qa', command: 'npm run test:qa' },
  { name: 'verify:formulas', command: 'tsx scripts/verify-implementaciones.ts' },
  { name: 'audit:uat', command: 'npm run audit:uat' },
  { name: 'audit:docs', command: 'npm run audit:docs' },
];

const requiredArtifacts = [
  'scripts/smoke-test-cobranza.ts',
  'scripts/test-qa-unit.ts',
  'scripts/verify-implementaciones.ts',
  'src/lib/security/rate-limit-service.ts',
  'src/lib/cobranza/auditoria-retention-service.ts',
  'src/components/auth/permission-gate.tsx',
  'src/components/ui/async-panel.tsx',
];

function checkArtifacts(): StepResult[] {
  const results: StepResult[] = [];
  for (const file of requiredArtifacts) {
    const ok = fs.existsSync(file);
    results.push({ name: `artifact:${file}`, ok, code: ok ? 0 : 1 });
  }
  return results;
}

function runStep(name: string, command: string): StepResult {
  const result = spawnSync(command, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });
  const ok = result.status === 0;
  return { name, ok, code: result.status };
}

console.log('=== QA GATE — FlowPay ===\n');

const artifactResults = checkArtifacts();
const runResults: StepResult[] = [];

for (const step of steps) {
  console.log(`\n▶ ${step.name}`);
  runResults.push(runStep(step.name, step.command));
}

const all = [...artifactResults, ...runResults];
const failed = all.filter((r) => !r.ok);

console.log('\n=== QA SUMMARY ===');
for (const r of all) {
  console.log(`[${r.ok ? 'PASS' : 'FAIL'}] ${r.name}`);
}

console.log('');
console.log(
  `Total: ${all.length} | Pass: ${all.length - failed.length} | Fail: ${failed.length}`,
);

if (failed.length > 0) {
  process.exit(1);
}
