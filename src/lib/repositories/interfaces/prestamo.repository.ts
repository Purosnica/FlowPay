/**
 * INTERFAZ DEL REPOSITORIO DE PRÉSTAMOS
 * 
 * Define los métodos para acceder y manipular préstamos en la base de datos.
 * Abstrae la implementación específica de Prisma.
 */

import { Prisma } from "@prisma/client";
import { EstadoPrestamoEnum, TipoPrestamoEnum } from "@prisma/client";

export interface PrestamoFindManyArgs {
  where?: Prisma.tbl_prestamoWhereInput;
  include?: Prisma.tbl_prestamoInclude;
  orderBy?: Prisma.tbl_prestamoOrderByWithRelationInput | Prisma.tbl_prestamoOrderByWithRelationInput[];
  skip?: number;
  take?: number;
}

export interface PrestamoFindUniqueArgs {
  where: Prisma.tbl_prestamoWhereUniqueInput;
  include?: Prisma.tbl_prestamoInclude;
}

export interface PrestamoCreateArgs {
  data: Prisma.tbl_prestamoCreateInput;
}

export interface PrestamoUpdateArgs {
  where: Prisma.tbl_prestamoWhereUniqueInput;
  data: Prisma.tbl_prestamoUpdateInput;
}

export interface PrestamoUpdateManyArgs {
  where: Prisma.tbl_prestamoWhereInput;
  data: Prisma.tbl_prestamoUpdateInput;
}

/**
 * Interfaz del repositorio de préstamos
 */
export interface IPrestamoRepository {
  /**
   * Busca un préstamo por su ID único
   */
  findUnique(args: PrestamoFindUniqueArgs): Promise<any | null>;

  /**
   * Busca el primer préstamo que coincida con los criterios
   */
  findFirst(args: PrestamoFindManyArgs): Promise<any | null>;

  /**
   * Busca múltiples préstamos según los criterios
   */
  findMany(args: PrestamoFindManyArgs): Promise<any[]>;

  /**
   * Cuenta préstamos según los criterios
   */
  count(args?: { where?: Prisma.tbl_prestamoWhereInput }): Promise<number>;

  /**
   * Crea un nuevo préstamo
   */
  create(args: PrestamoCreateArgs): Promise<any>;

  /**
   * Actualiza un préstamo existente
   */
  update(args: PrestamoUpdateArgs): Promise<any>;

  /**
   * Actualiza múltiples préstamos
   */
  updateMany(args: PrestamoUpdateManyArgs): Promise<{ count: number }>;

  /**
   * Elimina (soft delete) un préstamo
   */
  delete(where: Prisma.tbl_prestamoWhereUniqueInput): Promise<any>;

  /**
   * Busca préstamos por estado
   */
  findByEstado(estado: EstadoPrestamoEnum, include?: Prisma.tbl_prestamoInclude): Promise<any[]>;

  /**
   * Busca préstamos por cliente
   */
  findByCliente(idcliente: number, include?: Prisma.tbl_prestamoInclude): Promise<any[]>;

  /**
   * Busca préstamos por gestor
   */
  findByGestor(idusuarioGestor: number, include?: Prisma.tbl_prestamoInclude): Promise<any[]>;
}

