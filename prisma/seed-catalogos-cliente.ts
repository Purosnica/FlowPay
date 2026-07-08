/**
 * Catálogos mínimos para registrar clientes (importación y UI).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedCatalogosCliente(): Promise<void> {
  console.log('\n🌱 Seed catálogos cliente (tipo documento / tipo persona)...');

  let tipoDoc = await prisma.tbl_tipodocumento.findFirst({
    where: { descripcion: { contains: 'dula' } },
  });
  if (!tipoDoc) {
    tipoDoc = await prisma.tbl_tipodocumento.create({
      data: { descripcion: 'Cédula de Identidad', estado: true },
    });
    console.log('  ✅ Tipo documento: Cédula de Identidad');
  }

  let tipoPersona = await prisma.tbl_tipopersona.findFirst({
    where: { descripcion: { contains: 'Natural' } },
  });
  if (!tipoPersona) {
    tipoPersona = await prisma.tbl_tipopersona.create({
      data: { descripcion: 'Persona Natural', estado: true },
    });
    console.log('  ✅ Tipo persona: Persona Natural');
  }

  console.log('✅ Catálogos cliente listos');
}

if (require.main === module) {
  seedCatalogosCliente()
    .catch((e) => {
      console.error('❌ Error seed catálogos cliente:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
