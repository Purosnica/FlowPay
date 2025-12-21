/**
 * INTERFAZ DEL REPOSITORIO DE CUOTAS
 * 
 * Define los métodos para acceder y manipular cuotas en la base de datos.
 */

import { Prisma } from "@prisma/client";
import { EstadoCuotaEnum } from "@prisma/client";

export interface CuotaFindManyArgs {
  where?: Prisma.tbl_cuotaWhereInput;
  include?: Prisma.tbl_cuotaInclude;
  orderBy?: Prisma.tbl_cuotaOrderByWithRelationInput | Prisma.tbl_cuotaOrderByWithRelationInput[];
  skip?: number;
  take?: number;
}

export interface CuotaFindUniqueArgs {
  where: Prisma.tbl_cuotaWhereUniqueInput;
  include?: Prisma.tbl_cuotaInclude;
}

export interface CuotaCreateArgs {
  data: Prisma.tbl_cuotaCreateInput;
}

export interface CuotaUpdateArgs {
  where: Prisma.tbl_cuotaWhereUniqueInput;
  data: Prisma.tbl_cuotaUpdateInput;
}

export interface CuotaUpdateManyArgs {
  where: Prisma.tbl_cuotaWhereInput;
  data: Prisma.tbl_cuotaUpdateInput;
}

/**
 * Interfaz del repositorio de cuotas
 */
export interface ICuotaRepository {
  /**
   * Busca una cuota por su ID único
   */
  findUnique(args: CuotaFindUniqueArgs): Promise<any | null>;

  /**
   * Busca la primera cuota que coincida con los criterios
   */
  findFirst(args: CuotaFindManyArgs): Promise<any | null>;

  /**
   * Busca múltiples cuotas según los criterios
   */
  findMany(args: CuotaFindManyArgs): Promise<any[]>;

  /**
   * Cuenta cuotas según los criterios
   */
  count(args?: { where?: Prisma.tbl_cuotaWhereInput }): Promise<number>;

  /**
   * Crea una nueva cuota
   */
  create(args: CuotaCreateArgs): Promise<any>;

  /**
   * Crea múltiples cuotas
   */
  createMany(args: { data: Prisma.tbl_cuotaCreateManyInput[] }): Promise<{ count: number }>;

  /**
   * Actualiza una cuota existente
   */
  update(args: CuotaUpdateArgs): Promise<any>;

  /**
   * Actualiza múltiples cuotas
   */
  updateMany(args: CuotaUpdateManyArgs): Promise<{ count: number }>;

  /**
   * Elimina (soft delete) una cuota
   */
  delete(where: Prisma.tbl_cuotaWhereUniqueInput): Promise<any>;

  /**
   * Busca cuotas por préstamo
   */
  findByPrestamo(idprestamo: number, include?: Prisma.tbl_cuotaInclude): Promise<any[]>;

  /**
   * Busca cuotas por estado
   */
  findByEstado(estado: EstadoCuotaEnum, include?: Prisma.tbl_cuotaInclude): Promise<any[]>;
}

