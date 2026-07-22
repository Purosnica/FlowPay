/**
 * Valida que el teléfono de un SMS de cobranza pertenezca al deudor del préstamo.
 */

import { prisma } from '@/lib/prisma';
import {
  errorValidacion,
  errorNegocio,
  ErrorCode,
} from '@/lib/services/error-types';

const TIPOS_TELEFONO = ['CELULAR', 'TELEFONO', 'WHATSAPP'] as const;

export function normalizarDigitosTelefono(telefono: string): string {
  return telefono.replace(/\D/g, '');
}

function telefonosEquivalentes(a: string, b: string): boolean {
  const da = normalizarDigitosTelefono(a);
  const db = normalizarDigitosTelefono(b);
  if (!da || !db) {
    return false;
  }
  if (da === db) {
    return true;
  }
  const cortoA = da.length > 8 ? da.slice(-8) : da;
  const cortoB = db.length > 8 ? db.slice(-8) : db;
  return cortoA === cortoB && cortoA.length >= 8;
}

export async function validarDestinatarioSmsCobro(params: {
  idprestamo: number;
  telefono: string;
}): Promise<{ idcliente: number; idmandante: number; telefono: string }> {
  const telefono = params.telefono.trim();
  if (!normalizarDigitosTelefono(telefono)) {
    throw errorValidacion('Teléfono del deudor inválido');
  }

  const prestamo = await prisma.tbl_prestamo.findUnique({
    where: { idprestamo: params.idprestamo },
    select: {
      idcliente: true,
      idmandante: true,
      deletedAt: true,
      cliente: {
        select: {
          telefono: true,
          celular: true,
          contactos: {
            where: {
              deletedAt: null,
              estado: true,
              autorizado: true,
              noContactar: false,
              tipo: { in: [...TIPOS_TELEFONO] },
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

  const permitidos: string[] = [];
  if (prestamo.cliente.celular) {
    permitidos.push(prestamo.cliente.celular);
  }
  if (prestamo.cliente.telefono) {
    permitidos.push(prestamo.cliente.telefono);
  }
  for (const contacto of prestamo.cliente.contactos) {
    permitidos.push(contacto.valor);
  }

  const autorizado = permitidos.some((p) =>
    telefonosEquivalentes(p, telefono),
  );
  if (!autorizado) {
    throw errorValidacion(
      'El teléfono no corresponde a un contacto autorizado del deudor.',
    );
  }

  return {
    idcliente: prestamo.idcliente,
    idmandante: prestamo.idmandante,
    telefono,
  };
}
