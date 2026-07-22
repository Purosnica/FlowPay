import { definePrismaObject } from "../../helpers/prisma-object";
import { builder } from '../../builder';
import { exposeDecimal } from '../../helpers/graphql-helpers';
import type { tbl_liquidacion } from '@prisma/client';
import type {
  DetallePagoLiquidacion,
  SimulacionLiquidacion,
} from '@/lib/cobranza/liquidacion-service';
import type {
  ReporteCobranzaCompleto,
  ReporteGestorItem,
} from '@/lib/cobranza/reporte-cobranza-service';
import type {
  AgingTramo,
  ReporteAgingCartera,
} from '@/lib/cobranza/aging-cartera-service';

export const Liquidacion = definePrismaObject('tbl_liquidacion', {
  fields: (t) => ({
    idliquidacion: t.exposeInt('idliquidacion'),
    idmandante: t.exposeInt('idmandante'),
    periodo: t.exposeString('periodo'),
    moneda: t.exposeString('moneda'),
    totalRecuperado: exposeDecimal(t, 'totalRecuperado'),
    totalComision: exposeDecimal(t, 'totalComision'),
    estado: t.exposeString('estado'),
    idusuarioCreacion: t.exposeInt('idusuarioCreacion', {
      nullable: true,
    }),
    idusuarioEmision: t.exposeInt('idusuarioEmision', {
      nullable: true,
    }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    mandante: t.relation('mandante'),
  }),
});

export const LiquidacionPage = builder
  .objectRef<{
    liquidaciones: tbl_liquidacion[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>('LiquidacionPage')
  .implement({
    fields: (t) => ({
      liquidaciones: t.field({
        type: [Liquidacion],
        resolve: (parent) => parent.liquidaciones,
      }),
      total: t.exposeInt('total'),
      page: t.exposeInt('page'),
      pageSize: t.exposeInt('pageSize'),
      totalPages: t.exposeInt('totalPages'),
    }),
  });

export const DetallePagoLiquidacionType =
  builder.objectRef<DetallePagoLiquidacion>('DetallePagoLiquidacion').implement({
    fields: (t) => ({
      idpago: t.exposeInt('idpago'),
      idprestamo: t.exposeInt('idprestamo'),
      noPrestamo: t.exposeString('noPrestamo'),
      monto: t.exposeFloat('monto'),
      monedaOriginal: t.exposeString('monedaOriginal'),
      montoOriginal: t.exposeFloat('montoOriginal'),
      tipoCambioAplicado: t.exposeFloat('tipoCambioAplicado'),
      diasMora: t.exposeInt('diasMora'),
      idgestor: t.exposeInt('idgestor', { nullable: true }),
      nombreGestor: t.exposeString('nombreGestor', { nullable: true }),
      porcentajeRecuperacion: t.exposeFloat('porcentajeRecuperacion'),
      ingresoEmpresa: t.exposeFloat('ingresoEmpresa'),
      porcentajeComisionCobrador: t.exposeFloat('porcentajeComisionCobrador'),
      montoComision: t.exposeFloat('montoComision'),
    }),
  });

export const SimulacionLiquidacionType =
  builder.objectRef<SimulacionLiquidacion>('SimulacionLiquidacion').implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      periodo: t.exposeString('periodo'),
      moneda: t.exposeString('moneda'),
      totalRecuperado: t.exposeFloat('totalRecuperado'),
      totalIngresoEmpresa: t.exposeFloat('totalIngresoEmpresa'),
      totalComision: t.exposeFloat('totalComision'),
      cantidadPagos: t.exposeInt('cantidadPagos'),
      detalle: t.field({
        type: [DetallePagoLiquidacionType],
        resolve: (parent) => parent.detalle,
      }),
    }),
  });

export const ReporteGestorItemType =
  builder.objectRef<ReporteGestorItem>('ReporteGestorItem').implement({
    fields: (t) => ({
      idgestor: t.exposeInt('idgestor'),
      nombre: t.exposeString('nombre'),
      gestiones: t.exposeInt('gestiones'),
      montoRecuperado: t.exposeFloat('montoRecuperado'),
    }),
  });

export const ReporteCobranzaType =
  builder
    .objectRef<ReporteCobranzaCompleto>('ReporteCobranza')
    .implement({
      fields: (t) => ({
        idmandante: t.exposeInt('idmandante'),
        periodo: t.exposeString('periodo', { nullable: true }),
        totalPrestamos: t.exposeInt('totalPrestamos'),
        prestamosEnMora: t.exposeInt('prestamosEnMora'),
        saldoCartera: t.exposeFloat('saldoCartera'),
        totalRecuperado: t.exposeFloat('totalRecuperado'),
        totalGestiones: t.exposeInt('totalGestiones'),
        totalAcuerdosVigentes: t.exposeInt('totalAcuerdosVigentes'),
        tasaRecuperacion: t.exposeFloat('tasaRecuperacion'),
        porGestor: t.field({
          type: [ReporteGestorItemType],
          resolve: (parent) => parent.porGestor,
        }),
      }),
    });

export const AgingTramoType = builder
  .objectRef<AgingTramo>('AgingTramo')
  .implement({
    fields: (t) => ({
      tramo: t.exposeString('tramo'),
      tramoMoraMin: t.exposeInt('tramoMoraMin'),
      tramoMoraMax: t.exposeInt('tramoMoraMax', { nullable: true }),
      cantidadPrestamos: t.exposeInt('cantidadPrestamos'),
      saldoTotal: t.exposeFloat('saldoTotal'),
      porcentajeSaldo: t.exposeFloat('porcentajeSaldo'),
    }),
  });

export const ReporteAgingCarteraType = builder
  .objectRef<ReporteAgingCartera>('ReporteAgingCartera')
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      saldoCarteraTotal: t.exposeFloat('saldoCarteraTotal'),
      totalPrestamos: t.exposeInt('totalPrestamos'),
      tramos: t.field({
        type: [AgingTramoType],
        resolve: (parent) => parent.tramos,
      }),
    }),
  });

export const GenerarLiquidacionResultType = builder
  .objectRef<{ idliquidacion: number; simulacion: SimulacionLiquidacion }>(
    'GenerarLiquidacionResult',
  )
  .implement({
    fields: (t) => ({
      idliquidacion: t.exposeInt('idliquidacion'),
      simulacion: t.field({
        type: SimulacionLiquidacionType,
        resolve: (parent) => parent.simulacion,
      }),
    }),
  });
