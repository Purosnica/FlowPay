/**
 * SCRIPT DE SEED PARA CREAR USUARIO DE PRUEBA
 * 
 * Ejecutar con: tsx prisma/seed-auth.ts
 * o como parte del seed principal: npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

export async function seedAuth() {
  console.log("\n🌱 Creando usuarios de prueba...");

  // Buscar o crear rol de administrador
  let rolAdmin = await prisma.tbl_rol.findFirst({
    where: { codigo: "ADMIN" },
  });

  if (!rolAdmin) {
    console.log("📝 Creando rol ADMIN...");
    rolAdmin = await prisma.tbl_rol.create({
      data: {
        codigo: "ADMIN",
        descripcion: "Administrador del sistema",
        estado: true,
      },
    });
  }

  // Buscar o crear rol de cobrador
  let rolCobrador = await prisma.tbl_rol.findFirst({
    where: { codigo: "COBRADOR" },
  });

  if (!rolCobrador) {
    console.log("📝 Creando rol COBRADOR...");
    rolCobrador = await prisma.tbl_rol.create({
      data: {
        codigo: "COBRADOR",
        descripcion: "Cobrador de cartera",
        estado: true,
      },
    });
  }

  // Crear usuario administrador
  const { hash, salt } = await hashPassword("admin123");
  
  const usuarioAdmin = await prisma.tbl_usuario.upsert({
    where: { email: "admin@flowpay.com" },
    update: {
      passwordHash: hash,
      salt: salt,
      activo: true,
    },
    create: {
      idrol: rolAdmin.idrol,
      nombre: "Administrador",
      email: "admin@flowpay.com",
      passwordHash: hash,
      salt: salt,
      activo: true,
    },
  });

  console.log("✅ Usuario administrador creado/actualizado:");
  console.log(`   📧 Email: admin@flowpay.com`);
  console.log(`   🔑 Contraseña: admin123`);

  // Crear usuario cobrador
  const { hash: hashCobrador, salt: saltCobrador } = await hashPassword("cobrador123");
  
  const usuarioCobrador = await prisma.tbl_usuario.upsert({
    where: { email: "cobrador@flowpay.com" },
    update: {
      passwordHash: hashCobrador,
      salt: saltCobrador,
      activo: true,
    },
    create: {
      idrol: rolCobrador.idrol,
      nombre: "Cobrador de Prueba",
      email: "cobrador@flowpay.com",
      passwordHash: hashCobrador,
      salt: saltCobrador,
      activo: true,
    },
  });

  console.log("✅ Usuario cobrador creado/actualizado:");
  console.log(`   📧 Email: cobrador@flowpay.com`);
  console.log(`   🔑 Contraseña: cobrador123`);

  console.log("\n🎉 Usuarios de prueba configurados exitosamente!");
}

// Si se ejecuta directamente, ejecutar la función
if (require.main === module) {
  seedAuth()
    .catch((e) => {
      console.error("❌ Error en seed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
