import { builder, type GraphQLContext } from '../../builder';
import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import { GraphQLValidationError } from '@/lib/errors/graphql-errors';
import {
  crearCierreDiario,
  guardarDeclaracionCierre,
  enviarCierreRevision,
  cerrarCierreDiario,
  reabrirCierreDiario,
} from '@/lib/cobranza/cierre-diario-service';
import { CierreDiarioType, DeclaracionCierreInput } from './types';

function usuario(ctx: GraphQLContext): number {
  const id = ctx.usuario?.idusuario;
  if (!id) throw new GraphQLValidationError('Usuario no autenticado.');
  return id;
}

builder.mutationField('crearCierreDiario', (t) => t.prismaField({
  type: CierreDiarioType,
  args: {
    idmandante: t.arg.int({ required: true }),
    fechaNegocio: t.arg({ type: 'DateTime', required: true }),
    idagencia: t.arg.int({ required: false }),
    idusuarioCaja: t.arg.int({ required: false }),
  },
  resolve: async (query, _parent, args, ctx: GraphQLContext) => {
    await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CIERRE_CREATE);
    const cierre = await crearCierreDiario(usuario(ctx), {
      idmandante: args.idmandante,
      fechaNegocio: args.fechaNegocio,
      idagencia: args.idagencia ?? null,
      idusuarioCaja: args.idusuarioCaja ?? null,
    });
    return ctx.prisma.tbl_cierre_diario.findUniqueOrThrow({
      ...(query as Record<string, unknown>),
      where: { idcierre: cierre.idcierre },
    }) as never;
  },
}));

builder.mutationField('guardarDeclaracionCierre', (t) => t.prismaField({
  type: CierreDiarioType,
  args: {
    idcierre: t.arg.int({ required: true }),
    declarados: t.arg({ type: [DeclaracionCierreInput], required: true }),
  },
  resolve: async (query, _parent, args, ctx: GraphQLContext) => {
    await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CIERRE_CREATE);
    const cierre = await guardarDeclaracionCierre(
      usuario(ctx),
      args.idcierre,
      args.declarados.map((d) => ({ medio: d.medio, montoDeclarado: d.montoDeclarado })),
    );
    return ctx.prisma.tbl_cierre_diario.findUniqueOrThrow({
      ...(query as Record<string, unknown>),
      where: { idcierre: cierre.idcierre },
    }) as never;
  },
}));

builder.mutationField('enviarCierreRevision', (t) => t.prismaField({
  type: CierreDiarioType,
  args: { idcierre: t.arg.int({ required: true }) },
  resolve: async (query, _parent, args, ctx: GraphQLContext) => {
    await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CIERRE_REVIEW);
    const cierre = await enviarCierreRevision(usuario(ctx), args.idcierre);
    return ctx.prisma.tbl_cierre_diario.findUniqueOrThrow({
      ...(query as Record<string, unknown>),
      where: { idcierre: cierre.idcierre },
    }) as never;
  },
}));

builder.mutationField('cerrarCierreDiario', (t) => t.prismaField({
  type: CierreDiarioType,
  args: { idcierre: t.arg.int({ required: true }) },
  resolve: async (query, _parent, args, ctx: GraphQLContext) => {
    await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CIERRE_CLOSE);
    const cierre = await cerrarCierreDiario(usuario(ctx), args.idcierre);
    return ctx.prisma.tbl_cierre_diario.findUniqueOrThrow({
      ...(query as Record<string, unknown>),
      where: { idcierre: cierre.idcierre },
    }) as never;
  },
}));

builder.mutationField('reabrirCierreDiario', (t) => t.prismaField({
  type: CierreDiarioType,
  args: {
    idcierre: t.arg.int({ required: true }),
    motivo: t.arg.string({ required: true }),
  },
  resolve: async (query, _parent, args, ctx: GraphQLContext) => {
    await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CIERRE_REOPEN);
    const cierre = await reabrirCierreDiario(usuario(ctx), args.idcierre, args.motivo);
    return ctx.prisma.tbl_cierre_diario.findUniqueOrThrow({
      ...(query as Record<string, unknown>),
      where: { idcierre: cierre.idcierre },
    }) as never;
  },
}));
