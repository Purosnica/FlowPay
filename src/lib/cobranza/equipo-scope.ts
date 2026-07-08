import { prisma } from '@/lib/prisma';
import { ROL } from '@/lib/permissions/role-codes';
import { esAdmin } from './mandante-scope';

export async function esSupervisor(idusuario: number): Promise<boolean> {
  const usuario = await prisma.tbl_usuario.findUnique({
    where: { idusuario },
    include: { rol: true },
  });
  const codigo = usuario?.rol?.codigo;
  return (
    codigo === ROL.SUPERVISOR ||
    codigo === ROL.GERENTE ||
    codigo === ROL.ADMIN
  );
}

export async function esGerente(idusuario: number): Promise<boolean> {
  const usuario = await prisma.tbl_usuario.findUnique({
    where: { idusuario },
    include: { rol: true },
  });
  const codigo = usuario?.rol?.codigo;
  return codigo === ROL.GERENTE || codigo === ROL.ADMIN;
}

export async function obtenerIdsEquipo(idusuario: number): Promise<number[]> {
  if (await esAdmin(idusuario)) {
    const cobradores = await prisma.tbl_usuario.findMany({
      where: {
        activo: true,
        deletedAt: null,
        rol: { codigo: { in: [ROL.COBRADOR, ROL.SUPERVISOR] } },
      },
      select: { idusuario: true },
    });
    return cobradores.map((c) => c.idusuario);
  }

  if (await esGerente(idusuario)) {
    const supervisores = await prisma.tbl_usuario.findMany({
      where: {
        activo: true,
        deletedAt: null,
        idsupervisor: idusuario,
        rol: { codigo: ROL.SUPERVISOR },
      },
      select: { idusuario: true },
    });
    const supervisorIds = supervisores.map((s) => s.idusuario);
    const cobradores = await prisma.tbl_usuario.findMany({
      where: {
        activo: true,
        deletedAt: null,
        idsupervisor: { in: [idusuario, ...supervisorIds] },
        rol: { codigo: ROL.COBRADOR },
      },
      select: { idusuario: true },
    });
    return [
      ...new Set([
        idusuario,
        ...supervisorIds,
        ...cobradores.map((c) => c.idusuario),
      ]),
    ];
  }

  const directos = await prisma.tbl_usuario.findMany({
    where: {
      idsupervisor: idusuario,
      activo: true,
      deletedAt: null,
    },
    select: { idusuario: true },
  });

  if (directos.length > 0) {
    return [idusuario, ...directos.map((d) => d.idusuario)];
  }

  return [idusuario];
}
