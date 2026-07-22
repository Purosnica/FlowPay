/**
 * Lock optimista por columna `version` (I019).
 */

import type { Prisma } from '@prisma/client';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';

type Tx = Prisma.TransactionClient;

export async function incrementarVersionPrestamo(
  tx: Tx,
  idprestamo: number,
  versionEsperada: number,
): Promise<void> {
  const r = await tx.tbl_prestamo.updateMany({
    where: { idprestamo, version: versionEsperada, deletedAt: null },
    data: { version: { increment: 1 } },
  });
  if (r.count === 0) {
    throw new GraphQLValidationError(
      'El préstamo fue modificado por otra operación. Recargue e intente de nuevo.',
    );
  }
}

export async function incrementarVersionAcuerdo(
  tx: Tx,
  idacuerdo: number,
  versionEsperada: number,
): Promise<void> {
  const r = await tx.tbl_acuerdo.updateMany({
    where: { idacuerdo, version: versionEsperada, deletedAt: null },
    data: { version: { increment: 1 } },
  });
  if (r.count === 0) {
    throw new GraphQLValidationError(
      'El acuerdo fue modificado por otra operación. Recargue e intente de nuevo.',
    );
  }
}
