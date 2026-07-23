/**
 * Catálogos mínimos para registrar clientes (importación y UI).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedCatalogosCliente(): Promise<void> {
  console.log(
    '\n🌱 Seed catálogos cliente (documento, persona, género, estado civil, ocupación)...',
  );

  let tipoDoc = await prisma.tbl_tipodocumento.findFirst({
    where: { descripcion: { contains: 'dula' } },
  });
  if (!tipoDoc) {
    await prisma.tbl_tipodocumento.create({
      data: { descripcion: 'Cédula de Identidad', estado: true },
    });
    console.log('  ✅ Tipo documento: Cédula de Identidad');
  }

  let tipoPersona = await prisma.tbl_tipopersona.findFirst({
    where: { descripcion: { contains: 'Natural' } },
  });
  if (!tipoPersona) {
    await prisma.tbl_tipopersona.create({
      data: { descripcion: 'Persona Natural', estado: true },
    });
    console.log('  ✅ Tipo persona: Persona Natural');
  }

  const juridica = await prisma.tbl_tipopersona.findFirst({
    where: { descripcion: { contains: 'Jur' } },
  });
  if (!juridica) {
    await prisma.tbl_tipopersona.create({
      data: { descripcion: 'Persona Jurídica', estado: true },
    });
    console.log('  ✅ Tipo persona: Persona Jurídica');
  }

  const generos = ['Masculino', 'Femenino', 'Otro'];
  for (const descripcion of generos) {
    const existe = await prisma.tbl_genero.findFirst({
      where: { descripcion },
    });
    if (!existe) {
      await prisma.tbl_genero.create({
        data: { descripcion, estado: true },
      });
      console.log(`  ✅ Género: ${descripcion}`);
    }
  }

  const estadosCiviles = [
    'Soltero(a)',
    'Casado(a)',
    'Unión de hecho',
    'Divorciado(a)',
    'Viudo(a)',
  ];
  for (const descripcion of estadosCiviles) {
    const existe = await prisma.tbl_estadocivil.findFirst({
      where: { descripcion },
    });
    if (!existe) {
      await prisma.tbl_estadocivil.create({
        data: { descripcion, estado: true },
      });
      console.log(`  ✅ Estado civil: ${descripcion}`);
    }
  }

  const ocupaciones = [
    'Empleado(a)',
    'Independiente / Cuenta propia',
    'Comerciante',
    'Agricultor(a)',
    'Ama de casa',
    'Estudiante',
    'Jubilado(a)',
    'Desempleado(a)',
    'Profesional',
    'Otro',
  ];
  for (const descripcion of ocupaciones) {
    const existe = await prisma.tbl_ocupacion.findFirst({
      where: { descripcion },
    });
    if (!existe) {
      await prisma.tbl_ocupacion.create({
        data: { descripcion, estado: true },
      });
      console.log(`  ✅ Ocupación: ${descripcion}`);
    }
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
