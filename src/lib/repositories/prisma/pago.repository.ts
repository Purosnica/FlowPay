/**
 * IMPLEMENTACIÓN PRISMA DEL REPOSITORIO DE PAGOS
 */

import { Prisma } from "@prisma/client";
import { MetodoPagoEnum } from "@prisma/client";
import type {
  IPagoRepository,
  PagoFindManyArgs,
  PagoFindUniqueArgs,
  PagoCreateArgs,
  PagoUpdateArgs,
} from "../interfaces/pago.repository";

export class PagoRepository implements IPagoRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async findUnique(args: PagoFindUniqueArgs): Promise<any | null> {
    return await this.tx.tbl_pago.findUnique({
      ...args,
      where: {
        ...args.where,
        deletedAt: null,
      } as Prisma.tbl_pagoWhereUniqueInput,
    });
  }

  async findFirst(args: PagoFindManyArgs): Promise<any | null> {
    return await this.tx.tbl_pago.findFirst({
      ...args,
      where: {
        ...args.where,
        deletedAt: null,
      },
    });
  }

  async findMany(args: PagoFindManyArgs): Promise<any[]> {
    return await this.tx.tbl_pago.findMany({
      ...args,
      where: {
        ...args.where,
        deletedAt: null,
      },
    });
  }

  async count(args?: { where?: Prisma.tbl_pagoWhereInput }): Promise<number> {
    return await this.tx.tbl_pago.count({
      where: {
        ...args?.where,
        deletedAt: null,
      },
    });
  }

  async create(args: PagoCreateArgs): Promise<any> {
    return await this.tx.tbl_pago.create(args);
  }

  async update(args: PagoUpdateArgs): Promise<any> {
    return await this.tx.tbl_pago.update(args);
  }

  async delete(where: Prisma.tbl_pagoWhereUniqueInput): Promise<any> {
    return await this.tx.tbl_pago.update({
      where,
      data: { deletedAt: new Date() },
    });
  }

  async findByPrestamo(idprestamo: number, include?: Prisma.tbl_pagoInclude): Promise<any[]> {
    return await this.findMany({
      where: { idprestamo },
      include,
      orderBy: { fechaPago: "desc" },
    });
  }

  async findByCuota(idcuota: number, include?: Prisma.tbl_pagoInclude): Promise<any[]> {
    return await this.findMany({
      where: { idcuota },
      include,
      orderBy: { fechaPago: "desc" },
    });
  }

  async findByMetodoPago(metodoPago: MetodoPagoEnum, include?: Prisma.tbl_pagoInclude): Promise<any[]> {
    return await this.findMany({
      where: { metodoPago },
      include,
    });
  }
}

