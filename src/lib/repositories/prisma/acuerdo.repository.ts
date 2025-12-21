/**
 * IMPLEMENTACIÓN PRISMA DEL REPOSITORIO DE ACUERDOS
 */

import { Prisma } from "@prisma/client";
import { EstadoAcuerdoEnum } from "@prisma/client";
import type {
  IAcuerdoRepository,
  AcuerdoFindManyArgs,
  AcuerdoFindUniqueArgs,
  AcuerdoCreateArgs,
  AcuerdoUpdateArgs,
} from "../interfaces/acuerdo.repository";

export class AcuerdoRepository implements IAcuerdoRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async findUnique(args: AcuerdoFindUniqueArgs): Promise<any | null> {
    return await this.tx.tbl_acuerdo.findUnique({
      ...args,
      where: {
        ...args.where,
        deletedAt: null,
      } as Prisma.tbl_acuerdoWhereUniqueInput,
    });
  }

  async findFirst(args: AcuerdoFindManyArgs): Promise<any | null> {
    return await this.tx.tbl_acuerdo.findFirst({
      ...args,
      where: {
        ...args.where,
        deletedAt: null,
      },
    });
  }

  async findMany(args: AcuerdoFindManyArgs): Promise<any[]> {
    return await this.tx.tbl_acuerdo.findMany({
      ...args,
      where: {
        ...args.where,
        deletedAt: null,
      },
    });
  }

  async count(args?: { where?: Prisma.tbl_acuerdoWhereInput }): Promise<number> {
    return await this.tx.tbl_acuerdo.count({
      where: {
        ...args?.where,
        deletedAt: null,
      },
    });
  }

  async create(args: AcuerdoCreateArgs): Promise<any> {
    return await this.tx.tbl_acuerdo.create(args);
  }

  async update(args: AcuerdoUpdateArgs): Promise<any> {
    return await this.tx.tbl_acuerdo.update(args);
  }

  async delete(where: Prisma.tbl_acuerdoWhereUniqueInput): Promise<any> {
    return await this.tx.tbl_acuerdo.update({
      where,
      data: { deletedAt: new Date() },
    });
  }

  async findByPrestamo(idprestamo: number, include?: Prisma.tbl_acuerdoInclude): Promise<any[]> {
    return await this.findMany({
      where: { idprestamo },
      include,
      orderBy: { createdAt: "desc" },
    });
  }

  async findActivosByPrestamo(idprestamo: number, include?: Prisma.tbl_acuerdoInclude): Promise<any[]> {
    return await this.findMany({
      where: {
        idprestamo,
        estado: EstadoAcuerdoEnum.ACTIVO,
      },
      include,
      orderBy: { createdAt: "desc" },
    });
  }
}

