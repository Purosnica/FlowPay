/**
 * Upsert plantillas EMAIL + prueba SMTP de cobranza.
 * Uso: npx tsx scripts/test-email-cobranza.ts
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import {
  aplicarVariablesPlantilla,
  construirVariablesPlantilla,
  type PlantillaMensajeContext,
} from '../src/lib/cobranza/plantilla-mensaje-utils';

const prisma = new PrismaClient();

const DESTINO_PRUEBA =
  process.env.SMTP_TEST_TO ?? process.env.SMTP_USER ?? 'cobranza@tictaccredit.com';

async function upsertPlantillasEmail(): Promise<{
  idmandante: number;
  plantillas: Array<{ idplantilla: number; nombre: string; contenido: string }>;
}> {
  const mandante = await prisma.tbl_mandante.findFirst({
    where: { codigo: 'CREDICOMPRAS', deletedAt: null },
  });
  if (!mandante) {
    throw new Error('Mandante CREDICOMPRAS no encontrado. Ejecute el seed primero.');
  }

  const plantillasPath = path.join(
    process.cwd(),
    'prisma',
    'data',
    'plantillas-credicompras.json',
  );
  const todas = JSON.parse(fs.readFileSync(plantillasPath, 'utf-8')) as Array<{
    nombre: string;
    canal: string;
    etapa: string;
    contenido: string;
  }>;
  const emails = todas.filter((p) => p.canal === 'EMAIL');

  const guardadas: Array<{
    idplantilla: number;
    nombre: string;
    contenido: string;
  }> = [];

  for (const pm of emails) {
    const existe = await prisma.tbl_plantilla_mensaje.findFirst({
      where: {
        idmandante: mandante.idmandante,
        nombre: pm.nombre,
        deletedAt: null,
      },
    });
    const row = existe
      ? await prisma.tbl_plantilla_mensaje.update({
          where: { idplantilla: existe.idplantilla },
          data: {
            canal: pm.canal,
            etapa: pm.etapa,
            contenido: pm.contenido,
            estado: true,
          },
        })
      : await prisma.tbl_plantilla_mensaje.create({
          data: {
            idmandante: mandante.idmandante,
            nombre: pm.nombre,
            canal: pm.canal,
            etapa: pm.etapa,
            contenido: pm.contenido,
            estado: true,
          },
        });
    guardadas.push({
      idplantilla: row.idplantilla,
      nombre: row.nombre,
      contenido: row.contenido,
    });
    process.stdout.write(
      `Plantilla OK: ${row.nombre} (id=${row.idplantilla})\n`,
    );
  }

  return { idmandante: mandante.idmandante, plantillas: guardadas };
}

function buildDemoContext(): PlantillaMensajeContext {
  return {
    prestamo: {
      noPrestamo: 'DEMO-001',
      saldoTotal: 12500.5,
      diasMora: 45,
      interesMoratorio: 350,
      gestionCobranza: 100,
      moneda: 'NIO',
      fechaVencimiento: new Date('2026-05-15').toISOString(),
    },
    cliente: {
      primer_nombres: 'Juan',
      segundo_nombres: null,
      primer_apellido: 'Pérez',
      segundo_apellido: null,
      numerodocumento: '001-010190-0001A',
      celular: '88888888',
      telefono: null,
      email: DESTINO_PRUEBA,
    },
    mandanteNombre: 'CREDICOMPRAS',
  };
}

async function probarSmtpYEnviar(
  plantilla: { nombre: string; contenido: string },
): Promise<void> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user;
  const fromName = process.env.SMTP_FROM_NAME ?? 'Cobranza TicTac Credit';
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === 'true';

  if (!host || !user || !pass || !from) {
    throw new Error(
      'Faltan SMTP_HOST / SMTP_USER / SMTP_PASS / SMTP_FROM en .env',
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  process.stdout.write('Verificando SMTP...\n');
  await transporter.verify();
  process.stdout.write('SMTP verify OK\n');

  const vars = construirVariablesPlantilla(buildDemoContext());
  const body = aplicarVariablesPlantilla(plantilla.contenido, vars);
  const subject = `[PRUEBA FlowPay] ${plantilla.nombre} - Préstamo DEMO-001`;

  const info = await transporter.sendMail({
    from: `"${fromName}" <${from}>`,
    to: DESTINO_PRUEBA,
    subject,
    text: body,
    html: `<pre style="font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;line-height:1.5;">${body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</pre>`,
  });

  process.stdout.write(
    `Correo enviado a ${DESTINO_PRUEBA}\nmessageId=${info.messageId}\naccepted=${JSON.stringify(info.accepted)}\n`,
  );
}

async function main(): Promise<void> {
  const { plantillas } = await upsertPlantillasEmail();
  const principal =
    plantillas.find((p) => p.nombre === 'EMAIL GESTION DE COBRO') ??
    plantillas[0];
  if (!principal) {
    throw new Error('No hay plantillas EMAIL para probar');
  }
  await probarSmtpYEnviar(principal);
}

main()
  .catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`ERROR: ${msg}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
