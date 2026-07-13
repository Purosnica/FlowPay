/**
 * Upsert plantilla SMS corta (≤160 caracteres).
 * Uso: npx tsx scripts/upsert-plantilla-sms-corta.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PLANTILLA = {
  nombre: 'SMS COBRO CORTO',
  canal: 'SMS',
  etapa: 'ADMINISTRATIVA',
  contenido:
    '{{mandanteLegal}}: Sr(a) {{nombre}}, prestamo {{prestamo}} saldo {{saldo}}, {{diasMora}} dias mora. Contactenos para regularizar. Gracias.',
};

async function main(): Promise<void> {
  const len = PLANTILLA.contenido.length;
  if (len > 160) {
    throw new Error(`Plantilla excede 160 caracteres (${len})`);
  }

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { codigo: 'CREDICOMPRAS', deletedAt: null },
  });
  if (!mandante) {
    throw new Error('Mandante CREDICOMPRAS no encontrado');
  }

  const existe = await prisma.tbl_plantilla_mensaje.findFirst({
    where: {
      idmandante: mandante.idmandante,
      nombre: PLANTILLA.nombre,
      deletedAt: null,
    },
  });

  const row = existe
    ? await prisma.tbl_plantilla_mensaje.update({
        where: { idplantilla: existe.idplantilla },
        data: {
          canal: PLANTILLA.canal,
          etapa: PLANTILLA.etapa,
          contenido: PLANTILLA.contenido,
          estado: true,
        },
      })
    : await prisma.tbl_plantilla_mensaje.create({
        data: {
          idmandante: mandante.idmandante,
          ...PLANTILLA,
          estado: true,
        },
      });

  process.stdout.write(
    `OK id=${row.idplantilla} chars=${len}\n${row.contenido}\n`,
  );
}

main()
  .catch((err: unknown) => {
    process.stderr.write(
      `ERROR: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
