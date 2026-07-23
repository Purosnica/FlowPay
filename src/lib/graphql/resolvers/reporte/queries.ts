import { builder ,type  GraphQLContext } from '../../builder';

import { ReporteCobranzaType, ReporteAgingCarteraType } from '../liquidacion/types';
import { InformeGerencialType } from './types-informe';
import { InformeGestionesType } from './types-informe-gestiones';
import {
  ReporteCarteraSinGestionType,
  ReporteComisionesCobradoresType,
  ReporteCumplimientoAcuerdosType,
  ReporteEfectividadType,
  ReporteGananciasType,
} from './types-reportes-control';
import {
  ReporteClienteObligacionesType,
  ReporteComisionesVsProyeccionType,
  ReporteConcentracionRiesgoType,
  ReporteCumplimientoMetasType,
  ReporteCuotasVencidasType,
  ReporteIngresoTramoMoraType,
  ReporteMargenMandantesType,
  ReporteMigracionMoraType,
  ReporteProductividadDiariaType,
  ReportePromesasPagoType,
  ReporteReclamosSlaType,
  ReporteRecontactosType,
  ReporteSupervisorEquipoType,
} from './types-reportes-avanzados';
import {
  requerirPermiso,
  requerirReporte,
} from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { REPORTE_KEY } from '@/lib/permissions/reporte-permisos';
import { obtenerReporteCobranza } from '@/lib/cobranza/reporte-cobranza-service';
import { obtenerReporteAgingCartera } from '@/lib/cobranza/aging-cartera-service';
import { obtenerResumenDashboard } from '@/lib/cobranza/dashboard-service';
import { obtenerInformeGerencial } from '@/lib/cobranza/informe-gerencial-service';
import { obtenerInformeGestiones } from '@/lib/cobranza/informe-gestiones-service';
import { obtenerReporteGanancias } from '@/lib/cobranza/reporte-ganancias-service';
import { obtenerReporteComisionesCobradores } from '@/lib/cobranza/reporte-comisiones-cobradores-service';
import { obtenerReporteEfectividad } from '@/lib/cobranza/reporte-efectividad-service';
import { obtenerReporteCumplimientoAcuerdos } from '@/lib/cobranza/reporte-cumplimiento-acuerdos-service';
import { obtenerReporteCarteraSinGestion } from '@/lib/cobranza/reporte-cartera-sin-gestion-service';
import { obtenerReporteMargenMandantes } from '@/lib/cobranza/reporte-margen-mandantes-service';
import { obtenerReporteComisionesVsProyeccion } from '@/lib/cobranza/reporte-comisiones-vs-proyeccion-service';
import { obtenerReporteIngresoTramoMora } from '@/lib/cobranza/reporte-ingreso-tramo-mora-service';
import { obtenerReportePromesasPago } from '@/lib/cobranza/reporte-promesas-pago-service';
import { obtenerReporteProductividadDiaria } from '@/lib/cobranza/reporte-productividad-diaria-service';
import { obtenerReporteRecontactos } from '@/lib/cobranza/reporte-recontactos-service';
import { obtenerReporteReclamosSla } from '@/lib/cobranza/reporte-reclamos-sla-service';
import { obtenerReporteMigracionMora } from '@/lib/cobranza/reporte-migracion-mora-service';
import { obtenerReporteConcentracionRiesgo } from '@/lib/cobranza/reporte-concentracion-riesgo-service';
import { obtenerReporteClienteObligaciones } from '@/lib/cobranza/reporte-cliente-obligaciones-service';
import { obtenerReporteCuotasVencidas } from '@/lib/cobranza/reporte-cuotas-vencidas-service';
import { obtenerReporteCumplimientoMetas } from '@/lib/cobranza/reporte-cumplimiento-metas-service';
import { obtenerReporteSupervisorEquipo } from '@/lib/cobranza/reporte-supervisor-equipo-service';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { mensajeClienteSeguro } from '@/lib/errors/client-safe-message';
import { DashboardResumenType } from '../contrato-mandante/types';

builder.queryField('reporteCobranza', (t) =>
  t.field({
    type: ReporteCobranzaType,
    args: {
      idmandante: t.arg.int({ required: true }),
      periodo: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(ctx.usuario?.idusuario, REPORTE_KEY.cobranza);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      try {
        return await obtenerReporteCobranza(
          args.idmandante,
          idusuario,
          args.periodo,
        );
      } catch (err) {
        const msg = mensajeClienteSeguro(err, 'Error al generar reporte.');
        throw new GraphQLValidationError(msg);
      }
    },
  }),
);

builder.queryField('reporteAgingCartera', (t) =>
  t.field({
    type: ReporteAgingCarteraType,
    args: {
      idmandante: t.arg.int({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(ctx.usuario?.idusuario, REPORTE_KEY.aging);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      try {
        return await obtenerReporteAgingCartera(args.idmandante, idusuario);
      } catch (err) {
        throw new GraphQLValidationError(
          mensajeClienteSeguro(err, 'Error al generar aging.'),
        );
      }
    },
  }),
);

builder.queryField('resumenDashboardCobranza', (t) =>
  t.field({
    type: DashboardResumenType,
    resolve: async (_parent, _args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return obtenerResumenDashboard(idusuario);
    },
  }),
);

builder.queryField('informeGerencial', (t) =>
  t.field({
    type: InformeGerencialType,
    args: {
      idmandante: t.arg.int({ required: true }),
      periodo: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(ctx.usuario?.idusuario, REPORTE_KEY.informeGerencial);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      try {
        return await obtenerInformeGerencial(
          args.idmandante,
          idusuario,
          args.periodo,
        );
      } catch (err) {
        const msg = mensajeClienteSeguro(err, 'Error al generar informe gerencial.');
        throw new GraphQLValidationError(msg);
      }
    },
  }),
);

builder.queryField('informeGestiones', (t) =>
  t.field({
    type: InformeGestionesType,
    args: {
      idmandante: t.arg.int({ required: true }),
      periodo: t.arg.string({ required: true }),
      idgestor: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(ctx.usuario?.idusuario, REPORTE_KEY.informeGestiones);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      try {
        return await obtenerInformeGestiones(
          args.idmandante,
          idusuario,
          args.periodo,
          args.idgestor,
        );
      } catch (err) {
        const msg = mensajeClienteSeguro(err, 'Error al generar informe de gestiones.');
        throw new GraphQLValidationError(msg);
      }
    },
  }),
);

builder.queryField('reporteGanancias', (t) =>
  t.field({
    type: ReporteGananciasType,
    args: {
      idmandante: t.arg.int({ required: true }),
      periodo: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(ctx.usuario?.idusuario, REPORTE_KEY.ganancias);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      try {
        return await obtenerReporteGanancias(
          args.idmandante,
          idusuario,
          args.periodo,
        );
      } catch (err) {
        const msg = mensajeClienteSeguro(err, 'Error al generar reporte de ganancias.');
        throw new GraphQLValidationError(msg);
      }
    },
  }),
);

builder.queryField('reporteComisionesCobradores', (t) =>
  t.field({
    type: ReporteComisionesCobradoresType,
    args: {
      idmandante: t.arg.int({ required: true }),
      periodo: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(ctx.usuario?.idusuario, REPORTE_KEY.comisionesCobradores);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      try {
        return await obtenerReporteComisionesCobradores(
          args.idmandante,
          idusuario,
          args.periodo,
        );
      } catch (err) {
        const msg = mensajeClienteSeguro(err, 'Error al generar reporte de comisiones.');
        throw new GraphQLValidationError(msg);
      }
    },
  }),
);

builder.queryField('reporteEfectividad', (t) =>
  t.field({
    type: ReporteEfectividadType,
    args: {
      idmandante: t.arg.int({ required: true }),
      periodo: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(ctx.usuario?.idusuario, REPORTE_KEY.efectividad);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      try {
        return await obtenerReporteEfectividad(
          args.idmandante,
          idusuario,
          args.periodo,
        );
      } catch (err) {
        const msg = mensajeClienteSeguro(err, 'Error al generar reporte de efectividad.');
        throw new GraphQLValidationError(msg);
      }
    },
  }),
);

builder.queryField('reporteCumplimientoAcuerdos', (t) =>
  t.field({
    type: ReporteCumplimientoAcuerdosType,
    args: {
      idmandante: t.arg.int({ required: true }),
      periodo: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(ctx.usuario?.idusuario, REPORTE_KEY.cumplimientoAcuerdos);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      try {
        return await obtenerReporteCumplimientoAcuerdos(
          args.idmandante,
          idusuario,
          args.periodo,
        );
      } catch (err) {
        const msg = mensajeClienteSeguro(err, 'Error al generar reporte de cumplimiento.');
        throw new GraphQLValidationError(msg);
      }
    },
  }),
);

builder.queryField('reporteCarteraSinGestion', (t) =>
  t.field({
    type: ReporteCarteraSinGestionType,
    args: {
      idmandante: t.arg.int({ required: true }),
      diasSinGestion: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(ctx.usuario?.idusuario, REPORTE_KEY.carteraSinGestion);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      try {
        return await obtenerReporteCarteraSinGestion(
          args.idmandante,
          idusuario,
          args.diasSinGestion ?? 7,
        );
      } catch (err) {
        const msg = mensajeClienteSeguro(err, 'Error al generar reporte de cartera sin gestión.');
        throw new GraphQLValidationError(msg);
      }
    },
  }),
);

function resolverReporte<T>(
  fn: () => Promise<T>,
  errorMsg: string,
): Promise<T> {
  return fn().catch((err: unknown) => {
    if (err instanceof GraphQLValidationError) {
      throw err;
    }
    throw new GraphQLValidationError(mensajeClienteSeguro(err, errorMsg));
  });
}

builder.queryField('reporteMargenMandantes', (t) =>
  t.field({
    type: ReporteMargenMandantesType,
    args: { periodo: t.arg.string({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(ctx.usuario?.idusuario, REPORTE_KEY.margenMandantes);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return resolverReporte(
        () => obtenerReporteMargenMandantes(idusuario, args.periodo),
        'Error al generar reporte de margen.',
      );
    },
  }),
);

builder.queryField('reporteComisionesVsProyeccion', (t) =>
  t.field({
    type: ReporteComisionesVsProyeccionType,
    args: {
      idmandante: t.arg.int({ required: true }),
      periodo: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(ctx.usuario?.idusuario, REPORTE_KEY.comisionesVsProyeccion);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return resolverReporte(
        () =>
          obtenerReporteComisionesVsProyeccion(
            args.idmandante,
            idusuario,
            args.periodo,
          ),
        'Error al generar comisiones vs proyección.',
      );
    },
  }),
);

builder.queryField('reporteIngresoTramoMora', (t) =>
  t.field({
    type: ReporteIngresoTramoMoraType,
    args: {
      idmandante: t.arg.int({ required: true }),
      periodo: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(ctx.usuario?.idusuario, REPORTE_KEY.ingresoTramoMora);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return resolverReporte(
        () =>
          obtenerReporteIngresoTramoMora(
            args.idmandante,
            idusuario,
            args.periodo,
          ),
        'Error al generar ingreso por tramo.',
      );
    },
  }),
);

builder.queryField('reportePromesasPago', (t) =>
  t.field({
    type: ReportePromesasPagoType,
    args: {
      idmandante: t.arg.int({ required: true }),
      periodo: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(ctx.usuario?.idusuario, REPORTE_KEY.promesasPago);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return resolverReporte(
        () =>
          obtenerReportePromesasPago(
            args.idmandante,
            idusuario,
            args.periodo,
          ),
        'Error al generar reporte de promesas.',
      );
    },
  }),
);

builder.queryField('reporteProductividadDiaria', (t) =>
  t.field({
    type: ReporteProductividadDiariaType,
    args: {
      idmandante: t.arg.int({ required: true }),
      periodo: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(ctx.usuario?.idusuario, REPORTE_KEY.productividadDiaria);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return resolverReporte(
        () =>
          obtenerReporteProductividadDiaria(
            args.idmandante,
            idusuario,
            args.periodo,
          ),
        'Error al generar productividad diaria.',
      );
    },
  }),
);

builder.queryField('reporteRecontactos', (t) =>
  t.field({
    type: ReporteRecontactosType,
    args: {
      idmandante: t.arg.int({ required: true }),
      periodo: t.arg.string({ required: true }),
      minGestiones: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(ctx.usuario?.idusuario, REPORTE_KEY.recontactos);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return resolverReporte(
        () =>
          obtenerReporteRecontactos(
            args.idmandante,
            idusuario,
            args.periodo,
            args.minGestiones ?? 3,
          ),
        'Error al generar reporte de recontactos.',
      );
    },
  }),
);

builder.queryField('reporteReclamosSla', (t) =>
  t.field({
    type: ReporteReclamosSlaType,
    args: { idmandante: t.arg.int({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(ctx.usuario?.idusuario, REPORTE_KEY.reclamosSla);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return resolverReporte(
        () => obtenerReporteReclamosSla(args.idmandante, idusuario),
        'Error al generar reporte SLA reclamos.',
      );
    },
  }),
);

builder.queryField('reporteMigracionMora', (t) =>
  t.field({
    type: ReporteMigracionMoraType,
    args: {
      idmandante: t.arg.int({ required: true }),
      periodo: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(ctx.usuario?.idusuario, REPORTE_KEY.migracionMora);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return resolverReporte(
        () =>
          obtenerReporteMigracionMora(
            args.idmandante,
            idusuario,
            args.periodo,
          ),
        'Error al generar migración de mora.',
      );
    },
  }),
);

builder.queryField('reporteConcentracionRiesgo', (t) =>
  t.field({
    type: ReporteConcentracionRiesgoType,
    args: {
      idmandante: t.arg.int({ required: true }),
      topN: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(ctx.usuario?.idusuario, REPORTE_KEY.concentracionRiesgo);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return resolverReporte(
        () =>
          obtenerReporteConcentracionRiesgo(
            args.idmandante,
            idusuario,
            args.topN ?? 10,
          ),
        'Error al generar concentración de riesgo.',
      );
    },
  }),
);

builder.queryField('reporteCuotasVencidas', (t) =>
  t.field({
    type: ReporteCuotasVencidasType,
    args: { idmandante: t.arg.int({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(ctx.usuario?.idusuario, REPORTE_KEY.cuotasVencidas);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return resolverReporte(
        () => obtenerReporteCuotasVencidas(args.idmandante, idusuario),
        'Error al generar cuotas vencidas.',
      );
    },
  }),
);

builder.queryField('reporteCumplimientoMetas', (t) =>
  t.field({
    type: ReporteCumplimientoMetasType,
    args: {
      idmandante: t.arg.int({ required: true }),
      periodo: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(ctx.usuario?.idusuario, REPORTE_KEY.cumplimientoMetas);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return resolverReporte(
        () =>
          obtenerReporteCumplimientoMetas(
            args.idmandante,
            idusuario,
            args.periodo,
          ),
        'Error al generar cumplimiento de metas.',
      );
    },
  }),
);

builder.queryField('reporteSupervisorEquipo', (t) =>
  t.field({
    type: ReporteSupervisorEquipoType,
    args: {
      idmandante: t.arg.int({ required: true }),
      periodo: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(ctx.usuario?.idusuario, REPORTE_KEY.supervisorEquipo);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return resolverReporte(
        () =>
          obtenerReporteSupervisorEquipo(
            args.idmandante,
            idusuario,
            args.periodo,
          ),
        'Error al generar supervisor vs equipo.',
      );
    },
  }),
);

builder.queryField('reporteClienteObligaciones', (t) =>
  t.field({
    type: ReporteClienteObligacionesType,
    args: {
      minMandantes: t.arg.int({ required: false }),
      search: t.arg.string({ required: false }),
      idcliente: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirReporte(
        ctx.usuario?.idusuario,
        REPORTE_KEY.clienteObligaciones,
      );
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return resolverReporte(
        () =>
          obtenerReporteClienteObligaciones(idusuario, {
            minMandantes: args.minMandantes,
            search: args.search,
            idcliente: args.idcliente,
          }),
        'Error al generar reporte de obligaciones de cliente.',
      );
    },
  }),
);
