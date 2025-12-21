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
  
  console.log("\n✅ Todos los seeds se han ejecutado correctamente!");
  console.log("\n📋 Credenciales de acceso:");
  console.log("   👤 Administrador (todos los permisos):");
  console.log("      Email: admin@flowpay.com");
  console.log("      Contraseña: admin123");
  console.log("\n   👤 Cobrador:");
  console.log("      Email: cobrador@flowpay.com");
  console.log("      Contraseña: cobrador123");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed principal:", e);
    process.exit(1);
  })
  .finally(async () => {
    // La desconexión se maneja en cada seed individual
    process.exit(0);
  });
