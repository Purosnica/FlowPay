import { builder } from '../../builder';
import type {
  ReporteCarteraSinGestion,
  ReporteComisionesCobradores,
  ReporteCumplimientoAcuerdos,
  ReporteEfectividad,
  ReporteGanancias,
} from '@/types/cobranza';

const ReporteGananciasGestorItemType = builder
  .objectRef<ReporteGanancias['porGestor'][number]>(
    'ReporteGananciasGestorItem',
  )
  .implement({
    fields: (t) => ({
      idgestor: t.exposeInt('idgestor', { nullable: true }),
      nombre: t.exposeString('nombre'),
      cantidadPagos: t.exposeInt('cantidadPagos'),
      totalRecuperado: t.exposeFloat('totalRecuperado'),
      totalIngresoEmpresa: t.exposeFloat('totalIngresoEmpresa'),
      totalComision: t.exposeFloat('totalComision'),
      gananciaNeta: t.exposeFloat('gananciaNeta'),
      margenPct: t.exposeFloat('margenPct'),
    }),
  });

const ReporteGananciasTramoItemType = builder
  .objectRef<ReporteGanancias['porTramoMora'][number]>(
    'ReporteGananciasTramoItem',
  )
  .implement({
    fields: (t) => ({
      tramo: t.exposeString('tramo'),
      tramoMoraMin: t.exposeInt('tramoMoraMin'),
      tramoMoraMax: t.exposeInt('tramoMoraMax', { nullable: true }),
      cantidadPagos: t.exposeInt('cantidadPagos'),
      totalRecuperado: t.exposeFloat('totalRecuperado'),
      totalIngresoEmpresa: t.exposeFloat('totalIngresoEmpresa'),
      totalComision: t.exposeFloat('totalComision'),
      gananciaNeta: t.exposeFloat('gananciaNeta'),
    }),
  });

const ReporteGananciasGestorTramoItemType = builder
  .objectRef<ReporteGanancias['porGestorTramo'][number]>(
    'ReporteGananciasGestorTramoItem',
  )
  .implement({
    fields: (t) => ({
      idgestor: t.exposeInt('idgestor', { nullable: true }),
      nombre: t.exposeString('nombre'),
      tramo: t.exposeString('tramo'),
      tramoMoraMin: t.exposeInt('tramoMoraMin'),
      tramoMoraMax: t.exposeInt('tramoMoraMax', { nullable: true }),
      cantidadPagos: t.exposeInt('cantidadPagos'),
      totalRecuperado: t.exposeFloat('totalRecuperado'),
      totalIngresoEmpresa: t.exposeFloat('totalIngresoEmpresa'),
      totalComision: t.exposeFloat('totalComision'),
      gananciaNeta: t.exposeFloat('gananciaNeta'),
    }),
  });

export const ReporteGananciasType = builder
  .objectRef<ReporteGanancias>('ReporteGanancias')
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      mandanteCodigo: t.exposeString('mandanteCodigo'),
      mandanteNombre: t.exposeString('mandanteNombre'),
      periodo: t.exposeString('periodo'),
      cantidadPagos: t.exposeInt('cantidadPagos'),
      totalRecuperado: t.exposeFloat('totalRecuperado'),
      totalIngresoEmpresa: t.exposeFloat('totalIngresoEmpresa'),
      totalComision: t.exposeFloat('totalComision'),
      gananciaNeta: t.exposeFloat('gananciaNeta'),
      margenPct: t.exposeFloat('margenPct'),
      porGestor: t.field({
        type: [ReporteGananciasGestorItemType],
        resolve: (p) => p.porGestor,
      }),
      porTramoMora: t.field({
        type: [ReporteGananciasTramoItemType],
        resolve: (p) => p.porTramoMora,
      }),
      porGestorTramo: t.field({
        type: [ReporteGananciasGestorTramoItemType],
        resolve: (p) => p.porGestorTramo,
      }),
    }),
  });

const ReporteComisionCobradorItemType = builder
  .objectRef<ReporteComisionesCobradores['porCobrador'][number]>(
    'ReporteComisionCobradorItem',
  )
  .implement({
    fields: (t) => ({
      idliquidacion: t.exposeInt('idliquidacion'),
      periodo: t.exposeString('periodo'),
      estado: t.exposeString('estado'),
      idgestor: t.exposeInt('idgestor', { nullable: true }),
      nombreGestor: t.exposeString('nombreGestor'),
      cantidadPagos: t.exposeInt('cantidadPagos'),
      totalRecuperado: t.exposeFloat('totalRecuperado'),
      totalIngresoEmpresa: t.exposeFloat('totalIngresoEmpresa'),
      totalComision: t.exposeFloat('totalComision'),
    }),
  });

export const ReporteComisionesCobradoresType = builder
  .objectRef<ReporteComisionesCobradores>('ReporteComisionesCobradores')
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      mandanteCodigo: t.exposeString('mandanteCodigo'),
      mandanteNombre: t.exposeString('mandanteNombre'),
      periodo: t.exposeString('periodo', { nullable: true }),
      totalComision: t.exposeFloat('totalComision'),
      totalComisionBorrador: t.exposeFloat('totalComisionBorrador'),
      totalComisionEmitida: t.exposeFloat('totalComisionEmitida'),
      totalComisionPagada: t.exposeFloat('totalComisionPagada'),
      cantidadLiquidaciones: t.exposeInt('cantidadLiquidaciones'),
      porCobrador: t.field({
        type: [ReporteComisionCobradorItemType],
        resolve: (p) => p.porCobrador,
      }),
    }),
  });

const ReporteEfectividadGestorItemType = builder
  .objectRef<ReporteEfectividad['porGestor'][number]>(
    'ReporteEfectividadGestorItem',
  )
  .implement({
    fields: (t) => ({
      idgestor: t.exposeInt('idgestor'),
      nombre: t.exposeString('nombre'),
      gestiones: t.exposeInt('gestiones'),
      gestionesEfectivas: t.exposeInt('gestionesEfectivas'),
      efectividadPct: t.exposeFloat('efectividadPct'),
      tasaContactoPct: t.exposeFloat('tasaContactoPct'),
      montoRecuperado: t.exposeFloat('montoRecuperado'),
      prestamosAsignados: t.exposeInt('prestamosAsignados'),
      prestamosEnMora: t.exposeInt('prestamosEnMora'),
      saldoAsignado: t.exposeFloat('saldoAsignado'),
      recuperacionPct: t.exposeFloat('recuperacionPct'),
    }),
  });

export const ReporteEfectividadType = builder
  .objectRef<ReporteEfectividad>('ReporteEfectividad')
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      mandanteCodigo: t.exposeString('mandanteCodigo'),
      mandanteNombre: t.exposeString('mandanteNombre'),
      periodo: t.exposeString('periodo'),
      totalGestiones: t.exposeInt('totalGestiones'),
      totalGestionesEfectivas: t.exposeInt('totalGestionesEfectivas'),
      efectividadPct: t.exposeFloat('efectividadPct'),
      tasaContactoPct: t.exposeFloat('tasaContactoPct'),
      totalRecuperado: t.exposeFloat('totalRecuperado'),
      porGestor: t.field({
        type: [ReporteEfectividadGestorItemType],
        resolve: (p) => p.porGestor,
      }),
    }),
  });

const ReporteCumplimientoAcuerdoItemType = builder
  .objectRef<ReporteCumplimientoAcuerdos['acuerdos'][number]>(
    'ReporteCumplimientoAcuerdoItem',
  )
  .implement({
    fields: (t) => ({
      idacuerdo: t.exposeInt('idacuerdo'),
      noPrestamo: t.exposeString('noPrestamo'),
      nombreCliente: t.exposeString('nombreCliente'),
      nombreGestor: t.exposeString('nombreGestor', { nullable: true }),
      estado: t.exposeString('estado'),
      montoAcordado: t.exposeFloat('montoAcordado'),
      numeroCuotas: t.exposeInt('numeroCuotas'),
      cuotasPendientes: t.exposeInt('cuotasPendientes'),
      cuotasPagadas: t.exposeInt('cuotasPagadas'),
      cuotasVencidas: t.exposeInt('cuotasVencidas'),
      fechaInicio: t.exposeString('fechaInicio'),
    }),
  });

export const ReporteCumplimientoAcuerdosType = builder
  .objectRef<ReporteCumplimientoAcuerdos>('ReporteCumplimientoAcuerdos')
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      mandanteCodigo: t.exposeString('mandanteCodigo'),
      mandanteNombre: t.exposeString('mandanteNombre'),
      periodo: t.exposeString('periodo'),
      totalAcuerdos: t.exposeInt('totalAcuerdos'),
      vigentes: t.exposeInt('vigentes'),
      cumplidos: t.exposeInt('cumplidos'),
      rotos: t.exposeInt('rotos'),
      cumplimientoPct: t.exposeFloat('cumplimientoPct'),
      montoAcordadoTotal: t.exposeFloat('montoAcordadoTotal'),
      montoCumplido: t.exposeFloat('montoCumplido'),
      acuerdos: t.field({
        type: [ReporteCumplimientoAcuerdoItemType],
        resolve: (p) => p.acuerdos,
      }),
    }),
  });

const ReporteCarteraSinGestionItemType = builder
  .objectRef<ReporteCarteraSinGestion['prestamos'][number]>(
    'ReporteCarteraSinGestionItem',
  )
  .implement({
    fields: (t) => ({
      idprestamo: t.exposeInt('idprestamo'),
      noPrestamo: t.exposeString('noPrestamo'),
      nombreCliente: t.exposeString('nombreCliente'),
      nombreGestor: t.exposeString('nombreGestor', { nullable: true }),
      diasMora: t.exposeInt('diasMora'),
      saldoTotal: t.exposeFloat('saldoTotal'),
      diasSinGestion: t.exposeInt('diasSinGestion', { nullable: true }),
      ultimaGestion: t.exposeString('ultimaGestion', { nullable: true }),
    }),
  });

const ReporteCarteraSinGestionResumenTramoType = builder
  .objectRef<ReporteCarteraSinGestion['resumenTramos'][number]>(
    'ReporteCarteraSinGestionResumenTramo',
  )
  .implement({
    fields: (t) => ({
      diasUmbral: t.exposeInt('diasUmbral'),
      cantidadPrestamos: t.exposeInt('cantidadPrestamos'),
      saldoTotal: t.exposeFloat('saldoTotal'),
    }),
  });

export const ReporteCarteraSinGestionType = builder
  .objectRef<ReporteCarteraSinGestion>('ReporteCarteraSinGestion')
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      mandanteCodigo: t.exposeString('mandanteCodigo'),
      mandanteNombre: t.exposeString('mandanteNombre'),
      diasSinGestion: t.exposeInt('diasSinGestion'),
      totalPrestamos: t.exposeInt('totalPrestamos'),
      saldoTotal: t.exposeFloat('saldoTotal'),
      resumenTramos: t.field({
        type: [ReporteCarteraSinGestionResumenTramoType],
        resolve: (p) => p.resumenTramos,
      }),
      prestamos: t.field({
        type: [ReporteCarteraSinGestionItemType],
        resolve: (p) => p.prestamos,
      }),
    }),
  });
