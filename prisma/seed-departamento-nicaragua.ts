/**
 * SCRIPT DE SEED PARA DEPARTAMENTOS DE NICARAGUA
 * 
 * Este script crea los departamentos de Nicaragua asociados al país.
 * Ejecutar con: npx tsx prisma/seed-departamento-nicaragua.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Lista de departamentos y regiones autónomas de Nicaragua
const DEPARTAMENTOS_NICARAGUA = [
  { descripcion: "Boaco" },
  { descripcion: "Carazo" },
  { descripcion: "Chinandega" },
  { descripcion: "Chontales" },
  { descripcion: "Estelí" },
  { descripcion: "Granada" },
  { descripcion: "Jinotega" },
  { descripcion: "León" },
  { descripcion: "Madriz" },
  { descripcion: "Managua" },
  { descripcion: "Masaya" },
  { descripcion: "Matagalpa" },
  { descripcion: "Nueva Segovia" },
  { descripcion: "Río San Juan" },
  { descripcion: "Rivas" },
  { descripcion: "Región Autónoma de la Costa Caribe Norte" },
  { descripcion: "Región Autónoma de la Costa Caribe Sur" },
];

export async function seedDepartamentoNicaragua() {
  console.log("\n🌱 Iniciando seed de departamentos de Nicaragua...");

  // Buscar el país Nicaragua por su código ISO
  const paisNicaragua = await prisma.tbl_pais.findFirst({
    where: { codepais: "NI" },
  });

  if (!paisNicaragua) {
    console.error("❌ Error: No se encontró el país Nicaragua (código: NI)");
    console.log("💡 Sugerencia: Ejecuta primero el seed de países (seed-pais.ts)");
    throw new Error("País Nicaragua no encontrado");
  }

  console.log(`✅ País encontrado: ${paisNicaragua.descripcion} (ID: ${paisNicaragua.idpais})`);
  console.log(`📊 Total de departamentos a procesar: ${DEPARTAMENTOS_NICARAGUA.length}\n`);

  let creados = 0;
  let existentes = 0;
  let errores = 0;

  for (const departamento of DEPARTAMENTOS_NICARAGUA) {
    try {
      // Verificar si el departamento ya existe para este país
      const existe = await prisma.tbl_departamento.findFirst({
        where: {
          idpais: paisNicaragua.idpais,
          descripcion: departamento.descripcion,
        },
      });

      if (!existe) {
        await prisma.tbl_departamento.create({
          data: {
            idpais: paisNicaragua.idpais,
            descripcion: departamento.descripcion,
            estado: true,
          },
        });
        creados++;
        console.log(`  ✅ Departamento creado: ${departamento.descripcion}`);
      } else {
        // Actualizar si el estado cambió a inactivo (reactivarlo)
        if (!existe.estado) {
          await prisma.tbl_departamento.update({
            where: { iddepartamento: existe.iddepartamento },
            data: { estado: true },
          });
          console.log(`  🔄 Departamento reactivado: ${departamento.descripcion}`);
        } else {
          existentes++;
        }
      }
    } catch (error) {
      errores++;
      console.error(`  ❌ Error al procesar ${departamento.descripcion}:`, error);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 Resumen del seed de departamentos de Nicaragua:");
  console.log(`   ✅ Departamentos creados: ${creados}`);
  console.log(`   ⏭️  Departamentos ya existentes: ${existentes}`);
  if (errores > 0) {
    console.log(`   ❌ Errores: ${errores}`);
  }
  console.log(`   📈 Total procesados: ${DEPARTAMENTOS_NICARAGUA.length}`);
  console.log("✅ Seed de departamentos de Nicaragua completado!");
}

// Si se ejecuta directamente
if (require.main === module) {
  seedDepartamentoNicaragua()
    .catch((e) => {
      console.error("❌ Error en seed de departamentos:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

