import { builder ,type  GraphQLContext } from '../../builder';

import { requerirAlgunPermiso, requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { authNotificacionesOperativas } from '@/lib/graphql/auth-helpers';
import {
  obtenerCentroInteligencia,
  obtenerTendenciaRecuperacion,
} from '@/lib/cobranza/centro-inteligencia-service';
import { obtenerDashboardSupervisor } from '@/lib/cobranza/dashboard-supervisor-service';
import { obtenerResumenMiDia, obtenerCasosPrioritariosMiDia } from '@/lib/contexts/gestion';
import { procesarPromesasVencidas } from '@/lib/cobranza/promesa-evaluacion-service';
import {
  obtenerGamificacionUsuario,
  obtenerRankingCobradores,
  obtenerMetasGamificacion,
} from '@/lib/cobranza/gamificacion-service';
import { procesarAcuerdosVencidos } from '@/lib/cobranza/acuerdo-cuota-service';
import {
  asegurarConfigsCobranzaDefault,
  CLAVE_PAGO_AUTO_APLICAR,
  CLAVE_MAX_CONTACTOS_DIA,
  CLAVE_ACUERDO_DIAS_GRACIA,
  CLAVE_DIAS_SIN_GESTION_ALERTA,
  CLAVE_DIAS_MORA_CASTIGO,
  CLAVE_ACUERDO_DESCUENTO_MAX_SIN_APROBACION,
  CLAVE_META_GESTIONES_SEMANA,
  CLAVE_META_RECUPERACION_SEMANA,
  CLAVE_META_RECUPERACION_MES,
  CLAVE_BANDEJA_CANDIDATE_LIMIT,
  CLAVE_MI_DIA_CANDIDATE_LIMIT,
  guardarConfigCobranza,
  obtenerConfigCobranza,
} from '@/lib/cobranza/configuracion-cobranza-service';
import {
  BANDEJA_PRIORIDAD_CANDIDATE_LIMIT,
  MI_DIA_PRIORIDAD_CANDIDATE_LIMIT,
} from '@/lib/cobranza/performance-limits';
import { obtenerDashboardGerente } from '@/lib/cobranza/dashboard-gerente-service';
import { calcularRollRate } from '@/lib/cobranza/roll-rate-service';
import { calcularForecastRecuperacion } from '@/lib/cobranza/forecast-recuperacion-service';
import { obtenerKpisCobranzaCore } from '@/lib/cobranza/metric-kpi-service';
import { procesarRecalculoMoraCartera } from '@/lib/contexts/cartera';
import { obtenerNotificacionesOperativas } from '@/lib/cobranza/notificacion-operativa-service';
import { marcarNotificacionesLeidas } from '@/lib/cobranza/notificacion-lectura-service';
import { procesarCastigoCartera } from '@/lib/cobranza/castigo-cartera-service';
import { escalarReclamosFueraSla } from '@/lib/cobranza/reclamo-sla-service';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import { requerirScopeOperacionCartera } from '@/lib/cobranza/mandante-scope';
import {
  ActualizarConfigCobranzaSchema,
  IdMandanteArgsSchema,
  MarcarNotificacionesLeidasSchema,
} from '@/lib/validators/graphql-args';

const InsightType = builder.objectRef<{
  id: string;
  severidad: string;
  titulo: string;
  descripcion: string;
  metrica?: string | null;
  accionSugerida?: string | null;
}>('InsightAutomatico').implement({
  fields: (t) => ({
    id: t.exposeString('id'),
    severidad: t.exposeString('severidad'),
    titulo: t.exposeString('titulo'),
    descripcion: t.exposeString('descripcion'),
    metrica: t.exposeString('metrica', { nullable: true }),
    accionSugerida: t.exposeString('accionSugerida', { nullable: true }),
  }),
});

const CentroInteligenciaType = builder.objectRef<{
  saludCartera: number;
  recuperacionMes: number;
  variacionRecuperacionPct: number;
  prestamosEnMoraPct: number;
  promesasVencidas: number;
  acuerdosEnRiesgo: number;
  reclamosFueraSla: number;
  insights: Array<{
    id: string;
    severidad: string;
    titulo: string;
    descripcion: string;
    metrica?: string | null;
    accionSugerida?: string | null;
  }>;
}>('CentroInteligenciaResumen').implement({
  fields: (t) => ({
    saludCartera: t.exposeFloat('saludCartera'),
    recuperacionMes: t.exposeFloat('recuperacionMes'),
    variacionRecuperacionPct: t.exposeFloat('variacionRecuperacionPct'),
    prestamosEnMoraPct: t.exposeFloat('prestamosEnMoraPct'),
    promesasVencidas: t.exposeInt('promesasVencidas'),
    acuerdosEnRiesgo: t.exposeInt('acuerdosEnRiesgo'),
    reclamosFueraSla: t.exposeInt('reclamosFueraSla'),
    insights: t.field({ type: [InsightType], resolve: (p) => p.insights }),
  }),
});

const TendenciaRecuperacionType = builder.objectRef<{
  periodo: string;
  monto: number;
}>('TendenciaRecuperacion').implement({
  fields: (t) => ({
    periodo: t.exposeString('periodo'),
    monto: t.exposeFloat('monto'),
  }),
});

const RankingCobradorType = builder.objectRef<{
  idgestor: number;
  nombre: string;
  gestiones: number;
  montoRecuperado: number;
  promesasCumplidas: number;
  posicion: number;
  nivel: string;
  xp: number;
  insignias: string[];
}>('RankingCobrador').implement({
  fields: (t) => ({
    idgestor: t.exposeInt('idgestor'),
    nombre: t.exposeString('nombre'),
    gestiones: t.exposeInt('gestiones'),
    montoRecuperado: t.exposeFloat('montoRecuperado'),
    promesasCumplidas: t.exposeInt('promesasCumplidas'),
    posicion: t.exposeInt('posicion'),
    nivel: t.exposeString('nivel'),
    xp: t.exposeInt('xp'),
    insignias: t.exposeStringList('insignias'),
  }),
});

const DashboardSupervisorType = builder.objectRef<{
  totalCobradores: number;
  gestionesHoy: number;
  gestionesAyer: number;
  montoRecuperadoMes: number;
  promesasVencidasEquipo: number;
  casosSinGestion7d: number;
  tasaContactoEquipoPct: number;
  ranking: Array<{
    idgestor: number;
    nombre: string;
    gestiones: number;
    montoRecuperado: number;
    efectividadPct: number;
  }>;
}>('DashboardSupervisorResumen').implement({
  fields: (t) => ({
    totalCobradores: t.exposeInt('totalCobradores'),
    gestionesHoy: t.exposeInt('gestionesHoy'),
    gestionesAyer: t.exposeInt('gestionesAyer'),
    montoRecuperadoMes: t.exposeFloat('montoRecuperadoMes'),
    promesasVencidasEquipo: t.exposeInt('promesasVencidasEquipo'),
    casosSinGestion7d: t.exposeInt('casosSinGestion7d'),
    tasaContactoEquipoPct: t.exposeFloat('tasaContactoEquipoPct'),
    ranking: t.field({
      type: [
        builder.objectRef<{
          idgestor: number;
          nombre: string;
          gestiones: number;
          montoRecuperado: number;
          efectividadPct: number;
        }>('RankingSupervisorItem').implement({
          fields: (t2) => ({
            idgestor: t2.exposeInt('idgestor'),
            nombre: t2.exposeString('nombre'),
            gestiones: t2.exposeInt('gestiones'),
            montoRecuperado: t2.exposeFloat('montoRecuperado'),
            efectividadPct: t2.exposeFloat('efectividadPct'),
          }),
        }),
      ],
      resolve: (p) => p.ranking,
    }),
  }),
});

const MiDiaResumenType = builder.objectRef<{
  casosPrioritarios: number;
  promesasHoy: number;
  promesasVencidas: number;
  gestionesHoy: number;
  pagosHoy: number;
  montoRecuperadoHoy: number;
  agendaHoy: number;
}>('MiDiaResumen').implement({
  fields: (t) => ({
    casosPrioritarios: t.exposeInt('casosPrioritarios'),
    promesasHoy: t.exposeInt('promesasHoy'),
    promesasVencidas: t.exposeInt('promesasVencidas'),
    gestionesHoy: t.exposeInt('gestionesHoy'),
    pagosHoy: t.exposeInt('pagosHoy'),
    montoRecuperadoHoy: t.exposeFloat('montoRecuperadoHoy'),
    agendaHoy: t.exposeInt('agendaHoy'),
  }),
});

const MiDiaCasoType = builder.objectRef<{
  idprestamo: number;
  noPrestamo: string;
  nombreCliente: string;
  saldoTotal: number;
  diasMora: number;
  scorePrioridad: number;
  motivoPrioridad: string;
}>('MiDiaCaso').implement({
  fields: (t) => ({
    idprestamo: t.exposeInt('idprestamo'),
    noPrestamo: t.exposeString('noPrestamo'),
    nombreCliente: t.exposeString('nombreCliente'),
    saldoTotal: t.exposeFloat('saldoTotal'),
    diasMora: t.exposeInt('diasMora'),
    scorePrioridad: t.exposeFloat('scorePrioridad'),
    motivoPrioridad: t.exposeString('motivoPrioridad'),
  }),
});

const ProcesoOperativoResultType = builder.objectRef<{
  evaluados: number;
  rotos?: number;
  vencidas?: number;
  cumplidas?: number;
  castigados?: number;
  escalados?: number;
  actualizados?: number;
}>('ProcesoOperativoResult').implement({
  fields: (t) => ({
    evaluados: t.exposeInt('evaluados'),
    rotos: t.exposeInt('rotos', { nullable: true }),
    vencidas: t.exposeInt('vencidas', { nullable: true }),
    cumplidas: t.exposeInt('cumplidas', { nullable: true }),
    castigados: t.exposeInt('castigados', { nullable: true }),
    escalados: t.exposeInt('escalados', { nullable: true }),
    actualizados: t.exposeInt('actualizados', { nullable: true }),
  }),
});

const ConfigCobranzaType = builder.objectRef<{
  pagoAutoAplicar: boolean;
  maxContactosDia: number;
  acuerdoDiasGracia: number;
  diasSinGestionAlerta: number;
  diasMoraCastigo: number;
  acuerdoDescuentoMaxSinAprobacion: number;
  metaGestionesSemana: number;
  metaRecuperacionSemana: number;
  metaRecuperacionMes: number;
  bandejaCandidateLimit: number;
  miDiaCandidateLimit: number;
}>('ConfigCobranzaOperativa').implement({
  fields: (t) => ({
    pagoAutoAplicar: t.exposeBoolean('pagoAutoAplicar'),
    maxContactosDia: t.exposeInt('maxContactosDia'),
    acuerdoDiasGracia: t.exposeInt('acuerdoDiasGracia'),
    diasSinGestionAlerta: t.exposeInt('diasSinGestionAlerta'),
    diasMoraCastigo: t.exposeInt('diasMoraCastigo'),
    acuerdoDescuentoMaxSinAprobacion: t.exposeInt(
      'acuerdoDescuentoMaxSinAprobacion',
    ),
    metaGestionesSemana: t.exposeInt('metaGestionesSemana'),
    metaRecuperacionSemana: t.exposeInt('metaRecuperacionSemana'),
    metaRecuperacionMes: t.exposeInt('metaRecuperacionMes'),
    bandejaCandidateLimit: t.exposeInt('bandejaCandidateLimit'),
    miDiaCandidateLimit: t.exposeInt('miDiaCandidateLimit'),
  }),
});

async function leerConfigCobranzaOperativa(): Promise<{
  pagoAutoAplicar: boolean;
  maxContactosDia: number;
  acuerdoDiasGracia: number;
  diasSinGestionAlerta: number;
  diasMoraCastigo: number;
  acuerdoDescuentoMaxSinAprobacion: number;
  metaGestionesSemana: number;
  metaRecuperacionSemana: number;
  metaRecuperacionMes: number;
  bandejaCandidateLimit: number;
  miDiaCandidateLimit: number;
}> {
  const [
    pagoAutoAplicar,
    maxContactosDia,
    acuerdoDiasGracia,
    diasSinGestionAlerta,
    diasMoraCastigo,
    acuerdoDescuentoMaxSinAprobacion,
    metaGestionesSemana,
    metaRecuperacionSemana,
    metaRecuperacionMes,
    bandejaCandidateLimit,
    miDiaCandidateLimit,
  ] = await Promise.all([
    obtenerConfigCobranza(CLAVE_PAGO_AUTO_APLICAR),
    obtenerConfigCobranza(CLAVE_MAX_CONTACTOS_DIA),
    obtenerConfigCobranza(CLAVE_ACUERDO_DIAS_GRACIA),
    obtenerConfigCobranza(CLAVE_DIAS_SIN_GESTION_ALERTA),
    obtenerConfigCobranza(CLAVE_DIAS_MORA_CASTIGO),
    obtenerConfigCobranza(CLAVE_ACUERDO_DESCUENTO_MAX_SIN_APROBACION),
    obtenerConfigCobranza(CLAVE_META_GESTIONES_SEMANA),
    obtenerConfigCobranza(CLAVE_META_RECUPERACION_SEMANA),
    obtenerConfigCobranza(CLAVE_META_RECUPERACION_MES),
    obtenerConfigCobranza(CLAVE_BANDEJA_CANDIDATE_LIMIT),
    obtenerConfigCobranza(CLAVE_MI_DIA_CANDIDATE_LIMIT),
  ]);
  return {
    pagoAutoAplicar: pagoAutoAplicar === 'true',
    maxContactosDia: Number(maxContactosDia),
    acuerdoDiasGracia: Number(acuerdoDiasGracia),
    diasSinGestionAlerta: Number(diasSinGestionAlerta),
    diasMoraCastigo: Number(diasMoraCastigo),
    acuerdoDescuentoMaxSinAprobacion: Number(acuerdoDescuentoMaxSinAprobacion),
    metaGestionesSemana: Number(metaGestionesSemana),
    metaRecuperacionSemana: Number(metaRecuperacionSemana),
    metaRecuperacionMes: Number(metaRecuperacionMes),
    bandejaCandidateLimit: Number.isFinite(Number(bandejaCandidateLimit))
      ? Number(bandejaCandidateLimit)
      : BANDEJA_PRIORIDAD_CANDIDATE_LIMIT,
    miDiaCandidateLimit: Number.isFinite(Number(miDiaCandidateLimit))
      ? Number(miDiaCandidateLimit)
      : MI_DIA_PRIORIDAD_CANDIDATE_LIMIT,
  };
}

builder.queryField('centroInteligencia', (t) =>
  t.field({
    type: CentroInteligenciaType,
    args: { idmandante: t.arg.int({ required: false }) },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.INTELIGENCIA_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return obtenerCentroInteligencia(idusuario, args.idmandante ?? undefined);
    },
  }),
);

builder.queryField('tendenciaRecuperacion', (t) =>
  t.field({
    type: [TendenciaRecuperacionType],
    args: {
      idmandante: t.arg.int({ required: false }),
      meses: t.arg.int({ required: false, defaultValue: 6 }),
    },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirAlgunPermiso(ctx.usuario?.idusuario, [
        PERMISO.REPORTE_COBRANZA_READ,
        PERMISO.REPORTE_READ,
      ]);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return obtenerTendenciaRecuperacion(
        idusuario,
        args.idmandante ?? undefined,
        args.meses ?? 6,
      );
    },
  }),
);

builder.queryField('dashboardSupervisor', (t) =>
  t.field({
    type: DashboardSupervisorType,
    resolve: async (_p, _args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.EQUIPO_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return obtenerDashboardSupervisor(idusuario);
    },
  }),
);

builder.queryField('resumenMiDia', (t) =>
  t.field({
    type: MiDiaResumenType,
    resolve: async (_p, _args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return obtenerResumenMiDia(idusuario);
    },
  }),
);

builder.queryField('casosPrioritariosMiDia', (t) =>
  t.field({
    type: [MiDiaCasoType],
    args: { limite: t.arg.int({ required: false, defaultValue: 10 }) },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        return [];
      }
      return obtenerCasosPrioritariosMiDia(idusuario, args.limite ?? 10);
    },
  }),
);

builder.queryField('rankingCobradores', (t) =>
  t.field({
    type: [RankingCobradorType],
    args: { periodoDias: t.arg.int({ required: false, defaultValue: 30 }) },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.EQUIPO_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return obtenerRankingCobradores(idusuario, args.periodoDias ?? 30);
    },
  }),
);

builder.queryField('miGamificacion', (t) =>
  t.field({
    type: RankingCobradorType,
    nullable: true,
    resolve: async (_p, _args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        return null;
      }
      return obtenerGamificacionUsuario(idusuario);
    },
  }),
);

const MetasGamificacionType = builder.objectRef<
  Awaited<ReturnType<typeof obtenerMetasGamificacion>>
>('MetasGamificacion').implement({
  fields: (t) => ({
    metaGestionesSemana: t.exposeInt('metaGestionesSemana'),
    metaRecuperacionSemana: t.exposeInt('metaRecuperacionSemana'),
    gestionesSemana: t.exposeInt('gestionesSemana'),
    recuperacionSemana: t.exposeFloat('recuperacionSemana'),
    pctGestiones: t.exposeInt('pctGestiones'),
    pctRecuperacion: t.exposeInt('pctRecuperacion'),
    metaGestionesCumplida: t.exposeBoolean('metaGestionesCumplida'),
    metaRecuperacionCumplida: t.exposeBoolean('metaRecuperacionCumplida'),
  }),
});

builder.queryField('metasGamificacion', (t) =>
  t.field({
    type: MetasGamificacionType,
    resolve: async (_p, _args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return obtenerMetasGamificacion(idusuario);
    },
  }),
);

builder.queryField('configCobranzaOperativa', (t) =>
  t.field({
    type: ConfigCobranzaType,
    resolve: async (_p, _args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CONFIG_SYSTEM);
      await asegurarConfigsCobranzaDefault();
      return leerConfigCobranzaOperativa();
    },
  }),
);

builder.mutationField('procesarAcuerdosVencidos', (t) =>
  t.field({
    type: ProcesoOperativoResultType,
    resolve: async (_p, _args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.ACUERDO_WRITE);
      const resultado = await procesarAcuerdosVencidos(ctx.usuario?.idusuario);
      return {
        evaluados: resultado.evaluados,
        rotos: resultado.rotos,
      };
    },
  }),
);

builder.mutationField('recalcularMoraCartera', (t) =>
  t.field({
    type: ProcesoOperativoResultType,
    args: { idmandante: t.arg.int({ required: false }) },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CONFIG_SYSTEM);
      const { idmandante: idmandanteArg } = IdMandanteArgsSchema.parse(args);
      const idmandante = await requerirScopeOperacionCartera(
        ctx.usuario?.idusuario,
        idmandanteArg,
      );
      const resultado = await procesarRecalculoMoraCartera(idmandante);
      return {
        evaluados: resultado.evaluados,
        actualizados: resultado.actualizados,
      };
    },
  }),
);

builder.mutationField('procesarPromesasVencidas', (t) =>
  t.field({
    type: ProcesoOperativoResultType,
    resolve: async (_p, _args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.GESTION_WRITE);
      const resultado = await procesarPromesasVencidas(ctx.usuario?.idusuario);
      return {
        evaluados: resultado.evaluadas,
        vencidas: resultado.vencidas,
        cumplidas: resultado.cumplidas,
      };
    },
  }),
);

builder.mutationField('actualizarConfigCobranzaOperativa', (t) =>
  t.field({
    type: ConfigCobranzaType,
    args: {
      pagoAutoAplicar: t.arg.boolean({ required: false }),
      maxContactosDia: t.arg.int({ required: false }),
      acuerdoDiasGracia: t.arg.int({ required: false }),
      diasSinGestionAlerta: t.arg.int({ required: false }),
      diasMoraCastigo: t.arg.int({ required: false }),
      acuerdoDescuentoMaxSinAprobacion: t.arg.int({ required: false }),
      metaGestionesSemana: t.arg.int({ required: false }),
      metaRecuperacionSemana: t.arg.int({ required: false }),
      metaRecuperacionMes: t.arg.int({ required: false }),
      bandejaCandidateLimit: t.arg.int({ required: false }),
      miDiaCandidateLimit: t.arg.int({ required: false }),
    },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CONFIG_SYSTEM);
      const parsed = ActualizarConfigCobranzaSchema.parse(args);
      const idusuario = ctx.usuario?.idusuario;
      if (
        parsed.pagoAutoAplicar !== undefined &&
        parsed.pagoAutoAplicar !== null
      ) {
        await guardarConfigCobranza(
          CLAVE_PAGO_AUTO_APLICAR,
          parsed.pagoAutoAplicar ? 'true' : 'false',
          idusuario,
        );
      }
      if (parsed.maxContactosDia != null) {
        await guardarConfigCobranza(
          CLAVE_MAX_CONTACTOS_DIA,
          String(parsed.maxContactosDia),
          idusuario,
        );
      }
      if (parsed.acuerdoDiasGracia != null) {
        await guardarConfigCobranza(
          CLAVE_ACUERDO_DIAS_GRACIA,
          String(parsed.acuerdoDiasGracia),
          idusuario,
        );
      }
      if (parsed.diasSinGestionAlerta != null) {
        await guardarConfigCobranza(
          CLAVE_DIAS_SIN_GESTION_ALERTA,
          String(parsed.diasSinGestionAlerta),
          idusuario,
        );
      }
      if (parsed.diasMoraCastigo != null) {
        await guardarConfigCobranza(
          CLAVE_DIAS_MORA_CASTIGO,
          String(parsed.diasMoraCastigo),
          idusuario,
        );
      }
      if (parsed.acuerdoDescuentoMaxSinAprobacion != null) {
        await guardarConfigCobranza(
          CLAVE_ACUERDO_DESCUENTO_MAX_SIN_APROBACION,
          String(parsed.acuerdoDescuentoMaxSinAprobacion),
          idusuario,
        );
      }
      if (parsed.metaGestionesSemana != null) {
        await guardarConfigCobranza(
          CLAVE_META_GESTIONES_SEMANA,
          String(parsed.metaGestionesSemana),
          idusuario,
        );
      }
      if (parsed.metaRecuperacionSemana != null) {
        await guardarConfigCobranza(
          CLAVE_META_RECUPERACION_SEMANA,
          String(parsed.metaRecuperacionSemana),
          idusuario,
        );
      }
      if (parsed.metaRecuperacionMes != null) {
        await guardarConfigCobranza(
          CLAVE_META_RECUPERACION_MES,
          String(parsed.metaRecuperacionMes),
          idusuario,
        );
      }
      if (parsed.bandejaCandidateLimit != null) {
        await guardarConfigCobranza(
          CLAVE_BANDEJA_CANDIDATE_LIMIT,
          String(parsed.bandejaCandidateLimit),
          idusuario,
        );
      }
      if (parsed.miDiaCandidateLimit != null) {
        await guardarConfigCobranza(
          CLAVE_MI_DIA_CANDIDATE_LIMIT,
          String(parsed.miDiaCandidateLimit),
          idusuario,
        );
      }
      return leerConfigCobranzaOperativa();
    },
  }),
);

const NotificacionType = builder.objectRef<{
  id: string;
  tipo: string;
  severidad: string;
  titulo: string;
  mensaje: string;
  url?: string | null;
  createdAt: Date;
  leida: boolean;
}>('NotificacionOperativa').implement({
  fields: (t) => ({
    id: t.exposeString('id'),
    tipo: t.exposeString('tipo'),
    severidad: t.exposeString('severidad'),
    titulo: t.exposeString('titulo'),
    mensaje: t.exposeString('mensaje'),
    url: t.exposeString('url', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    leida: t.exposeBoolean('leida'),
  }),
});

builder.queryField('notificacionesOperativas', (t) =>
  t.field({
    type: [NotificacionType],
    args: {
      limite: t.arg.int({ required: false, defaultValue: 15 }),
    },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      const idusuario = await authNotificacionesOperativas(ctx);
      const limite = Math.min(Math.max(args.limite ?? 15, 1), 30);
      return obtenerNotificacionesOperativas(idusuario, limite);
    },
  }),
);

builder.mutationField('marcarNotificacionesOperativasLeidas', (t) =>
  t.field({
    type: 'Int',
    args: {
      ids: t.arg.stringList({ required: true }),
    },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      const idusuario = await authNotificacionesOperativas(ctx);
      const { ids } = MarcarNotificacionesLeidasSchema.parse(args);
      return marcarNotificacionesLeidas(idusuario, ids);
    },
  }),
);

builder.queryField('dashboardGerente', (t) =>
  t.field({
    type: builder
      .objectRef<Awaited<ReturnType<typeof obtenerDashboardGerente>>>(
        'DashboardGerenteResumen',
      )
      .implement({
        fields: (t2) => ({
          totalSupervisores: t2.exposeInt('totalSupervisores'),
          totalCobradores: t2.exposeInt('totalCobradores'),
          gestionesHoy: t2.exposeInt('gestionesHoy'),
          montoRecuperadoMes: t2.exposeFloat('montoRecuperadoMes'),
          reclamosFueraSla: t2.exposeInt('reclamosFueraSla'),
          carteraTotal: t2.exposeFloat('carteraTotal'),
          carteraEnMoraPct: t2.exposeFloat('carteraEnMoraPct'),
          equipos: t2.field({
            type: [
              builder
                .objectRef<{
                  idsupervisor: number;
                  nombreSupervisor: string;
                  cobradores: number;
                  gestionesHoy: number;
                  montoRecuperadoMes: number;
                }>('EquipoGerenteItem')
                .implement({
                  fields: (t3) => ({
                    idsupervisor: t3.exposeInt('idsupervisor'),
                    nombreSupervisor: t3.exposeString('nombreSupervisor'),
                    cobradores: t3.exposeInt('cobradores'),
                    gestionesHoy: t3.exposeInt('gestionesHoy'),
                    montoRecuperadoMes: t3.exposeFloat('montoRecuperadoMes'),
                  }),
                }),
            ],
            resolve: (p) => p.equipos,
          }),
          resumenSupervisor: t2.field({
            type: DashboardSupervisorType,
            resolve: (p) => p.resumenSupervisor,
          }),
        }),
      }),
    resolve: async (_p, _args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.EQUIPO_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return obtenerDashboardGerente(idusuario);
    },
  }),
);

builder.queryField('rollRateCartera', (t) =>
  t.field({
    type: builder
      .objectRef<Awaited<ReturnType<typeof calcularRollRate>>>('RollRateResumen')
      .implement({
        fields: (t2) => ({
          periodoDesde: t2.exposeString('periodoDesde'),
          periodoHasta: t2.exposeString('periodoHasta'),
          totalTransiciones: t2.exposeInt('totalTransiciones'),
          buckets: t2.field({
            type: [
              builder
                .objectRef<{
                  estadoOrigen: string;
                  estadoDestino: string;
                  cantidad: number;
                  pct: number;
                }>('RollRateBucket')
                .implement({
                  fields: (t3) => ({
                    estadoOrigen: t3.exposeString('estadoOrigen'),
                    estadoDestino: t3.exposeString('estadoDestino'),
                    cantidad: t3.exposeInt('cantidad'),
                    pct: t3.exposeFloat('pct'),
                  }),
                }),
            ],
            resolve: (p) => p.buckets,
          }),
        }),
      }),
    args: { mesesAtras: t.arg.int({ required: false, defaultValue: 3 }), idmandante: t.arg.int({ required: false }) },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.INTELIGENCIA_READ);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return calcularRollRate(
        idusuario,
        args.mesesAtras ?? 3,
        args.idmandante ?? undefined,
      );
    },
  }),
);

builder.queryField('forecastRecuperacion', (t) =>
  t.field({
    type: builder
      .objectRef<Awaited<ReturnType<typeof calcularForecastRecuperacion>>>(
        'ForecastRecuperacion',
      )
      .implement({
        fields: (t2) => ({
          recuperadoMesActual: t2.exposeFloat('recuperadoMesActual'),
          diasTranscurridos: t2.exposeInt('diasTranscurridos'),
          diasRestantesMes: t2.exposeInt('diasRestantesMes'),
          runRateDiario: t2.exposeFloat('runRateDiario'),
          forecastFinMes: t2.exposeFloat('forecastFinMes'),
          metaMes: t2.exposeFloat('metaMes', { nullable: true }),
          pctMeta: t2.exposeFloat('pctMeta', { nullable: true }),
        }),
      }),
    args: { idmandante: t.arg.int({ required: false }) },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirAlgunPermiso(ctx.usuario?.idusuario, [
        PERMISO.REPORTE_COBRANZA_READ,
        PERMISO.REPORTE_READ,
      ]);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return calcularForecastRecuperacion(
        idusuario,
        args.idmandante ?? undefined,
      );
    },
  }),
);

builder.queryField('kpisCobranzaCore', (t) =>
  t.field({
    type: builder
      .objectRef<Awaited<ReturnType<typeof obtenerKpisCobranzaCore>>>(
        'KpisCobranzaCore',
      )
      .implement({
        fields: (t2) => ({
          carteraTotal: t2.exposeFloat('carteraTotal'),
          carteraEnMora: t2.exposeFloat('carteraEnMora'),
          carteraEnMoraPct: t2.exposeFloat('carteraEnMoraPct'),
          recuperacionMes: t2.exposeFloat('recuperacionMes'),
          gestionesMes: t2.exposeInt('gestionesMes'),
          tasaContactoPct: t2.exposeFloat('tasaContactoPct'),
          promesasAbiertas: t2.exposeInt('promesasAbiertas'),
          acuerdosVigentes: t2.exposeInt('acuerdosVigentes'),
        }),
      }),
    args: { idmandante: t.arg.int({ required: false }) },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirAlgunPermiso(ctx.usuario?.idusuario, [
        PERMISO.REPORTE_COBRANZA_READ,
        PERMISO.REPORTE_READ,
        PERMISO.INTELIGENCIA_READ,
      ]);
      const idusuario = ctx.usuario?.idusuario;
      if (!idusuario) {
        throw new GraphQLValidationError('Usuario no autenticado.');
      }
      return obtenerKpisCobranzaCore(
        idusuario,
        args.idmandante ?? undefined,
      );
    },
  }),
);

builder.mutationField('procesarCastigoCartera', (t) =>
  t.field({
    type: ProcesoOperativoResultType,
    args: { idmandante: t.arg.int({ required: false }) },
    resolve: async (_p, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const { idmandante: idmandanteArg } = IdMandanteArgsSchema.parse(args);
      const idmandante = await requerirScopeOperacionCartera(
        ctx.usuario?.idusuario,
        idmandanteArg,
      );
      const resultado = await procesarCastigoCartera(idmandante);
      return {
        evaluados: resultado.evaluados,
        castigados: resultado.castigados,
      };
    },
  }),
);

builder.mutationField('escalarReclamosSla', (t) =>
  t.field({
    type: ProcesoOperativoResultType,
    resolve: async (_p, _args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.GESTION_WRITE);
      const resultado = await escalarReclamosFueraSla();
      return {
        evaluados: resultado.reclamosEscalados,
        escalados: resultado.reclamosEscalados,
      };
    },
  }),
);
