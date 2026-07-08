import type { PrismaClient } from '@prisma/client';

export interface CatalogosImportacion {
  idpais: number;
  idtipodocumento: number;
  idtipopersona: number;
}

/**
 * Obtiene catálogos mínimos para crear clientes durante la importación.
 */
export async function obtenerCatalogosImportacion(
  prisma: PrismaClient,
): Promise<CatalogosImportacion> {
  const pais = await prisma.tbl_pais.findFirst({
    where: { codepais: 'NI', estado: true },
  });
  if (!pais) {
    throw new Error(
      'No se encontró Nicaragua (NI) en catálogo de países. Ejecute el seed de países.',
    );
  }

  const tipodocumento = await prisma.tbl_tipodocumento.findFirst({
    where: {
      estado: true,
      OR: [
        { descripcion: { contains: 'dula' } },
        { descripcion: { contains: 'CED' } },
        { descripcion: { contains: 'Identidad' } },
      ],
    },
  });

  const tipodocumentoFallback = tipodocumento ??
    (await prisma.tbl_tipodocumento.findFirst({ where: { estado: true } }));

  if (!tipodocumentoFallback) {
    throw new Error(
      'No hay tipos de documento configurados. Cree al menos uno en catálogos.',
    );
  }

  const tipopersona = await prisma.tbl_tipopersona.findFirst({
    where: {
      estado: true,
      OR: [
        { descripcion: { contains: 'Natural' } },
        { descripcion: { contains: 'Física' } },
      ],
    },
  });

  const tipopersonaFallback = tipopersona ??
    (await prisma.tbl_tipopersona.findFirst({ where: { estado: true } }));

  if (!tipopersonaFallback) {
    throw new Error(
      'No hay tipos de persona configurados. Cree al menos uno en catálogos.',
    );
  }

  return {
    idpais: pais.idpais,
    idtipodocumento: tipodocumentoFallback.idtipodocumento,
    idtipopersona: tipopersonaFallback.idtipopersona,
  };
}
