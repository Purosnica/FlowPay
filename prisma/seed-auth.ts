/**
 * SCRIPT DE SEED PARA CREAR USUARIO DE PRUEBA
 *
 * Ejecutar con: tsx prisma/seed-auth.ts
 * o como parte del seed principal: npm run db:seed
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth/password';

const prisma = new PrismaClient();

export async function seedAuth() {
  console.log('\n🌱 Creando usuarios de prueba...');

  let rolAdmin = await prisma.tbl_rol.findFirst({
    where: { codigo: 'ADMIN' },
  });

  if (!rolAdmin) {
    console.log('⚠️  Rol ADMIN no encontrado. Creando...');
    rolAdmin = await prisma.tbl_rol.create({
      data: {
        codigo: 'ADMIN',
        descripcion: 'Administrador del sistema',
        estado: true,
      },
    });
    console.log('✅ Rol ADMIN creado');
  } else {
    console.log('✅ Rol ADMIN encontrado');
  }

  let rolCobrador = await prisma.tbl_rol.findFirst({
    where: { codigo: 'COBRADOR' },
  });

  if (!rolCobrador) {
    console.log('📝 Creando rol COBRADOR...');
    rolCobrador = await prisma.tbl_rol.create({
      data: {
        codigo: 'COBRADOR',
        descripcion: 'Cobrador de cartera',
        estado: true,
      },
    });
  }

  const rolSupervisor = await prisma.tbl_rol.findFirst({
    where: { codigo: 'SUPERVISOR' },
  });

  const rolGerente = await prisma.tbl_rol.findFirst({
    where: { codigo: 'GERENTE' },
  });

  const { hash, salt } = await hashPassword('admin123');

  await prisma.tbl_usuario.upsert({
    where: { email: 'admin@flowpay.com' },
    update: {
      passwordHash: hash,
      salt: salt,
      activo: true,
    },
    create: {
      idrol: rolAdmin.idrol,
      nombre: 'Administrador',
      email: 'admin@flowpay.com',
      passwordHash: hash,
      salt: salt,
      activo: true,
    },
  });

  console.log('✅ Usuario administrador creado/actualizado:');
  console.log('   📧 Email: admin@flowpay.com');
  console.log('   🔑 Contraseña: admin123');

  if (rolSupervisor) {
    const { hash: hashSup, salt: saltSup } = await hashPassword('supervisor123');
    const supervisor = await prisma.tbl_usuario.upsert({
      where: { email: 'supervisor@flowpay.com' },
      update: {
        passwordHash: hashSup,
        salt: saltSup,
        activo: true,
        idrol: rolSupervisor.idrol,
      },
      create: {
        idrol: rolSupervisor.idrol,
        nombre: 'Supervisor de Prueba',
        email: 'supervisor@flowpay.com',
        passwordHash: hashSup,
        salt: saltSup,
        activo: true,
      },
    });

    console.log('✅ Usuario supervisor creado/actualizado:');
    console.log('   📧 Email: supervisor@flowpay.com');
    console.log('   🔑 Contraseña: supervisor123');

    const { hash: hashCobrador, salt: saltCobrador } =
      await hashPassword('cobrador123');

    await prisma.tbl_usuario.upsert({
      where: { email: 'cobrador@flowpay.com' },
      update: {
        passwordHash: hashCobrador,
        salt: saltCobrador,
        activo: true,
        idsupervisor: supervisor.idusuario,
      },
      create: {
        idrol: rolCobrador!.idrol,
        nombre: 'Cobrador de Prueba',
        email: 'cobrador@flowpay.com',
        passwordHash: hashCobrador,
        salt: saltCobrador,
        activo: true,
        idsupervisor: supervisor.idusuario,
      },
    });
  } else {
    const { hash: hashCobrador, salt: saltCobrador } =
      await hashPassword('cobrador123');

    await prisma.tbl_usuario.upsert({
      where: { email: 'cobrador@flowpay.com' },
      update: {
        passwordHash: hashCobrador,
        salt: saltCobrador,
        activo: true,
      },
      create: {
        idrol: rolCobrador!.idrol,
        nombre: 'Cobrador de Prueba',
        email: 'cobrador@flowpay.com',
        passwordHash: hashCobrador,
        salt: saltCobrador,
        activo: true,
      },
    });
  }

  console.log('✅ Usuario cobrador creado/actualizado:');
  console.log('   📧 Email: cobrador@flowpay.com');
  console.log('   🔑 Contraseña: cobrador123');

  if (rolGerente) {
    const { hash: hashGer, salt: saltGer } = await hashPassword('gerente123');
    await prisma.tbl_usuario.upsert({
      where: { email: 'gerente@flowpay.com' },
      update: {
        passwordHash: hashGer,
        salt: saltGer,
        activo: true,
        idrol: rolGerente.idrol,
      },
      create: {
        idrol: rolGerente.idrol,
        nombre: 'Gerente de Prueba',
        email: 'gerente@flowpay.com',
        passwordHash: hashGer,
        salt: saltGer,
        activo: true,
      },
    });

    console.log('✅ Usuario gerente creado/actualizado:');
    console.log('   📧 Email: gerente@flowpay.com');
    console.log('   🔑 Contraseña: gerente123');
  }

  console.log('\n🎉 Usuarios de prueba configurados exitosamente!');
}

if (require.main === module) {
  seedAuth()
    .catch((e) => {
      console.error('❌ Error en seed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
