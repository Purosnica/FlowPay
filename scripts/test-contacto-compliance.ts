/**
 * Tests de validación de contacto Ley 787 (gestiones).
 */
import assert from 'node:assert/strict';
import {
  esTelefonoPropioDelCliente,
  normalizarTelefono,
  validarContactoParaGestion,
} from '../src/lib/cobranza/contacto-compliance-service';
import { prisma } from '../src/lib/prisma';

function testNormalizar(): void {
  assert.equal(normalizarTelefono('7608-3836'), '76083836');
  assert.equal(normalizarTelefono('+505 7608 3836'), '50576083836');
  assert.equal(normalizarTelefono(''), '');
}

function testPropioHelper(): void {
  assert.equal(
    esTelefonoPropioDelCliente('76083836', {
      celular: '7608-3836',
      telefono: null,
    }),
    true,
  );
  assert.equal(
    esTelefonoPropioDelCliente('99998888', {
      celular: '88887777',
      telefono: null,
    }),
    false,
  );
}

async function testValidacionIntegracion(): Promise<void> {
  const prestamo = await prisma.tbl_prestamo.findFirst({
    where: { deletedAt: null },
    select: {
      idcliente: true,
      cliente: { select: { celular: true, telefono: true } },
    },
  });
  if (!prestamo?.cliente?.celular) {
    console.log('skip integracion: sin celular en cliente');
    return;
  }

  const result = await validarContactoParaGestion({
    idcliente: prestamo.idcliente,
    telefonoContacto: prestamo.cliente.celular,
    contactoTercero: false,
  });

  assert.equal(
    result.permitido,
    true,
    `Teléfono propio del deudor debe permitirse. Motivo: ${result.motivo ?? ''}`,
  );
}

async function main(): Promise<void> {
  testNormalizar();
  testPropioHelper();
  await testValidacionIntegracion();
  console.log('test-contacto-compliance OK');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
