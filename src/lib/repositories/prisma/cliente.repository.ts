/**
 * IMPLEMENTACIÓN PRISMA DEL REPOSITORIO DE CLIENTES
 */

import { Prisma } from "@prisma/client";
import type {
  IClienteRepository,
  ClienteFindManyArgs,
  ClienteFindUniqueArgs,
  ClienteCreateArgs,
  ClienteUpdateArgs,
} from "../interfaces/cliente.repository";

export class ClienteRepository implements IClienteRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async findUnique(args: ClienteFindUniqueArgs): Promise<any | null> {
    return await this.tx.tbl_cliente.findUnique({
      ...args,
      where: {
        ...args.where,
      },
    });
  }

  async findFirst(args: ClienteFindManyArgs): Promise<any | null> {
    return await this.tx.tbl_cliente.findFirst({
      ...args,
      where: {
        ...args.where,
      },
    });
  }

  async findMany(args: ClienteFindManyArgs): Promise<any[]> {
    return await this.tx.tbl_cliente.findMany(args);
  }

  async count(args?: { where?: Prisma.tbl_clienteWhereInput }): Promise<number> {
    return await this.tx.tbl_cliente.count({
      where: args?.where,
    });
  }

  async create(args: ClienteCreateArgs): Promise<any> {
    return await this.tx.tbl_cliente.create(args);
  }

  async update(args: ClienteUpdateArgs): Promise<any> {
    return await this.tx.tbl_cliente.update(args);
  }

  async delete(where: Prisma.tbl_clienteWhereUniqueInput): Promise<any> {
    // Los clientes no tienen soft delete en el schema actual
    // Si se implementa, usar: data: { deletedAt: new Date() }
    throw new Error("Delete de clientes no implementado. Usar soft delete si es necesario.");
  }

  async findByDocumento(numerodocumento: string, include?: Prisma.tbl_clienteInclude): Promise<any | null> {
    return await this.findUnique({
      where: { numerodocumento },
      include,
    });
  }
}

