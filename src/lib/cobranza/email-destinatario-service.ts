/**
 * Valida que el destinatario de un correo de cobranza pertenezca al deudor del préstamo.
 */

import { prisma } from '@/lib/prisma';
import { errorValidacion, errorNegocio, ErrorCode } from '@/lib/services/error-types';

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function validarDestinatarioEmailCobro(params: {
  idprestamo: number;
  to: string;
}): Promise<{ idcliente: number; idmandante: number }> {
  const email = normalizarEmail(params.to);
  if (!email) {
    throw errorValidacion('Correo del deudor inválido');
  }

  const prestamo = await prisma.tbl_prestamo.findUnique({
    where: { idprestamo: params.idprestamo },
    select: {
      idcliente: true,
      idmandante: true,
      deletedAt: true,
      cliente: {
        select: {
          email: true,
          contactos: {
            where: {
              deletedAt: null,
              estado: true,
              tipo: 'EMAIL',
              autorizado: true,
              noContactar: false,
            },
            select: { valor: true },
          },
        },
      },
    },
  });

  if (!prestamo || prestamo.deletedAt) {
    throw errorNegocio(
      ErrorCode.PRESTAMO_NO_ENCONTRADO,
      'Préstamo no encontrado.',
    );
  }

  const emailsPermitidos = new Set<string>();
  if (prestamo.cliente.email) {
    emailsPermitidos.add(normalizarEmail(prestamo.cliente.email));
  }
  for (const contacto of prestamo.cliente.contactos) {
    emailsPermitidos.add(normalizarEmail(contacto.valor));
  }

  if (!emailsPermitidos.has(email)) {
    throw errorValidacion(
      'El correo no corresponde a un contacto autorizado del deudor.',
    );
  }

  return {
    idcliente: prestamo.idcliente,
    idmandante: prestamo.idmandante,
  };
}
