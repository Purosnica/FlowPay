/**
 * IMPLEMENTACIÓN PRISMA DEL REPOSITORIO DE PRÉSTAMOS
 * 
 * Implementa la interfaz IPrestamoRepository usando Prisma.
 * Maneja soft deletes automáticamente.
 */

import { Prisma } from "@prisma/client";
import { EstadoPrestamoEnum } from "@prisma/client";
import type {
  IPrestamoRepository,
  PrestamoFindManyArgs,
  PrestamoFindUniqueArgs,
  PrestamoCreateArgs,
  PrestamoUpdateArgs,
  PrestamoUpdateManyArgs,
} from "../interfaces/prestamo.repository";

export class PrestamoRepository implements IPrestamoRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async findUnique(args: PrestamoFindUniqueArgs): Promise<any | null> {
    return await this.tx.tbl_prestamo.findUnique({
      ...args,
      where: {
        ...args.where,
        deletedAt: null,
      } as Prisma.tbl_prestamoWhereUniqueInput,
    });
  }

  async findFirst(args: PrestamoFindManyArgs): Promise<any | null> {
    return await this.tx.tbl_prestamo.findFirst({
      ...args,
      where: {
        ...args.where,
        deletedAt: null,
      },
    });
  }

  async findMany(args: PrestamoFindManyArgs): Promise<any[]> {
    return await this.tx.tbl_prestamo.findMany({
      ...args,
      where: {
        ...args.where,
        deletedAt: null,
      },
    });
  }

  async count(args?: { where?: Prisma.tbl_prestamoWhereInput }): Promise<number> {
    return await this.tx.tbl_prestamo.count({
      where: {
        ...args?.where,
        deletedAt: null,
      },
    });
  }

  async create(args: PrestamoCreateArgs): Promise<any> {
    return await this.tx.tbl_prestamo.create(args);
  }

  async update(args: PrestamoUpdateArgs): Promise<any> {
    return await this.tx.tbl_prestamo.update(args);
  }

  async updateMany(args: PrestamoUpdateManyArgs): Promise<{ count: number }> {
    return await this.tx.tbl_prestamo.updateMany(args);
  }

  async delete(where: Prisma.tbl_prestamoWhereUniqueInput): Promise<any> {
    return await this.tx.tbl_prestamo.update({
      where,
      data: { deletedAt: new Date() },
    });
  }

  async findByEstado(estado: EstadoPrestamoEnum, include?: Prisma.tbl_prestamoInclude): Promise<any[]> {
    return await this.findMany({
      where: { estado },
      include,
    });
  }

  async findByCliente(idcliente: number, include?: Prisma.tbl_prestamoInclude): Promise<any[]> {
    return await this.findMany({
      where: { idcliente },
      include,
    });
  }

  async findByGestor(idusuarioGestor: number, include?: Prisma.tbl_prestamoInclude): Promise<any[]> {
    return await this.findMany({
      where: { idusuarioGestor },
      include,
    });
  }
}

