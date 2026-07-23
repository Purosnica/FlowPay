import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const sample = await prisma.tbl_cliente.findFirst({
    select: {
      idcliente: true,
      razon_social: true,
      nombre_comercial: true,
      contacto_nombre: true,
      contacto_cargo: true,
      contacto_telefono: true,
      contacto_email: true,
      primer_apellido: true,
    },
  });

  const total = await prisma.tbl_cliente.count();
  const conRazon = await prisma.tbl_cliente.count({
    where: { razon_social: { not: null } },
  });
  const apellidoNull = await prisma.tbl_cliente.count({
    where: { primer_apellido: null },
  });

  console.log(
    JSON.stringify(
      {
        columnsOk: sample !== null || total === 0,
        sample,
        total,
        conRazon,
        apellidoNull,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
