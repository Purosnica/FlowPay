import { builder, type GraphQLContext } from '../../builder';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { requerirPermiso } from '@/lib/permissions/permission-service';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import {
  crearExtractoBancario,
  listarExtractosBancarios,
  obtenerLineasExtracto,
  resumenConciliacion,
  ejecutarMatchingExtracto,
  conciliarLineaManual,
  desconciliarLinea,
  excluirLinea,
} from '@/lib/cobranza/conciliacion-bancaria-service';

function usuarioId(ctx: GraphQLContext): number {
  const id = ctx.usuario?.idusuario;
  if (!id) throw new GraphQLValidationError('Usuario no autenticado.');
  return id;
}

function fecha(value: string, campo: string): Date {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new GraphQLValidationError(`${campo} no contiene una fecha válida.`);
  }
  return d;
}

const LineaExtractoInput = builder.inputType('LineaExtractoBancarioInput', {
  fields: (t) => ({
    fechaOperacion: t.string({ required: true }),
    fechaValor: t.string(),
    referencia: t.string(),
    descripcion: t.string(),
    debito: t.string(),
    credito: t.string(),
    monto: t.string({ required: true }),
    moneda: t.string({ required: true }),
  }),
});

const CrearExtractoInput = builder.inputType('CrearExtractoBancarioInput', {
  fields: (t) => ({
    idmandante: t.int({ required: true }),
    institucionFinanciera: t.string({ required: true }),
    cuenta: t.string({ required: true }),
    moneda: t.string({ required: true }),
    fechaDesde: t.string({ required: true }),
    fechaHasta: t.string({ required: true }),
    archivoNombre: t.string({ required: true }),
    archivoHash: t.string(),
    lineas: t.field({ type: [LineaExtractoInput], required: true }),
  }),
});

type ExtractoView = {
  idextracto: number;
  idmandante: number;
  institucionFinanciera: string;
  cuenta: string;
  moneda: string;
  fechaDesde: Date;
  fechaHasta: Date;
  archivoNombre: string;
  archivoHash: string;
  createdAt: Date;
  totalLineas: number;
  pendientes: number;
  conciliadas: number;
  ambiguas: number;
};

const ExtractoType = builder.objectRef<ExtractoView>('ExtractoBancario').implement({
  fields: (t) => ({
    idextracto: t.exposeInt('idextracto'),
    idmandante: t.exposeInt('idmandante'),
    institucionFinanciera: t.exposeString('institucionFinanciera'),
    cuenta: t.exposeString('cuenta'),
    moneda: t.exposeString('moneda'),
    fechaDesde: t.expose('fechaDesde', { type: 'DateTime' }),
    fechaHasta: t.expose('fechaHasta', { type: 'DateTime' }),
    archivoNombre: t.exposeString('archivoNombre'),
    archivoHash: t.exposeString('archivoHash'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    totalLineas: t.exposeInt('totalLineas'),
    pendientes: t.exposeInt('pendientes'),
    conciliadas: t.exposeInt('conciliadas'),
    ambiguas: t.exposeInt('ambiguas'),
  }),
});

type LineaView = {
  idlinea: number;
  idextracto: number;
  fechaOperacion: Date;
  fechaValor: Date | null;
  referenciaOriginal: string | null;
  referenciaNormalizada: string | null;
  descripcion: string | null;
  monto: string;
  moneda: string;
  estado: string;
  idpago: number | null;
  metodoMatch: string | null;
  confidence: string | null;
};

const LineaType = builder.objectRef<LineaView>('LineaExtractoBancario').implement({
  fields: (t) => ({
    idlinea: t.exposeInt('idlinea'),
    idextracto: t.exposeInt('idextracto'),
    fechaOperacion: t.expose('fechaOperacion', { type: 'DateTime' }),
    fechaValor: t.expose('fechaValor', { type: 'DateTime', nullable: true }),
    referenciaOriginal: t.exposeString('referenciaOriginal', { nullable: true }),
    referenciaNormalizada: t.exposeString('referenciaNormalizada', { nullable: true }),
    descripcion: t.exposeString('descripcion', { nullable: true }),
    monto: t.exposeString('monto'),
    moneda: t.exposeString('moneda'),
    estado: t.exposeString('estado'),
    idpago: t.exposeInt('idpago', { nullable: true }),
    metodoMatch: t.exposeString('metodoMatch', { nullable: true }),
    confidence: t.exposeString('confidence', { nullable: true }),
  }),
});

type ResumenView = {
  total: number;
  pendientes: number;
  conciliadas: number;
  ambiguas: number;
  sinCoincidencia: number;
  duplicadas: number;
  excluidas: number;
};

const ResumenType = builder.objectRef<ResumenView>('ResumenConciliacionBancaria').implement({
  fields: (t) => ({
    total: t.exposeInt('total'),
    pendientes: t.exposeInt('pendientes'),
    conciliadas: t.exposeInt('conciliadas'),
    ambiguas: t.exposeInt('ambiguas'),
    sinCoincidencia: t.exposeInt('sinCoincidencia'),
    duplicadas: t.exposeInt('duplicadas'),
    excluidas: t.exposeInt('excluidas'),
  }),
});

type MatchingView = {
  conciliadas: number;
  ambiguas: number;
  sinCoincidencia: number;
};

const MatchingType = builder.objectRef<MatchingView>('ResultadoMatchingExtracto').implement({
  fields: (t) => ({
    conciliadas: t.exposeInt('conciliadas'),
    ambiguas: t.exposeInt('ambiguas'),
    sinCoincidencia: t.exposeInt('sinCoincidencia'),
  }),
});

builder.queryField('extractosBancarios', (t) =>
  t.field({
    type: [ExtractoType],
    args: { idmandante: t.arg.int({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CONCILIACION_VIEW);
      const rows = await listarExtractosBancarios(usuarioId(ctx), args.idmandante);
      return rows.map((r) => {
        const count = (estado: string) => r.lineas.filter((l) => l.estado === estado).length;
        return {
          idextracto: r.idextracto,
          idmandante: r.idmandante,
          institucionFinanciera: r.institucionFinanciera,
          cuenta: r.cuenta,
          moneda: r.moneda,
          fechaDesde: r.fechaDesde,
          fechaHasta: r.fechaHasta,
          archivoNombre: r.archivoNombre,
          archivoHash: r.archivoHash,
          createdAt: r.createdAt,
          totalLineas: r.lineas.length,
          pendientes: count('PENDIENTE'),
          conciliadas: count('CONCILIADO'),
          ambiguas: count('AMBIGUO'),
        };
      });
    },
  }),
);

builder.queryField('lineasExtractoBancario', (t) =>
  t.field({
    type: [LineaType],
    args: {
      idextracto: t.arg.int({ required: true }),
      estado: t.arg.string(),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CONCILIACION_VIEW);
      const rows = await obtenerLineasExtracto(
        usuarioId(ctx),
        args.idextracto,
        args.estado ?? undefined,
      );
      return rows.map((r) => {
        const activa = r.conciliaciones.find((c) => c.estado === 'CONCILIADO') ?? null;
        return {
          idlinea: r.idlinea,
          idextracto: r.idextracto,
          fechaOperacion: r.fechaOperacion,
          fechaValor: r.fechaValor,
          referenciaOriginal: r.referenciaOriginal,
          referenciaNormalizada: r.referenciaNormalizada,
          descripcion: r.descripcion,
          monto: r.monto.toFixed(2),
          moneda: r.moneda,
          estado: r.estado,
          idpago: activa?.idpago ?? null,
          metodoMatch: activa?.metodoMatch ?? null,
          confidence: activa?.confidence.toFixed(2) ?? null,
        };
      });
    },
  }),
);

builder.queryField('resumenConciliacionBancaria', (t) =>
  t.field({
    type: ResumenType,
    args: { idextracto: t.arg.int({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CONCILIACION_VIEW);
      return resumenConciliacion(usuarioId(ctx), args.idextracto);
    },
  }),
);

builder.mutationField('cargarExtractoBancario', (t) =>
  t.field({
    type: ExtractoType,
    args: { input: t.arg({ type: CrearExtractoInput, required: true }) },
    resolve: async (_parent, { input }, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CONCILIACION_EXECUTE);
      const extracto = await crearExtractoBancario(usuarioId(ctx), {
        idmandante: input.idmandante,
        institucionFinanciera: input.institucionFinanciera,
        cuenta: input.cuenta,
        moneda: input.moneda,
        fechaDesde: fecha(input.fechaDesde, 'fechaDesde'),
        fechaHasta: fecha(input.fechaHasta, 'fechaHasta'),
        archivoNombre: input.archivoNombre,
        archivoHash: input.archivoHash ?? undefined,
        lineas: input.lineas.map((l) => ({
          fechaOperacion: fecha(l.fechaOperacion, 'fechaOperacion'),
          fechaValor: l.fechaValor ? fecha(l.fechaValor, 'fechaValor') : null,
          referencia: l.referencia ?? null,
          descripcion: l.descripcion ?? null,
          debito: l.debito ?? 0,
          credito: l.credito ?? 0,
          monto: l.monto,
          moneda: l.moneda,
        })),
      });
      return {
        idextracto: extracto.idextracto,
        idmandante: extracto.idmandante,
        institucionFinanciera: extracto.institucionFinanciera,
        cuenta: extracto.cuenta,
        moneda: extracto.moneda,
        fechaDesde: extracto.fechaDesde,
        fechaHasta: extracto.fechaHasta,
        archivoNombre: extracto.archivoNombre,
        archivoHash: extracto.archivoHash,
        createdAt: extracto.createdAt,
        totalLineas: extracto.lineas.length,
        pendientes: extracto.lineas.filter((l) => l.estado === 'PENDIENTE').length,
        conciliadas: 0,
        ambiguas: 0,
      };
    },
  }),
);

builder.mutationField('ejecutarMatchingExtracto', (t) =>
  t.field({
    type: MatchingType,
    args: { idextracto: t.arg.int({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CONCILIACION_EXECUTE);
      return ejecutarMatchingExtracto(usuarioId(ctx), args.idextracto);
    },
  }),
);

builder.mutationField('conciliarLineaManual', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      idlinea: t.arg.int({ required: true }),
      idpago: t.arg.int({ required: true }),
      motivo: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CONCILIACION_OVERRIDE);
      await conciliarLineaManual(usuarioId(ctx), args.idlinea, args.idpago, args.motivo);
      return true;
    },
  }),
);

builder.mutationField('desconciliarLineaBancaria', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      idlinea: t.arg.int({ required: true }),
      motivo: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CONCILIACION_OVERRIDE);
      return desconciliarLinea(usuarioId(ctx), args.idlinea, args.motivo);
    },
  }),
);

builder.mutationField('excluirLineaBancaria', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      idlinea: t.arg.int({ required: true }),
      motivo: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CONCILIACION_OVERRIDE);
      return excluirLinea(usuarioId(ctx), args.idlinea, args.motivo);
    },
  }),
);
