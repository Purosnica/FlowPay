import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import {
  PERMISOS_ADMIN,
  PERMISOS_COBRADOR,
  PERMISOS_GERENTE,
  PERMISOS_SUPERVISOR,
} from '../src/lib/permissions/permiso-codes';
import { obtenerMandantesPermitidos } from '../src/lib/cobranza/mandante-scope';

const prisma = new PrismaClient();

async function reportarDrift(
  codigo: string,
  esperados: readonly string[],
): Promise<{ extras: string[]; faltan: string[] }> {
  const rol = await prisma.tbl_rol.findUnique({
    where: { codigo },
    include: { permisos: { include: { permiso: true } } },
  });
  const actuales = rol?.permisos.map((rp) => rp.permiso.codigo) ?? [];
  const extras = actuales.filter((c) => !esperados.includes(c));
  const faltan = esperados.filter((c) => !actuales.includes(c));
  process.stdout.write(`${codigo} extras: ${extras.join(', ') || 'ninguno'}\n`);
  process.stdout.write(`${codigo} faltan: ${faltan.join(', ') || 'ninguno'}\n`);
  return { extras, faltan };
}

async function main(): Promise<void> {
  const roles: Array<[string, readonly string[]]> = [
    ['COBRADOR', PERMISOS_COBRADOR],
    ['SUPERVISOR', PERMISOS_SUPERVISOR],
    ['GERENTE', PERMISOS_GERENTE],
    ['ADMIN', PERMISOS_ADMIN],
  ];

  let conDrift = false;
  for (const [codigo, esperados] of roles) {
    const { extras, faltan } = await reportarDrift(codigo, esperados);
    if (extras.length > 0 || faltan.length > 0) {
      conDrift = true;
    }
  }

  const supervisor = await prisma.tbl_usuario.findFirst({
    where: { email: 'supervisor@flowpay.com' },
  });
  if (supervisor) {
    const mandantes = await obtenerMandantesPermitidos(supervisor.idusuario);
    process.stdout.write(
      `Supervisor mandantes permitidos: ${mandantes.join(', ') || 'ninguno'}\n`,
    );
  }

  if (conDrift) {
    process.exitCode = 1;
  }
}

void main().finally(async () => {
  await prisma.$disconnect();
});
