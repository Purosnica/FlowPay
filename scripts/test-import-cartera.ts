/**
 * Prueba rápida de importación de cartera.
 * Uso: npx tsx scripts/test-import-cartera.ts
 */
import 'dotenv/config';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { importarCartera } from '../src/lib/cobranza/import/cartera-import-service';
import { parseCarteraFile } from '../src/lib/cobranza/import/parse-cartera-file';

const ARCHIVO =
  'C:\\Users\\Bryan Silva\\Downloads\\CARTERA CREDITO PARA COMPRAS 16032026 (1BLOQ).xlsm';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  if (!fs.existsSync(ARCHIVO)) {
    throw new Error(`Archivo no encontrado: ${ARCHIVO}`);
  }

  const buffer = fs.readFileSync(ARCHIVO);
  const parsed = parseCarteraFile(buffer, 'cartera.xlsm', {
    nombreHoja: 'data',
  });
  process.stdout.write(
    `Filas parseadas: ${parsed.filas.length}, faltantes: ${parsed.columnasFaltantes.join(', ') || 'ninguna'}\n`,
  );

  const limite = Number(process.env.IMPORT_TEST_LIMIT ?? '0');

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { codigo: 'CREDICOMPRAS', deletedAt: null },
  });
  if (!mandante) {
    throw new Error('Mandante CREDICOMPRAS no encontrado');
  }

  const campana = await prisma.tbl_campana.findFirst({
    where: { idmandante: mandante.idmandante, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!campana) {
    throw new Error('Sin campaña para CREDICOMPRAS');
  }

  const admin = await prisma.tbl_usuario.findFirst({
    where: { email: 'admin@flowpay.com', activo: true, deletedAt: null },
  });
  if (!admin) {
    throw new Error('Usuario admin no encontrado');
  }

  if (limite > 0) {
    process.stdout.write(`Modo prueba: solo ${limite} filas\n`);
  }

  const inicio = Date.now();
  const resultado = await importarCartera({
    idmandante: mandante.idmandante,
    idcampana: campana.idcampana,
    fechaCorte: new Date(),
    idusuario: admin.idusuario,
    buffer,
    nombreArchivo: 'cartera.xlsm',
    nombreHoja: 'data',
    maxFilas: limite > 0 ? limite : undefined,
  });
  const duracion = ((Date.now() - inicio) / 1000).toFixed(1);

  process.stdout.write(`Importación en ${duracion}s\n`);
  process.stdout.write(JSON.stringify(resultado, null, 2));
  process.stdout.write('\n');
}

main()
  .catch((err: unknown) => {
    const mensaje = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: ${mensaje}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
