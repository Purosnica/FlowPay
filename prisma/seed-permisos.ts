/**
 * SCRIPT DE SEED PARA PERMISOS BASE
 *
 * Ejecutar con: npx tsx prisma/seed-permisos.ts
 * Catálogo canónico: src/lib/permissions/permiso-codes.ts
 */

import { PrismaClient } from '@prisma/client';
import {
  PERMISOS_CATALOGO,
  PERMISOS_ADMIN,
  PERMISOS_COBRADOR,
  PERMISOS_SUPERVISOR,
  PERMISOS_GERENTE,
} from '../src/lib/permissions/permiso-codes';

const prisma = new PrismaClient();

async function asignarPermisosARol(
  idrol: number,
  codigos: string[],
): Promise<number> {
  const permisos = await prisma.tbl_permiso.findMany({
    where: { codigo: { in: codigos } },
  });

  const idsPermisos = permisos.map((p) => p.idpermiso);

  if (idsPermisos.length > 0) {
    await prisma.tbl_rol_permiso.deleteMany({
      where: {
        idrol,
        idpermiso: { notIn: idsPermisos },
      },
    });
  }

  for (const permiso of permisos) {
    await prisma.tbl_rol_permiso.upsert({
      where: {
        idrol_idpermiso: {
          idrol,
          idpermiso: permiso.idpermiso,
        },
      },
      create: { idrol, idpermiso: permiso.idpermiso },
      update: {},
    });
  }

  return permisos.length;
}

export async function seedPermisos() {
  console.log('🌱 Iniciando seed de permisos...');

  console.log('📝 Creando/actualizando permisos base...');
  for (const permiso of PERMISOS_CATALOGO) {
    await prisma.tbl_permiso.upsert({
      where: { codigo: permiso.codigo },
      create: {
        codigo: permiso.codigo,
        nombre: permiso.nombre,
        descripcion: permiso.descripcion,
        categoria: permiso.categoria,
      },
      update: {
        nombre: permiso.nombre,
        descripcion: permiso.descripcion,
        categoria: permiso.categoria,
      },
    });
    console.log(`  ✅ Permiso: ${permiso.codigo}`);
  }

  let rolAdmin = await prisma.tbl_rol.findUnique({
    where: { codigo: 'ADMIN' },
  });

  if (!rolAdmin) {
    rolAdmin = await prisma.tbl_rol.create({
      data: {
        codigo: 'ADMIN',
        descripcion: 'Administrador del sistema',
        estado: true,
      },
    });
    console.log('  ✅ Rol ADMIN creado');
  }

  console.log('🔐 Asignando permisos al rol ADMIN...');
  const countAdmin = await asignarPermisosARol(
    rolAdmin.idrol,
    PERMISOS_ADMIN,
  );
  console.log(`  ✅ ${countAdmin} permisos asignados a ADMIN`);

  const rolCobrador = await prisma.tbl_rol.findUnique({
    where: { codigo: 'COBRADOR' },
  });

  if (rolCobrador) {
    const count = await asignarPermisosARol(
      rolCobrador.idrol,
      PERMISOS_COBRADOR,
    );
    console.log(`  ✅ ${count} permisos asignados a COBRADOR`);
  }

  let rolSupervisor = await prisma.tbl_rol.findUnique({
    where: { codigo: 'SUPERVISOR' },
  });
  if (!rolSupervisor) {
    rolSupervisor = await prisma.tbl_rol.create({
      data: {
        codigo: 'SUPERVISOR',
        descripcion: 'Supervisor de cobranza',
        estado: true,
      },
    });
  }
  const countSup = await asignarPermisosARol(
    rolSupervisor.idrol,
    PERMISOS_SUPERVISOR,
  );
  console.log(`  ✅ ${countSup} permisos asignados a SUPERVISOR`);

  let rolGerente = await prisma.tbl_rol.findUnique({
    where: { codigo: 'GERENTE' },
  });
  if (!rolGerente) {
    rolGerente = await prisma.tbl_rol.create({
      data: {
        codigo: 'GERENTE',
        descripcion: 'Gerente de cobranza',
        estado: true,
      },
    });
  }
  const countGer = await asignarPermisosARol(
    rolGerente.idrol,
    PERMISOS_GERENTE,
  );
  console.log(`  ✅ ${countGer} permisos asignados a GERENTE`);

  console.log('✅ Seed de permisos completado!');
}

if (require.main === module) {
  seedPermisos()
    .catch((e) => {
      console.error('❌ Error en seed de permisos:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
