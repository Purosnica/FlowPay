import { PrismaClient } from '@prisma/client';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const result = await prisma.$executeRaw`
      UPDATE tbl_liquidacion
      SET periodoActivo = periodo
      WHERE deletedAt IS NULL
        AND (periodoActivo IS NULL OR periodoActivo = '')
    `;
    console.log('filas_actualizadas:', result);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
