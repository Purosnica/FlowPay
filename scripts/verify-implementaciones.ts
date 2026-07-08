/**
 * Verificación rápida de fórmulas implementadas.
 * Ejecutar: npx tsx scripts/verify-implementaciones.ts
 */
import { calcularComisionCobrador } from '../src/lib/cobranza/comision-cobro-service';
import {
  validarPorcentajeContraMandante,
  validarPorcentajeContraPolitica,
} from '../src/lib/cobranza/politica-descuento-service';
import { resolverPorcentajeComisionCobrador } from '../src/lib/cobranza/comision-cobrador-service';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean): void {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.error(`  ❌ ${name}`);
  }
}

console.log('\n=== Verificación implementaciones ===\n');

console.log('1. Comisión cobrador (ejemplo negocio)');
const comision = calcularComisionCobrador(1000, 20, 3);
check('Ingreso empresa = 200', comision.ingresoEmpresa === 200);
check('Comisión cobrador = 6', comision.montoComision === 6);

console.log('\n2. Descuento máximo mandante');
let rechazoMandante = false;
try {
  validarPorcentajeContraMandante(45, 40, 'TEST');
} catch (e) {
  rechazoMandante =
    e instanceof Error && e.message.includes('40%');
}
check('Rechaza 45% cuando máximo es 40%', rechazoMandante);

let aceptaMandante = true;
try {
  validarPorcentajeContraMandante(30, 40, 'TEST');
} catch {
  aceptaMandante = false;
}
check('Acepta 30% cuando máximo es 40%', aceptaMandante);

console.log('\n3. Política descuento por mora (complementaria)');
let rechazoPolitica = false;
try {
  validarPorcentajeContraPolitica(25, 60, [
    { tramoMoraMin: 0, tramoMoraMax: 30, porcentaje: 10 },
    { tramoMoraMin: 31, tramoMoraMax: 90, porcentaje: 20 },
  ]);
} catch (e) {
  rechazoPolitica =
    e instanceof Error && e.message.includes('20%');
}
check('Rechaza 25% en tramo de 20% máx (60 días mora)', rechazoPolitica);

console.log('\n4. Comisión variable por mandante');
check(
  'Override mandante tiene prioridad',
  resolverPorcentajeComisionCobrador(5, 3) === 5,
);
check(
  'Sin override usa % global del usuario',
  resolverPorcentajeComisionCobrador(null, 3) === 3,
);
check(
  'Sin override undefined usa % global',
  resolverPorcentajeComisionCobrador(undefined, 3) === 3,
);

console.log(`\n--- Resultado: ${passed} OK, ${failed} fallos ---\n`);
process.exit(failed > 0 ? 1 : 0);
