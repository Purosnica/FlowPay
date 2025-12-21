/**
 * INTERFAZ DEL REPOSITORIO DE CLIENTES
 * 
 * Define los métodos para acceder y manipular clientes en la base de datos.
 */

import { Prisma } from "@prisma/client";

export interface ClienteFindManyArgs {
  where?: Prisma.tbl_clienteWhereInput;
  include?: Prisma.tbl_clienteInclude;
  orderBy?: Prisma.tbl_clienteOrderByWithRelationInput | Prisma.tbl_clienteOrderByWithRelationInput[];
  skip?: number;
  take?: number;
}

export interface ClienteFindUniqueArgs {
  where: Prisma.tbl_clienteWhereUniqueInput;
  include?: Prisma.tbl_clienteInclude;
}

export interface ClienteCreateArgs {
  data: Prisma.tbl_clienteCreateInput;
}

export interface ClienteUpdateArgs {
  where: Prisma.tbl_clienteWhereUniqueInput;
  data: Prisma.tbl_clienteUpdateInput;
}

/**
 * Interfaz del repositorio de clientes
 */
export interface IClienteRepository {
  /**
   * Busca un cliente por su ID único
   */
  findUnique(args: ClienteFindUniqueArgs): Promise<any | null>;

  /**
   * Busca el primer cliente que coincida con los criterios
   */
  findFirst(args: ClienteFindManyArgs): Promise<any | null>;

  /**
   * Busca múltiples clientes según los criterios
   */
  findMany(args: ClienteFindManyArgs): Promise<any[]>;

  /**
   * Cuenta clientes según los criterios
   */
  count(args?: { where?: Prisma.tbl_clienteWhereInput }): Promise<number>;

  /**
   * Crea un nuevo cliente
   */
  create(args: ClienteCreateArgs): Promise<any>;

  /**
   * Actualiza un cliente existente
   */
  update(args: ClienteUpdateArgs): Promise<any>;

  /**
   * Elimina (soft delete) un cliente
   */
  delete(where: Prisma.tbl_clienteWhereUniqueInput): Promise<any>;

  /**
   * Busca cliente por número de documento
   */
  findByDocumento(numerodocumento: string, include?: Prisma.tbl_clienteInclude): Promise<any | null>;
}

