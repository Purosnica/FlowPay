import { builder ,type  GraphQLContext } from '../../builder';

import { ReporteCobranzaType, ReporteAgingCarteraType } from '../liquidacion/types';
import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { obtenerReporteCobranza } from '@/lib/cobranza/reporte-cobranza-service';
import { obtenerReporteAgingCartera } from '@/lib/cobranza/aging-cartera-service';
import { obtenerResumenDashboard } from '@/lib/cobranza/dashboard-service';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { DashboardResumenType } from '../contrato-mandante/types';

builder.queryField('reporteCobranza', (t) =>
  t.field({
    type: ReporteCobranzaType,
    args: {
      idmandante: t.arg.int({ required: true }),
      periodo: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.REPORTE_READ);
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
        const msg = err instanceof Error ? err.message : 'Error al generar reporte.';
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
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.REPORTE_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      try {
        return await obtenerReporteAgingCartera(args.idmandante, idusuario);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Error al generar aging.';
        throw new GraphQLValidationError(msg);
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
