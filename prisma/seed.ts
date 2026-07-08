/**
 * SCRIPT DE SEED PRINCIPAL
 * 
 * Ejecutar con: npm run db:seed
 * o directamente: tsx prisma/seed.ts
 */

import { seedAuth } from "./seed-auth";
import { seedPais } from "./seed-pais";
import { seedDepartamentoNicaragua } from "./seed-departamento-nicaragua";
import { seedPermisos } from "./seed-permisos";
import { seedCodigosCobranza } from "./seed-codigos-cobranza";
import { seedFeriadosNicaragua } from "./seed-feriados-nicaragua";
import { seedHorariosCobranza } from "./seed-horarios-cobranza";
import { seedCatalogosCliente } from "./seed-catalogos-cliente";
import { seedCobranzaInicial } from "./seed-cobranza-inicial";
import { seedCronJobs } from "./seed-cron-jobs";
import { asegurarConfigsCobranzaDefault } from "../src/lib/cobranza/configuracion-cobranza-service";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando proceso de seed...\n");
  
  // 1. Ejecutar seed de países
  await seedPais();
  
  // 2. Ejecutar seed de departamentos de Nicaragua
  await seedDepartamentoNicaragua();
  
  // 3. Ejecutar seed de permisos (debe ejecutarse antes de seedAuth)
  await seedPermisos();
  
  // 4. Ejecutar seed de autenticación (usuarios)
  await seedAuth();

  // 5. Catálogos de cobranza
  await seedCodigosCobranza();
  await seedFeriadosNicaragua();
  await seedHorariosCobranza();
  await seedCatalogosCliente();
  await seedCobranzaInicial();

  // 6. Configuración operativa de cobranza
  await asegurarConfigsCobranzaDefault();
  await seedCronJobs();

  console.log("\n✅ Todos los seeds se han ejecutado correctamente!");
  console.log("\n📋 Credenciales de acceso:");
  console.log("   👤 Administrador (todos los permisos):");
  console.log("      Email: admin@flowpay.com");
  console.log("      Contraseña: admin123");
  console.log("\n   👤 Supervisor:");
  console.log("      Email: supervisor@flowpay.com");
  console.log("      Contraseña: supervisor123");
  console.log("\n   👤 Gerente:");
  console.log("      Email: gerente@flowpay.com");
  console.log("      Contraseña: gerente123");
  console.log("\n   👤 Cobrador (reporta al supervisor):");
  console.log("      Email: cobrador@flowpay.com");
  console.log("      Contraseña: cobrador123");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed principal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
