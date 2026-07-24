import { prisma } from '@/lib/prisma';
import { LEY_787 } from '@/lib/compliance/ley-787-microcopy';
import {
  CLAVE_MAX_CONTACTOS_DIA,
  obtenerConfigNumerica,
} from './configuracion-cobranza-service';
import { inicioDiaEnZona } from '@/lib/utils/timezone';

export interface ValidacionContactoResult {
  permitido: boolean;
  motivo?: string;
}

export function normalizarTelefono(valor: string): string {
  return valor.replace(/\D/g, '');
}

/** True si el teléfono coincide con celular/teléfono del cliente deudor. */
export function esTelefonoPropioDelCliente(
  telefonoNorm: string,
  cliente: { celular: string | null; telefono: string | null },
): boolean {
  const propios = [cliente.celular, cliente.telefono]
    .filter((v): v is string => Boolean(v?.trim()))
    .map(normalizarTelefono)
    .filter((v) => v.length > 0);
  return propios.includes(telefonoNorm);
}

/**
 * Valida medio de contacto para una gestión (Ley 787).
 * - `noContactar` siempre bloquea.
 * - Teléfono propio del deudor (tbl_cliente) se permite aunque el
 *   registro en deudor_contacto aún no esté marcado autorizado
 *   (importaciones lo crean en false por defecto).
 * - Números adicionales / terceros requieren autorizado.
 */
export async function validarContactoParaGestion(params: {
  idcliente: number;
  telefonoContacto?: string | null;
  contactoTercero: boolean;
}): Promise<ValidacionContactoResult> {
  if (params.contactoTercero) {
    return { permitido: true };
  }

  if (!params.telefonoContacto?.trim()) {
    return { permitido: true };
  }

  const telefonoNorm = normalizarTelefono(params.telefonoContacto);
  if (!telefonoNorm) {
    return { permitido: true };
  }

  const [cliente, contactos] = await Promise.all([
    prisma.tbl_cliente.findUnique({
      where: { idcliente: params.idcliente },
      select: { celular: true, telefono: true },
    }),
    prisma.tbl_deudor_contacto.findMany({
      where: {
        idcliente: params.idcliente,
        deletedAt: null,
        estado: true,
      },
    }),
  ]);

  const contactoMatch = contactos.find(
    (c) => normalizarTelefono(c.valor) === telefonoNorm,
  );

  if (contactoMatch?.noContactar) {
    return {
      permitido: false,
      motivo: LEY_787.noContactar,
    };
  }

  const esPropio =
    cliente != null && esTelefonoPropioDelCliente(telefonoNorm, cliente);

  if (
    contactoMatch &&
    !contactoMatch.autorizado &&
    !contactoMatch.esTercero &&
    !esPropio
  ) {
    return {
      permitido: false,
      motivo: LEY_787.noAutorizado,
    };
  }

  const maxContactos = await obtenerConfigNumerica(CLAVE_MAX_CONTACTOS_DIA);
  const inicioDia = inicioDiaEnZona();

  const gestionesHoy = await prisma.tbl_gestion.count({
    where: {
      deletedAt: null,
      fechaGestion: { gte: inicioDia },
      contactoTercero: false,
      prestamo: { idcliente: params.idcliente },
    },
  });

  if (gestionesHoy >= maxContactos) {
    return {
      permitido: false,
      motivo: `Límite diario de contactos alcanzado (${maxContactos}) para este deudor.`,
    };
  }

  return { permitido: true };
}
