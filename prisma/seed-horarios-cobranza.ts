/**
 * SCRIPT DE SEED PARA HORARIOS LEGALES DE COBRANZA
 *
 * Carga la ventana horaria por defecto permitida para gestionar cobranza en
 * Nicaragua (Norma CONAMI Art.25: lunes a sábado de 08:00 a 19:00; prohibido
 * domingos). Se registra como horario global (idmandante = null); cada mandante
 * puede sobreescribirlo según su regulador.
 * Ejecutar con: npx tsx prisma/seed-horarios-cobranza.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface HorarioSeed {
  diaSemana: number; // 1=Lun ... 7=Dom
  horaInicio: string;
  horaFin: string;
  permitido: boolean;
}

const HORARIOS_DEFAULT: HorarioSeed[] = [
  { diaSemana: 1, horaInicio: "08:00", horaFin: "19:00", permitido: true },
  { diaSemana: 2, horaInicio: "08:00", horaFin: "19:00", permitido: true },
  { diaSemana: 3, horaInicio: "08:00", horaFin: "19:00", permitido: true },
  { diaSemana: 4, horaInicio: "08:00", horaFin: "19:00", permitido: true },
  { diaSemana: 5, horaInicio: "08:00", horaFin: "19:00", permitido: true },
  { diaSemana: 6, horaInicio: "08:00", horaFin: "19:00", permitido: true },
  { diaSemana: 7, horaInicio: "00:00", horaFin: "00:00", permitido: false },
];

export async function seedHorariosCobranza(): Promise<void> {
  console.log("\n🌱 Iniciando seed de horarios legales de cobranza...");

  let creados = 0;
  for (const horario of HORARIOS_DEFAULT) {
    const existe = await prisma.tbl_horario_cobranza.findFirst({
      where: { idmandante: null, diaSemana: horario.diaSemana },
    });

    if (!existe) {
      await prisma.tbl_horario_cobranza.create({
        data: { idmandante: null, ...horario },
      });
      creados++;
    }
  }

  console.log(`  ✅ Horarios por defecto creados: ${creados}/${HORARIOS_DEFAULT.length}`);
  console.log("✅ Seed de horarios de cobranza completado!");
}

if (require.main === module) {
  seedHorariosCobranza()
    .catch((e) => {
      console.error("❌ Error en seed de horarios:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
