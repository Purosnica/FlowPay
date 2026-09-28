import { builder } from '../../builder';
import { exposeDecimal } from '../../helpers/graphql-helpers';

export const CierreDiarioDetalleType = builder.prismaObject('tbl_cierre_diario_detalle', {
  fields: (t) => ({
    iddetalle: t.exposeInt('iddetalle'),
    idcierre: t.exposeInt('idcierre'),
    medio: t.exposeString('medio'),
    montoSistema: exposeDecimal(t, 'montoSistema'),
    montoDeclarado: exposeDecimal(t, 'montoDeclarado'),
    diferencia: exposeDecimal(t, 'diferencia'),
  }),
});

export const CierreDiarioType = builder.prismaObject('tbl_cierre_diario', {
  fields: (t) => ({
    idcierre: t.exposeInt('idcierre'),
    idmandante: t.exposeInt('idmandante'),
    fechaNegocio: t.expose('fechaNegocio', { type: 'DateTime' }),
    idagencia: t.exposeInt('idagencia', { nullable: true }),
    idusuarioCaja: t.exposeInt('idusuarioCaja', { nullable: true }),
    estado: t.exposeString('estado'),
    totalSistema: exposeDecimal(t, 'totalSistema'),
    totalDeclarado: exposeDecimal(t, 'totalDeclarado'),
    diferencia: exposeDecimal(t, 'diferencia'),
    creadoPor: t.exposeInt('creadoPor'),
    revisadoPor: t.exposeInt('revisadoPor', { nullable: true }),
    cerradoPor: t.exposeInt('cerradoPor', { nullable: true }),
    motivoReapertura: t.exposeString('motivoReapertura', { nullable: true }),
    reopenedAt: t.expose('reopenedAt', { type: 'DateTime', nullable: true }),
    closedAt: t.expose('closedAt', { type: 'DateTime', nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    detalles: t.relation('detalles'),
  }),
});

export const DeclaracionCierreInput = builder.inputType('DeclaracionCierreInput', {
  fields: (t) => ({
    medio: t.string({ required: true }),
    montoDeclarado: t.field({ type: 'Decimal', required: true }),
  }),
});
