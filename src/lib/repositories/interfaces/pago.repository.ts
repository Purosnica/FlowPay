/**
 * INTERFAZ DEL REPOSITORIO DE PAGOS
 * 
 * Define los métodos para acceder y manipular pagos en la base de datos.
 */

import { Prisma } from "@prisma/client";
import { MetodoPagoEnum, TipoCobroEnum } from "@prisma/client";

export interface PagoFindManyArgs {
  where?: Prisma.tbl_pagoWhereInput;
  include?: Prisma.tbl_pagoInclude;
  orderBy?: Prisma.tbl_pagoOrderByWithRelationInput | Prisma.tbl_pagoOrderByWithRelationInput[];
  skip?: number;
  take?: number;
}

export interface PagoFindUniqueArgs {
  where: Prisma.tbl_pagoWhereUniqueInput;
  include?: Prisma.tbl_pagoInclude;
}

export interface PagoCreateArgs {
  data: Prisma.tbl_pagoCreateInput;
}

export interface PagoUpdateArgs {
  where: Prisma.tbl_pagoWhereUniqueInput;
  data: Prisma.tbl_pagoUpdateInput;
}

/**
 * Interfaz del repositorio de pagos
 */
export interface IPagoRepository {
  /**
   * Busca un pago por su ID único
   */
  findUnique(args: PagoFindUniqueArgs): Promise<any | null>;

  /**
   * Busca el primer pago que coincida con los criterios
   */
  findFirst(args: PagoFindManyArgs): Promise<any | null>;

  /**
   * Busca múltiples pagos según los criterios
   */
  findMany(args: PagoFindManyArgs): Promise<any[]>;

  /**
   * Cuenta pagos según los criterios
   */
  count(args?: { where?: Prisma.tbl_pagoWhereInput }): Promise<number>;

  /**
   * Crea un nuevo pago
   */
  create(args: PagoCreateArgs): Promise<any>;

  /**
   * Actualiza un pago existente
   */
  update(args: PagoUpdateArgs): Promise<any>;

  /**
   * Elimina (soft delete) un pago
   */
  delete(where: Prisma.tbl_pagoWhereUniqueInput): Promise<any>;

  /**
   * Busca pagos por préstamo
   */
  findByPrestamo(idprestamo: number, include?: Prisma.tbl_pagoInclude): Promise<any[]>;

  /**
   * Busca pagos por cuota
   */
  findByCuota(idcuota: number, include?: Prisma.tbl_pagoInclude): Promise<any[]>;

  /**
   * Busca pagos por método de pago
   */
  findByMetodoPago(metodoPago: MetodoPagoEnum, include?: Prisma.tbl_pagoInclude): Promise<any[]>;
}

