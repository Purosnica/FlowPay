/**
 * Backfill de contacto principal desde el bloque legacy en observaciones.
 * Ejecutar después de la migración SQL:
 *   npx tsx scripts/backfill-cliente-juridica-contacto.ts
 */

import { PrismaClient } from '@prisma/client';
import {
  isPersonaJuridicaDescripcion,
  parseContactoPrincipal,
  stripContactoPrincipalFromObservaciones,
} from '../src/lib/logic/cliente-tipo-persona-logic';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const clientes = await prisma.tbl_cliente.findMany({
    where: {
      deletedAt: null,
      OR: [
        { observaciones: { contains: '---CONTACTO_PRINCIPAL---' } },
        {
          tipopersona: {
            OR: [
              { descripcion: { contains: 'Jur' } },
              { descripcion: { contains: 'jur' } },
            ],
          },
          contacto_nombre: null,
        },
      ],
    },
    include: { tipopersona: true },
  });

  let updated = 0;
  for (const cliente of clientes) {
    if (!isPersonaJuridicaDescripcion(cliente.tipopersona.descripcion)) {
      continue;
    }

    const legacy = parseContactoPrincipal(cliente.observaciones);
    const observacionesLimpias = stripContactoPrincipalFromObservaciones(
      cliente.observaciones,
    );

    const data: {
      contacto_nombre?: string;
      contacto_cargo?: string | null;
      contacto_telefono?: string | null;
      contacto_email?: string | null;
      observaciones?: string | null;
      razon_social?: string;
      nombre_comercial?: string | null;
    } = {};

    if (!cliente.razon_social?.trim() && cliente.primer_nombres.trim()) {
      data.razon_social = cliente.primer_nombres.trim();
    }
    if (
      !cliente.nombre_comercial?.trim() &&
      cliente.segundo_nombres?.trim()
    ) {
      data.nombre_comercial = cliente.segundo_nombres.trim();
    }

    if (legacy?.nombre && !cliente.contacto_nombre?.trim()) {
      data.contacto_nombre = legacy.nombre;
      data.contacto_cargo = legacy.cargo || null;
      data.contacto_telefono = legacy.telefono || null;
      data.contacto_email = legacy.email || null;
    }

    if (
      cliente.observaciones?.includes('---CONTACTO_PRINCIPAL---') &&
      observacionesLimpias !== (cliente.observaciones ?? '').trim()
    ) {
      data.observaciones = observacionesLimpias || null;
    }

    if (Object.keys(data).length === 0) {
      continue;
    }

    await prisma.tbl_cliente.update({
      where: { idcliente: cliente.idcliente },
      data,
    });
    updated += 1;
  }

  console.log(`Backfill contacto jurídica: ${updated} cliente(s) actualizados.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
