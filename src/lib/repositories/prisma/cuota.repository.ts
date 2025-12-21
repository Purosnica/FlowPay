/**
 * IMPLEMENTACIÓN PRISMA DEL REPOSITORIO DE CUOTAS
 */

import { Prisma } from "@prisma/client";
import { EstadoCuotaEnum } from "@prisma/client";
import type {
  ICuotaRepository,
  CuotaFindManyArgs,
  CuotaFindUniqueArgs,
  CuotaCreateArgs,
  CuotaUpdateArgs,
  CuotaUpdateManyArgs,
} from "../interfaces/cuota.repository";

export class CuotaRepository implements ICuotaRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async findUnique(args: CuotaFindUniqueArgs): Promise<any | null> {
    return await this.tx.tbl_cuota.findUnique({
      ...args,
      where: {
        ...args.where,
        deletedAt: null,
      } as Prisma.tbl_cuotaWhereUniqueInput,
    });
  }

  async findFirst(args: CuotaFindManyArgs): Promise<any | null> {
    return await this.tx.tbl_cuota.findFirst({
      ...args,
      where: {
        ...args.where,
        deletedAt: null,
      },
    });
  }

  async findMany(args: CuotaFindManyArgs): Promise<any[]> {
    return await this.tx.tbl_cuota.findMany({
      ...args,
      where: {
        ...args.where,
        deletedAt: null,
      },
    });
  }

  async count(args?: { where?: Prisma.tbl_cuotaWhereInput }): Promise<number> {
    return await this.tx.tbl_cuota.count({
      where: {
        ...args?.where,
        deletedAt: null,
      },
    });
  }

  async create(args: CuotaCreateArgs): Promise<any> {
    return await this.tx.tbl_cuota.create(args);
  }

  async createMany(args: { data: Prisma.tbl_cuotaCreateManyInput[] }): Promise<{ count: number }> {
    return await this.tx.tbl_cuota.createMany(args);
  }

  async update(args: CuotaUpdateArgs): Promise<any> {
    return await this.tx.tbl_cuota.update(args);
  }

  async updateMany(args: CuotaUpdateManyArgs): Promise<{ count: number }> {
    return await this.tx.tbl_cuota.updateMany(args);
  }

  async delete(where: Prisma.tbl_cuotaWhereUniqueInput): Promise<any> {
    return await this.tx.tbl_cuota.update({
      where,
      data: { deletedAt: new Date() },
    });
  }

  async findByPrestamo(idprestamo: number, include?: Prisma.tbl_cuotaInclude): Promise<any[]> {
    return await this.findMany({
      where: { idprestamo },
      include,
      orderBy: { numero: "asc" },
    });
  }

  async findByEstado(estado: EstadoCuotaEnum, include?: Prisma.tbl_cuotaInclude): Promise<any[]> {
    return await this.findMany({
      where: { estado },
      include,
    });
  }
}

