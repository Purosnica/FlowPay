import { Prisma, type PrismaClient } from '@prisma/client';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import {
  ESTADOS_PRESTAMO,
  registrarEstadoInicial,
  type EstadoPrestamo,
} from '@/lib/cobranza/estado-prestamo-service';
import type { CreatePrestamoInputData } from '@/lib/graphql/resolvers/prestamo/types';

type DbClient = PrismaClient | Prisma.TransactionClient;

function mensajeUnicidadPrestamo(
  err: Prisma.PrismaClientKnownRequestError,
): string {
  const target = err.meta?.target;
  const campos = Array.isArray(target)
    ? target.map(String)
    : typeof target === 'string'
      ? [target]
      : [];

  if (campos.some((c) => c.includes('noPrestamo'))) {
    return 'Ya existe un préstamo con ese No. préstamo para este mandante.';
  }
  if (campos.some((c) => c.includes('codigoUnico'))) {
    return 'Ya existe un préstamo con ese código único para este mandante.';
  }
  return 'Ya existe un préstamo con esos datos para este mandante.';
}

/**
 * Registra un préstamo (PTMO) de forma manual, acotado a un mandante.
 * Paridad con importación: valida cliente/campaña y deja historial de estado.
 */
export async function registrarPrestamoManual(
  db: DbClient,
  params: {
    input: CreatePrestamoInputData;
    idusuario?: number | null;
  },
): Promise<number> {
  const { input, idusuario } = params;

  if (
    !ESTADOS_PRESTAMO.includes(input.estado as EstadoPrestamo)
  ) {
    throw new GraphQLValidationError(
      `Estado inválido. Valores: ${ESTADOS_PRESTAMO.join(', ')}`,
    );
  }

  const cliente = await db.tbl_cliente.findFirst({
    where: {
      idcliente: input.idcliente,
      deletedAt: null,
      estado: true,
    },
    select: { idcliente: true },
  });
  if (!cliente) {
    throw new GraphQLValidationError(
      'El deudor seleccionado no existe o está inactivo.',
    );
  }

  if (input.idcampana != null) {
    const campana = await db.tbl_campana.findFirst({
      where: {
        idcampana: input.idcampana,
        idmandante: input.idmandante,
        deletedAt: null,
      },
      select: { idcampana: true },
    });
    if (!campana) {
      throw new GraphQLValidationError(
        'La campaña no pertenece al mandante seleccionado.',
      );
    }
  }

  try {
    const prestamo = await db.tbl_prestamo.create({
      data: {
        idmandante: input.idmandante,
        idcampana: input.idcampana,
        idcliente: input.idcliente,
        noPrestamo: input.noPrestamo.trim(),
        codigoUnico: input.codigoUnico.trim(),
        noCuenta: input.noCuenta?.trim() || undefined,
        idtipocredito: input.idtipocredito,
        idmodelopago: input.idmodelopago,
        idruta: input.idruta,
        idagencia: input.idagencia,
        idgestorAsignado: input.idgestorAsignado,
        plazoMeses: input.plazoMeses,
        fechaPrestamo: input.fechaPrestamo,
        fechaVencimiento: input.fechaVencimiento,
        estado: input.estado,
        moneda: input.moneda,
        tipoCambio: input.tipoCambio,
        saldoTotal: input.saldoTotal,
        montoPrestamo: input.montoPrestamo,
        diasMora: input.diasMora,
        interes: input.interes,
        interesMoratorio: input.interesMoratorio,
        comisionCav: input.comisionCav,
        comisionInsitu: input.comisionInsitu,
        mantenimientoValor: input.mantenimientoValor,
        gestionCobranza: input.gestionCobranza,
        seguroSvsd: input.seguroSvsd,
        cargosAdmin: input.cargosAdmin,
      },
      select: { idprestamo: true },
    });

    await registrarEstadoInicial(db, {
      idprestamo: prestamo.idprestamo,
      estado: input.estado,
      idusuario,
      motivo: 'Registro manual de préstamo',
    });

    return prestamo.idprestamo;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      throw new GraphQLValidationError(mensajeUnicidadPrestamo(err));
    }
    throw err;
  }
}
