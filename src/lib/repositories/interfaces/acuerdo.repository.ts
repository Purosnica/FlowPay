/**
 * INTERFAZ DEL REPOSITORIO DE ACUERDOS
 * 
 * Define los métodos para acceder y manipular acuerdos en la base de datos.
 */

import { Prisma } from "@prisma/client";
import { EstadoAcuerdoEnum, TipoAcuerdoEnum } from "@prisma/client";

export interface AcuerdoFindManyArgs {
  where?: Prisma.tbl_acuerdoWhereInput;
  include?: Prisma.tbl_acuerdoInclude;
  orderBy?: Prisma.tbl_acuerdoOrderByWithRelationInput | Prisma.tbl_acuerdoOrderByWithRelationInput[];
  skip?: number;
  take?: number;
}

export interface AcuerdoFindUniqueArgs {
  where: Prisma.tbl_acuerdoWhereUniqueInput;
  include?: Prisma.tbl_acuerdoInclude;
}

export interface AcuerdoCreateArgs {
  data: Prisma.tbl_acuerdoCreateInput;
}

export interface AcuerdoUpdateArgs {
  where: Prisma.tbl_acuerdoWhereUniqueInput;
  data: Prisma.tbl_acuerdoUpdateInput;
}

/**
 * Interfaz del repositorio de acuerdos
 */
export interface IAcuerdoRepository {
  /**
   * Busca un acuerdo por su ID único
   */
  findUnique(args: AcuerdoFindUniqueArgs): Promise<any | null>;

  /**
   * Busca el primer acuerdo que coincida con los criterios
   */
  findFirst(args: AcuerdoFindManyArgs): Promise<any | null>;

  /**
   * Busca múltiples acuerdos según los criterios
   */
  findMany(args: AcuerdoFindManyArgs): Promise<any[]>;

  /**
   * Cuenta acuerdos según los criterios
   */
  count(args?: { where?: Prisma.tbl_acuerdoWhereInput }): Promise<number>;

  /**
   * Crea un nuevo acuerdo
   */
  create(args: AcuerdoCreateArgs): Promise<any>;

  /**
   * Actualiza un acuerdo existente
   */
  update(args: AcuerdoUpdateArgs): Promise<any>;

  /**
   * Elimina (soft delete) un acuerdo
   */
  delete(where: Prisma.tbl_acuerdoWhereUniqueInput): Promise<any>;

  /**
   * Busca acuerdos por préstamo
   */
  findByPrestamo(idprestamo: number, include?: Prisma.tbl_acuerdoInclude): Promise<any[]>;

  /**
   * Busca acuerdos activos por préstamo
   */
  findActivosByPrestamo(idprestamo: number, include?: Prisma.tbl_acuerdoInclude): Promise<any[]>;
}

