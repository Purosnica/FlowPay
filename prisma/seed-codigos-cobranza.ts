/**
 * SCRIPT DE SEED PARA CÓDIGOS DE COBRANZA (TIPIFICACIÓN)
 *
 * Crea el catálogo de códigos de acción y de resultado usado en la gestión de
 * cobranza. Los datos provienen del catálogo "CODIGOS CAMPAÑA" del proceso real.
 * Ejecutar con: npx tsx prisma/seed-codigos-cobranza.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CodigoAccionSeed {
  codigo: string;
  descripcion: string;
  esTercero: boolean;
}

interface CodigoResultadoSeed {
  codigo: string;
  descripcion: string;
  grupo: string; // LOCALIZADO / TERCERO / SIN CONTACTO / CANCELADA
  tipoGestion: string; // EFECTIVA / EFECTIVA CON TERCERO / COMPLEMENTO
}

const CODIGOS_ACCION: CodigoAccionSeed[] = [
  { codigo: "TMC", descripcion: "Fecha de pago", esTercero: false },
  { codigo: "TTC", descripcion: "WhatsApp (WAP)", esTercero: false },
  { codigo: "TCC", descripcion: "Teléfono casa cliente", esTercero: false },
  { codigo: "TRE", descripcion: "Teléfono de referencia", esTercero: true },
  { codigo: "LLT", descripcion: "Llamó a tercero", esTercero: true },
  { codigo: "LLC", descripcion: "Llamó cliente", esTercero: false },
  { codigo: "TOT", descripcion: "Monto de pago", esTercero: false },
  { codigo: "VTA", descripcion: "Visita cliente", esTercero: false },
  { codigo: "CE", descripcion: "Correo electrónico", esTercero: false },
  { codigo: "RCE", descripcion: "Recibe correo", esTercero: false },
  { codigo: "SMS", descripcion: "Mensaje de texto", esTercero: false },
  { codigo: "COM", descripcion: "Empresa / centro de trabajo", esTercero: true },
];

const CODIGOS_RESULTADO: CodigoResultadoSeed[] = [
  { codigo: "PRP", descripcion: "Promesa de pago", grupo: "LOCALIZADO", tipoGestion: "GESTION EFECTIVA" },
  { codigo: "LLS", descripcion: "Llamó a sucursal", grupo: "LOCALIZADO", tipoGestion: "GESTION EFECTIVA" },
  { codigo: "CDP", descripcion: "Confirmación de pago", grupo: "LOCALIZADO", tipoGestion: "GESTION EFECTIVA" },
  { codigo: "PNC", descripcion: "Promesa no cumplida", grupo: "LOCALIZADO", tipoGestion: "GESTION EFECTIVA" },
  { codigo: "CSP", descripcion: "Contacto sin promesa", grupo: "LOCALIZADO", tipoGestion: "GESTION EFECTIVA" },
  { codigo: "DCP", descripcion: "Dejé mensaje de confirmación de pago", grupo: "LOCALIZADO", tipoGestion: "GESTION EFECTIVA" },
  { codigo: "PPA", descripcion: "Pago pendiente de aplicar", grupo: "LOCALIZADO", tipoGestion: "GESTION EFECTIVA" },
  { codigo: "DMT", descripcion: "Dejé mensaje de devolución de llamada con tercero", grupo: "TERCERO", tipoGestion: "GESTION EFECTIVA CON TERCERO" },
  { codigo: "DMS", descripcion: "Dejé mensaje sin devolución de llamada con tercero", grupo: "TERCERO", tipoGestion: "GESTION EFECTIVA CON TERCERO" },
  { codigo: "BZN", descripcion: "Buzón", grupo: "SIN CONTACTO", tipoGestion: "COMPLEMENTO DE GESTION" },
  { codigo: "DMB", descripcion: "Dejé mensaje en buzón", grupo: "SIN CONTACTO", tipoGestion: "GESTION EFECTIVA" },
  { codigo: "TON", descripcion: "Teléfono ocupado o no responde", grupo: "SIN CONTACTO", tipoGestion: "GESTION EFECTIVA" },
  { codigo: "ELL", descripcion: "Escalamiento de llamada", grupo: "SIN CONTACTO", tipoGestion: "GESTION EFECTIVA" },
  { codigo: "ILC", descripcion: "Ilocalizado", grupo: "SIN CONTACTO", tipoGestion: "GESTION EFECTIVA" },
  { codigo: "CCD", descripcion: "Postergación de promesa de pago", grupo: "SIN CONTACTO", tipoGestion: "GESTION EFECTIVA" },
  { codigo: "PPP", descripcion: "Teléfono equivocado", grupo: "SIN CONTACTO", tipoGestion: "GESTION EFECTIVA" },
  { codigo: "CBP", descripcion: "Carta bajo puerta", grupo: "SIN CONTACTO", tipoGestion: "GESTION EFECTIVA" },
  { codigo: "TLE", descripcion: "Cuenta cancelada con descuento", grupo: "CANCELADA", tipoGestion: "GESTION EFECTIVA" },
  { codigo: "CFP", descripcion: "Cliente fuera del país", grupo: "SIN CONTACTO", tipoGestion: "GESTION EFECTIVA" },
  { codigo: "CFA", descripcion: "Cliente fallecido", grupo: "SIN CONTACTO", tipoGestion: "GESTION EFECTIVA" },
  { codigo: "CPR", descripcion: "Cliente preso", grupo: "SIN CONTACTO", tipoGestion: "GESTION EFECTIVA" },
  { codigo: "CDC", descripcion: "Cambio de domicilio cliente", grupo: "SIN CONTACTO", tipoGestion: "COMPLEMENTO DE GESTION" },
  { codigo: "CAN", descripcion: "Cuenta cancelada", grupo: "CANCELADA", tipoGestion: "GESTION EFECTIVA" },
  { codigo: "CSD", descripcion: "Cuenta cancelada sin descuento", grupo: "CANCELADA", tipoGestion: "GESTION EFECTIVA" },
];

export async function seedCodigosCobranza(): Promise<void> {
  console.log("\n🌱 Iniciando seed de códigos de cobranza (tipificación)...");

  let accionesCreadas = 0;
  for (const accion of CODIGOS_ACCION) {
    const existe = await prisma.tbl_codigo_accion.findUnique({
      where: { codigo: accion.codigo },
    });
    if (!existe) {
      await prisma.tbl_codigo_accion.create({ data: accion });
      accionesCreadas++;
    }
  }
  console.log(`  ✅ Códigos de acción creados: ${accionesCreadas}/${CODIGOS_ACCION.length}`);

  let resultadosCreados = 0;
  for (const resultado of CODIGOS_RESULTADO) {
    const existe = await prisma.tbl_codigo_resultado.findUnique({
      where: { codigo: resultado.codigo },
    });
    if (!existe) {
      await prisma.tbl_codigo_resultado.create({ data: resultado });
      resultadosCreados++;
    }
  }
  console.log(`  ✅ Códigos de resultado creados: ${resultadosCreados}/${CODIGOS_RESULTADO.length}`);

  console.log("✅ Seed de códigos de cobranza completado!");
}

if (require.main === module) {
  seedCodigosCobranza()
    .catch((e) => {
      console.error("❌ Error en seed de códigos de cobranza:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
