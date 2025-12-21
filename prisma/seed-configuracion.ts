/**
 * SCRIPT DE SEED PARA CONFIGURACIÓN DEL SISTEMA
 * 
 * Este script crea las configuraciones base del sistema.
 * Ejecutar con: npx tsx prisma/seed-configuracion.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CONFIGURACIONES_BASE = [
  // ============================================
  // CONFIGURACIONES DE MORA
  // ============================================
  {
    clave: "TASA_MORA",
    valor: "0.36",
    tipo: "decimal",
    descripcion: "Tasa de mora anual (ej: 0.36 = 36%)",
    categoria: "mora",
  },
  {
    clave: "DIAS_GRACIA",
    valor: "0",
    tipo: "numero",
    descripcion: "Días de gracia antes de aplicar mora",
    categoria: "mora",
  },
  {
    clave: "DIAS_MORA_CASTIGADO",
    valor: "90",
    tipo: "numero",
    descripcion: "Días de mora para considerar préstamo como castigado",
    categoria: "mora",
  },

  // ============================================
  // CONFIGURACIONES DE COBRANZA
  // ============================================
  {
    clave: "HORARIO_COBRANZA_INICIO",
    valor: "08:00",
    tipo: "texto",
    descripcion: "Hora de inicio permitida para cobranza (formato HH:mm)",
    categoria: "cobranza",
  },
  {
    clave: "HORARIO_COBRANZA_FIN",
    valor: "18:00",
    tipo: "texto",
    descripcion: "Hora de fin permitida para cobranza (formato HH:mm)",
    categoria: "cobranza",
  },
  {
    clave: "DIAS_COBRANZA_PERMITIDOS",
    valor: "1,2,3,4,5",
    tipo: "texto",
    descripcion: "Días de la semana permitidos para cobranza (1=Lunes, 7=Domingo)",
    categoria: "cobranza",
  },

  // ============================================
  // CONFIGURACIONES DE REESTRUCTURACIÓN
  // ============================================
  {
    clave: "MAXIMO_REESTRUCTURACIONES",
    valor: "2",
    tipo: "numero",
    descripcion: "Número máximo de reestructuraciones permitidas por préstamo",
    categoria: "reestructuracion",
  },
  {
    clave: "LIMITE_REESTRUCTURACION_DIAS_MORA",
    valor: "90",
    tipo: "numero",
    descripcion: "Días máximos de mora para permitir reestructuración",
    categoria: "reestructuracion",
  },
  {
    clave: "LIMITE_REESTRUCTURACION_MONTO",
    valor: "100000",
    tipo: "numero",
    descripcion: "Monto máximo para permitir reestructuración",
    categoria: "reestructuracion",
  },

  // ============================================
  // CONFIGURACIONES DE PRÉSTAMOS
  // ============================================
  {
    clave: "LIMITE_MONTO_PRESTAMO",
    valor: "1000000",
    tipo: "decimal",
    descripcion: "Límite máximo de monto para préstamos",
    categoria: "prestamos",
  },

  // ============================================
  // CONFIGURACIONES DE PAGOS
  // ============================================
  {
    clave: "METODOS_PAGO_HABILITADOS",
    valor: "EFECTIVO,TRANSFERENCIA,TARJETA,CHEQUE",
    tipo: "texto",
    descripcion: "Métodos de pago habilitados (separados por comas)",
    categoria: "pagos",
  },
];

async function main() {
  console.log("🌱 Iniciando seed de configuración del sistema...");

  for (const config of CONFIGURACIONES_BASE) {
    const existe = await prisma.tbl_configuracion_sistema.findUnique({
      where: { clave: config.clave },
    });

    if (!existe) {
      await prisma.tbl_configuracion_sistema.create({
        data: config,
      });
      console.log(`  ✅ Configuración creada: ${config.clave} = ${config.valor}`);
    } else {
      // Actualizar si el valor por defecto cambió
      if (existe.valor !== config.valor && !existe.deletedAt) {
        await prisma.tbl_configuracion_sistema.update({
          where: { idconfiguracion: existe.idconfiguracion },
          data: {
            valor: config.valor,
            tipo: config.tipo,
            descripcion: config.descripcion,
            categoria: config.categoria,
          },
        });
        console.log(`  🔄 Configuración actualizada: ${config.clave} = ${config.valor}`);
      } else {
        console.log(`  ⏭️  Configuración ya existe: ${config.clave}`);
      }
    }
  }

  console.log("✅ Seed de configuración completado!");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed de configuración:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });




