import { prisma } from '@/lib/prisma';
import { LEY_787 } from '@/lib/compliance/ley-787-microcopy';
import {
  CLAVE_MAX_CONTACTOS_DIA,
  obtenerConfigNumerica,
} from './configuracion-cobranza-service';

export interface ValidacionContactoResult {
  permitido: boolean;
  motivo?: string;
}

function normalizarTelefono(valor: string): string {
  return valor.replace(/\D/g, '');
}

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
  const contactos = await prisma.tbl_deudor_contacto.findMany({
    where: {
      idcliente: params.idcliente,
      deletedAt: null,
      estado: true,
    },
  });

  const contactoMatch = contactos.find(
    (c) => normalizarTelefono(c.valor) === telefonoNorm,
  );

  if (contactoMatch?.noContactar) {
    return {
      permitido: false,
      motivo: LEY_787.noContactar,
    };
  }

  if (contactoMatch && !contactoMatch.autorizado && !contactoMatch.esTercero) {
    return {
      permitido: false,
      motivo: LEY_787.noAutorizado,
    };
  }

  const maxContactos = await obtenerConfigNumerica(CLAVE_MAX_CONTACTOS_DIA);
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

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
