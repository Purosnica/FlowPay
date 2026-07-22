/**
 * Verifica migración password → bcrypt (I016).
 * Exit 1 si queda algún usuario activo sin bcrypt.
 *
 * Uso: npx tsx scripts/migrate-passwords-bcrypt.ts
 */

import { prisma } from '../src/lib/prisma';
import { hashPassword, isBcryptHash, verifyPassword } from '../src/lib/auth/password';

async function main(): Promise<void> {
  const usuarios = await prisma.tbl_usuario.findMany({
    where: { deletedAt: null },
    select: {
      idusuario: true,
      email: true,
      passwordHash: true,
    },
  });

  let yaBcrypt = 0;
  let sinPassword = 0;
  const noBcrypt: string[] = [];

  for (const u of usuarios) {
    if (u.passwordHash && isBcryptHash(u.passwordHash)) {
      yaBcrypt += 1;
      continue;
    }
    if (!u.passwordHash) {
      sinPassword += 1;
      noBcrypt.push(u.email);
      continue;
    }
    noBcrypt.push(u.email);
  }

  console.warn(
    JSON.stringify({
      total: usuarios.length,
      yaBcrypt,
      sinPassword,
      pendientes: noBcrypt.length,
      emailsPendientes: noBcrypt,
      nota: 'Columna password legacy eliminada; solo bcrypt.',
    }),
  );

  const { hash, salt } = await hashPassword('probe-flowpay-i016');
  const ok = await verifyPassword('probe-flowpay-i016', hash, salt);
  if (!ok) {
    throw new Error('Smoke bcrypt falló');
  }

  if (noBcrypt.length > 0) {
    throw new Error(
      `Quedan ${noBcrypt.length} usuarios sin bcrypt. Reset admin requerido.`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
