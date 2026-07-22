/**
 * Migra passwords legacy (SHA-256 / columna `password`) a bcrypt (I016).
 *
 * Uso: npx tsx scripts/migrate-passwords-bcrypt.ts
 * Requiere DATABASE_URL. No imprime secretos.
 */

import { prisma } from '../src/lib/prisma';
import {
  hashPassword,
  isBcryptHash,
  simpleHash,
  verifyPassword,
} from '../src/lib/auth/password';

async function main(): Promise<void> {
  const usuarios = await prisma.tbl_usuario.findMany({
    where: { deletedAt: null },
    select: {
      idusuario: true,
      email: true,
      passwordHash: true,
      salt: true,
      password: true,
    },
  });

  let migrados = 0;
  let yaBcrypt = 0;
  let sinPassword = 0;
  let legacySinUpgrade = 0;

  for (const u of usuarios) {
    if (u.passwordHash && isBcryptHash(u.passwordHash)) {
      if (u.password) {
        await prisma.tbl_usuario.update({
          where: { idusuario: u.idusuario },
          data: { password: null },
        });
        migrados += 1;
      } else {
        yaBcrypt += 1;
      }
      continue;
    }

    if (!u.passwordHash && !u.password) {
      sinPassword += 1;
      continue;
    }

    // No podemos conocer el plaintext: marcar para upgrade en próximo login.
    // Si solo hay `password` SHA simple sin salt, dejamos el dual path activo.
    legacySinUpgrade += 1;
  }

  console.warn(
    JSON.stringify({
      total: usuarios.length,
      yaBcrypt,
      limpiadosPasswordColumna: migrados,
      sinPassword,
      pendientesUpgradeEnLogin: legacySinUpgrade,
      nota: 'Usuarios SHA-256 migran a bcrypt en el próximo login exitoso (auth-service).',
    }),
  );

  // Smoke: hash/verify bcrypt sigue OK
  const { hash, salt } = await hashPassword('probe-flowpay-i016');
  const ok = await verifyPassword('probe-flowpay-i016', hash, salt);
  if (!ok || simpleHash('x').length < 32) {
    throw new Error('Smoke bcrypt falló');
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
