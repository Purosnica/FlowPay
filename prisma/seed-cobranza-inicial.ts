/**
 * Mandante demo CREDICOMPRAS + plantilla de importación por defecto.
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { MAPEO_CREDICOMPRAS } from '../src/lib/cobranza/import/mapeo-default';

const prisma = new PrismaClient();

export async function seedCobranzaInicial(): Promise<void> {
  console.log('\n🌱 Seed cobranza inicial (mandante demo + plantilla)...');

  const mandante = await prisma.tbl_mandante.upsert({
    where: { codigo: 'CREDICOMPRAS' },
    update: {
      nombre: 'CREDICOMPRAS',
      regulador: 'CONAMI',
      descuentoMaximo: 40,
      estado: true,
    },
    create: {
      codigo: 'CREDICOMPRAS',
      nombre: 'CREDICOMPRAS',
      regulador: 'CONAMI',
      descuentoMaximo: 40,
      estado: true,
    },
  });
  console.log(`  ✅ Mandante: ${mandante.nombre}`);

  const plantillaExiste = await prisma.tbl_plantilla_importacion.findFirst({
    where: {
      idmandante: mandante.idmandante,
      nombre: 'CREDICOMPRAS - Hoja data',
      deletedAt: null,
    },
  });

  if (plantillaExiste) {
    await prisma.tbl_plantilla_importacion.update({
      where: { idplantillaImp: plantillaExiste.idplantillaImp },
      data: {
        mapeo: JSON.stringify(MAPEO_CREDICOMPRAS),
        formatoFecha: 'MM/DD/YYYY',
        estado: true,
      },
    });
    console.log('  ✅ Plantilla importación CREDICOMPRAS (mapeo actualizado)');
  } else {
    await prisma.tbl_plantilla_importacion.create({
      data: {
        idmandante: mandante.idmandante,
        nombre: 'CREDICOMPRAS - Hoja data',
        mapeo: JSON.stringify(MAPEO_CREDICOMPRAS),
        formatoFecha: 'MM/DD/YYYY',
        estado: true,
      },
    });
    console.log('  ✅ Plantilla importación CREDICOMPRAS');
  }

  const cobrador = await prisma.tbl_usuario.findUnique({
    where: { email: 'cobrador@flowpay.com' },
  });
  if (cobrador) {
    await prisma.tbl_usuario.update({
      where: { idusuario: cobrador.idusuario },
      data: { porcentajeComision: 3 },
    });
    await prisma.tbl_usuario_mandante.upsert({
      where: {
        idusuario_idmandante: {
          idusuario: cobrador.idusuario,
          idmandante: mandante.idmandante,
        },
      },
      create: {
        idusuario: cobrador.idusuario,
        idmandante: mandante.idmandante,
      },
      update: {},
    });
    console.log('  ✅ Cobrador asignado a CREDICOMPRAS');
  }

  const tramosComision = [
    { tramoMoraMin: 0, tramoMoraMax: 30, porcentaje: 20 },
    { tramoMoraMin: 31, tramoMoraMax: 90, porcentaje: 20 },
    { tramoMoraMin: 91, tramoMoraMax: null, porcentaje: 20 },
  ];

  for (const tramo of tramosComision) {
    const existe = await prisma.tbl_comision_cobro.findFirst({
      where: {
        idmandante: mandante.idmandante,
        tramoMoraMin: tramo.tramoMoraMin,
        deletedAt: null,
      },
    });
    if (!existe) {
      await prisma.tbl_comision_cobro.create({
        data: {
          idmandante: mandante.idmandante,
          tramoMoraMin: tramo.tramoMoraMin,
          tramoMoraMax: tramo.tramoMoraMax,
          porcentaje: tramo.porcentaje,
          estado: true,
        },
      });
    }
  }
  console.log('  ✅ Tramos de recuperación CREDICOMPRAS');

  const tramosPolitica = [
    { tramoMoraMin: 0, tramoMoraMax: 30, porcentaje: 5 },
    { tramoMoraMin: 31, tramoMoraMax: 90, porcentaje: 10 },
    { tramoMoraMin: 91, tramoMoraMax: null, porcentaje: 15 },
  ];

  for (const tramo of tramosPolitica) {
    const existe = await prisma.tbl_politica_descuento.findFirst({
      where: {
        idmandante: mandante.idmandante,
        tramoMoraMin: tramo.tramoMoraMin,
        deletedAt: null,
      },
    });
    if (!existe) {
      await prisma.tbl_politica_descuento.create({
        data: {
          idmandante: mandante.idmandante,
          tramoMoraMin: tramo.tramoMoraMin,
          tramoMoraMax: tramo.tramoMoraMax,
          porcentaje: tramo.porcentaje,
          estado: true,
        },
      });
    }
  }
  console.log('  ✅ Políticas de descuento CREDICOMPRAS');

  const plantillasPath = path.join(__dirname, 'data', 'plantillas-credicompras.json');
  let plantillasMsg: Array<{
    nombre: string;
    canal: string;
    etapa: string;
    contenido: string;
  }> = [];

  if (fs.existsSync(plantillasPath)) {
    plantillasMsg = JSON.parse(
      fs.readFileSync(plantillasPath, 'utf-8'),
    ) as typeof plantillasMsg;
  }

  for (const pm of plantillasMsg) {
    const existe = await prisma.tbl_plantilla_mensaje.findFirst({
      where: {
        idmandante: mandante.idmandante,
        nombre: pm.nombre,
        deletedAt: null,
      },
    });
    if (existe) {
      await prisma.tbl_plantilla_mensaje.update({
        where: { idplantilla: existe.idplantilla },
        data: {
          canal: pm.canal,
          etapa: pm.etapa,
          contenido: pm.contenido,
          estado: true,
        },
      });
    } else {
      await prisma.tbl_plantilla_mensaje.create({
        data: { idmandante: mandante.idmandante, ...pm },
      });
    }
  }
  console.log(
    `  ✅ Plantillas de mensaje CREDICOMPRAS (${plantillasMsg.length})`,
  );

  console.log('✅ Seed cobranza inicial completado');
}

if (require.main === module) {
  seedCobranzaInicial()
    .catch((e) => {
      console.error('❌ Error seed cobranza inicial:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
