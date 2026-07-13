import { builder } from '../../builder';
import type { InformeGestiones } from '@/types/cobranza';

const InformeGestionItemType = builder
  .objectRef<InformeGestiones['gestiones'][number]>('InformeGestionItem')
  .implement({
    fields: (t) => ({
      noPrestamo: t.exposeString('noPrestamo'),
      codigoUnico: t.exposeString('codigoUnico'),
      nombreCliente: t.exposeString('nombreCliente'),
      cantCtas: t.exposeInt('cantCtas'),
      agencia: t.exposeString('agencia'),
      gestor: t.exposeString('gestor'),
      fechaGestion: t.exposeString('fechaGestion'),
      telefonoContacto: t.exposeString('telefonoContacto'),
      codigoAccion: t.exposeString('codigoAccion'),
      codigoResultado: t.exposeString('codigoResultado'),
      nota: t.exposeString('nota'),
      razonMora: t.exposeString('razonMora'),
      montoPromesa: t.exposeFloat('montoPromesa', { nullable: true }),
      fechaProximaGestion: t.exposeString('fechaProximaGestion'),
      comentario: t.exposeString('comentario'),
      tipificacion: t.exposeString('tipificacion'),
      mes: t.exposeString('mes'),
      pagos: t.exposeFloat('pagos'),
    }),
  });

export const InformeGestionesType = builder
  .objectRef<InformeGestiones>('InformeGestiones')
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      mandanteCodigo: t.exposeString('mandanteCodigo'),
      mandanteNombre: t.exposeString('mandanteNombre'),
      periodo: t.exposeString('periodo'),
      totalGestiones: t.exposeInt('totalGestiones'),
      gestiones: t.field({
        type: [InformeGestionItemType],
        resolve: (p) => p.gestiones,
      }),
    }),
  });
