import { builder ,type  GraphQLContext } from '../../builder';

import { z } from 'zod';
import { requerirPermiso } from '@/lib/permissions/permission-service';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  listarCargasCartera,
  obtenerResumenCarga,
  revertirUltimaCarga,
} from '@/lib/cobranza/cartera-carga-service';

const RevertirCargaInputSchema = z.object({
  idmandante: z.number().int().positive(),
  motivo: z.string().min(1),
});

type CargaCarteraItem = {
  idcarga: number;
  nombreArchivo: string;
  fechaCorte: Date;
  estado: string;
  totalPrestamos: number;
  saldoTotal: number;
  tiempoMs: number | null;
  createdAt: Date;
  usuario: { nombre: string } | null;
};

export const CargaCartera = builder.objectRef<CargaCarteraItem>('CargaCartera').implement({
  fields: (t) => ({
    idcarga: t.exposeInt('idcarga'),
    nombreArchivo: t.exposeString('nombreArchivo'),
    fechaCorte: t.expose('fechaCorte', { type: 'DateTime' }),
    estado: t.exposeString('estado'),
    totalPrestamos: t.exposeInt('totalPrestamos'),
    saldoTotal: t.exposeFloat('saldoTotal'),
    tiempoMs: t.exposeInt('tiempoMs', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    usuario: t.field({
      type: 'String',
      nullable: true,
      resolve: (c) => c.usuario?.nombre ?? null,
    }),
  }),
});

export const CargaCarteraPage = builder.objectRef<{
  cargas: CargaCarteraItem[];
  total: number;
}>('CargaCarteraPage').implement({
  fields: (t) => ({
    cargas: t.field({
      type: [CargaCartera],
      resolve: (p) => p.cargas,
    }),
    total: t.exposeInt('total'),
  }),
});

export const ResumenComparacionCarga = builder.objectRef<{
  prestamosNuevos: string[];
  prestamosSaldoCambiado: Array<{
    noPrestamo: string;
    saldoAnterior: number;
    saldoNuevo: number;
  }>;
  prestamosFechaCorteCambiada: string[];
  prestamosAusentes: string[];
  prestamosConErrores: Array<{ fila: number; mensaje: string }>;
}>('ResumenComparacionCarga').implement({
  fields: (t) => ({
    prestamosNuevos: t.exposeStringList('prestamosNuevos'),
    prestamosAusentes: t.exposeStringList('prestamosAusentes'),
    prestamosFechaCorteCambiada: t.exposeStringList('prestamosFechaCorteCambiada'),
    prestamosSaldoCambiado: t.field({
      type: ['JSON'],
      resolve: (p) => p.prestamosSaldoCambiado,
    }),
    prestamosConErrores: t.field({
      type: ['JSON'],
      resolve: (p) => p.prestamosConErrores,
    }),
  }),
});

builder.queryField('cargasCartera', (t) =>
  t.field({
    type: CargaCarteraPage,
    args: {
      idmandante: t.arg.int({ required: true }),
      page: t.arg.int({ required: false, defaultValue: 1 }),
      pageSize: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      return listarCargasCartera(
        ctx.usuario?.idusuario ?? 0,
        args.idmandante,
        args.page ?? 1,
        args.pageSize ?? 20,
      );
    },
  }),
);

builder.queryField('resumenCargaCartera', (t) =>
  t.field({
    type: ResumenComparacionCarga,
    nullable: true,
    args: { idcarga: t.arg.int({ required: true }) },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_READ);
      return obtenerResumenCarga(ctx.usuario?.idusuario ?? 0, args.idcarga);
    },
  }),
);

builder.mutationField('revertirCargaCartera', (t) =>
  t.field({
    type: 'Int',
    args: {
      idmandante: t.arg.int({ required: true }),
      motivo: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, ctx: GraphQLContext) => {
      await requerirPermiso(ctx.usuario?.idusuario, PERMISO.CARTERA_WRITE);
      const data = RevertirCargaInputSchema.parse(args);
      const result = await revertirUltimaCarga(
        ctx.usuario?.idusuario ?? 0,
        data.idmandante,
        data.motivo,
      );
      return result.idcarga;
    },
  }),
);
