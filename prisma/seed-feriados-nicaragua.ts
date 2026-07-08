/**
 * SCRIPT DE SEED PARA DÍAS FERIADOS DE NICARAGUA
 *
 * Carga los feriados nacionales de fecha fija usados por el motor de horarios de
 * cobranza (Ley 842 / Norma CONAMI: prohibido gestionar en domingos y feriados).
 * Los feriados movibles (Jueves y Viernes Santo) deben registrarse manualmente
 * por año, ya que dependen del calendario litúrgico.
 * Ejecutar con: npx tsx prisma/seed-feriados-nicaragua.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface FeriadoFijo {
  mes: number; // 1-12
  dia: number;
  descripcion: string;
}

// Feriados nacionales de fecha fija en Nicaragua
const FERIADOS_FIJOS: FeriadoFijo[] = [
  { mes: 1, dia: 1, descripcion: "Año Nuevo" },
  { mes: 5, dia: 1, descripcion: "Día Internacional del Trabajo" },
  { mes: 7, dia: 19, descripcion: "Día de la Revolución" },
  { mes: 9, dia: 14, descripcion: "Batalla de San Jacinto" },
  { mes: 9, dia: 15, descripcion: "Día de la Independencia" },
  { mes: 12, dia: 8, descripcion: "La Purísima Concepción" },
  { mes: 12, dia: 25, descripcion: "Navidad" },
];

// Años para los que se generan los feriados fijos
const ANIOS = [new Date().getFullYear(), new Date().getFullYear() + 1];

export async function seedFeriadosNicaragua(): Promise<void> {
  console.log("\n🌱 Iniciando seed de feriados de Nicaragua...");

  let creados = 0;
  for (const anio of ANIOS) {
    for (const feriado of FERIADOS_FIJOS) {
      const fecha = new Date(Date.UTC(anio, feriado.mes - 1, feriado.dia));

      const existe = await prisma.tbl_dia_feriado.findFirst({
        where: { fecha },
      });

      if (!existe) {
        await prisma.tbl_dia_feriado.create({
          data: { fecha, descripcion: feriado.descripcion },
        });
        creados++;
      }
    }
  }

  console.log(`  ✅ Feriados creados: ${creados} (años ${ANIOS.join(", ")})`);
  console.log("✅ Seed de feriados de Nicaragua completado!");
}

if (require.main === module) {
  seedFeriadosNicaragua()
    .catch((e) => {
      console.error("❌ Error en seed de feriados:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
