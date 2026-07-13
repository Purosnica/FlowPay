import { builder } from '../../builder';
import type { InformeGerencial } from '@/types/cobranza';

const InformeIndicadoresType = builder
  .objectRef<InformeGerencial['indicadores']>('InformeGerencialIndicadores')
  .implement({
    fields: (t) => ({
      montoRecuperado: t.exposeFloat('montoRecuperado'),
      acuerdosFormalizados: t.exposeInt('acuerdosFormalizados'),
      acuerdosCumplidos: t.exposeInt('acuerdosCumplidos'),
      acuerdosIncumplidos: t.exposeInt('acuerdosIncumplidos'),
      eficaciaAcuerdosPct: t.exposeFloat('eficaciaAcuerdosPct'),
      totalGestiones: t.exposeInt('totalGestiones'),
    }),
  });

const InformeAcuerdoItemType = builder
  .objectRef<InformeGerencial['acuerdos'][number]>('InformeGerencialAcuerdoItem')
  .implement({
    fields: (t) => ({
      numero: t.exposeInt('numero'),
      cliente: t.exposeString('cliente'),
      saldoTotal: t.exposeFloat('saldoTotal'),
      tipoArreglo: t.exposeString('tipoArreglo'),
      montoCuota: t.exposeFloat('montoCuota'),
      plazo: t.exposeString('plazo'),
      fechaPrimerPago: t.exposeString('fechaPrimerPago'),
      estatus: t.exposeString('estatus'),
    }),
  });

const InformePagoItemType = builder
  .objectRef<InformeGerencial['pagos'][number]>('InformeGerencialPagoItem')
  .implement({
    fields: (t) => ({
      cliente: t.exposeString('cliente'),
      noPrestamo: t.exposeString('noPrestamo'),
      codigoUnico: t.exposeString('codigoUnico'),
      montoOriginal: t.exposeFloat('montoOriginal'),
      montoPagado: t.exposeFloat('montoPagado'),
      fechaPago: t.exposeString('fechaPago'),
      medioReferencia: t.exposeString('medioReferencia'),
      ejecutivo: t.exposeString('ejecutivo'),
      departamentoCiudad: t.exposeString('departamentoCiudad'),
      sucursal: t.exposeString('sucursal'),
      diasMora: t.exposeInt('diasMora'),
    }),
  });

const InformeSegmentoType = builder
  .objectRef<InformeGerencial['segmentos'][number]>('InformeGerencialSegmentoItem')
  .implement({
    fields: (t) => ({
      segmento: t.exposeString('segmento'),
      descripcion: t.exposeString('descripcion'),
      porcentaje: t.exposeFloat('porcentaje'),
    }),
  });

const InformeCanalType = builder
  .objectRef<InformeGerencial['canales'][number]>('InformeGerencialCanalItem')
  .implement({
    fields: (t) => ({
      canal: t.exposeString('canal'),
      uso: t.exposeString('uso'),
    }),
  });

const InformeAccionType = builder
  .objectRef<InformeGerencial['accionesRecomendadas'][number]>(
    'InformeGerencialAccionItem',
  )
  .implement({
    fields: (t) => ({
      accion: t.exposeString('accion'),
      responsable: t.exposeString('responsable'),
      fechaLimite: t.exposeString('fechaLimite'),
      kpiExito: t.exposeString('kpiExito'),
    }),
  });

const InformePlanType = builder
  .objectRef<InformeGerencial['planTrabajo'][number]>('InformeGerencialPlanItem')
  .implement({
    fields: (t) => ({
      actividad: t.exposeString('actividad'),
      frecuencia: t.exposeString('frecuencia'),
      responsable: t.exposeString('responsable'),
    }),
  });

const InformePerfilType = builder
  .objectRef<InformeGerencial['perfilesGestion'][number]>(
    'InformeGerencialPerfilItem',
  )
  .implement({
    fields: (t) => ({
      perfil: t.exposeString('perfil'),
      accion: t.exposeString('accion'),
      frecuencia: t.exposeString('frecuencia'),
    }),
  });

const InformeNarrativaType = builder
  .objectRef<InformeGerencial['narrativa']>('InformeGerencialNarrativa')
  .implement({
    fields: (t) => ({
      resumenEjecutivo: t.exposeString('resumenEjecutivo'),
      valoracionGeneral: t.exposeString('valoracionGeneral'),
      hallazgosPositivos: t.exposeStringList('hallazgosPositivos'),
      brechasCriticas: t.exposeStringList('brechasCriticas'),
      conclusion: t.exposeString('conclusion'),
      compromisosProximoPeriodo: t.exposeStringList(
        'compromisosProximoPeriodo',
      ),
    }),
  });

export const InformeGerencialType = builder
  .objectRef<InformeGerencial>('InformeGerencial')
  .implement({
    fields: (t) => ({
      idmandante: t.exposeInt('idmandante'),
      mandanteCodigo: t.exposeString('mandanteCodigo'),
      mandanteNombre: t.exposeString('mandanteNombre'),
      periodo: t.exposeString('periodo'),
      periodoLabel: t.exposeString('periodoLabel'),
      proximoPeriodoLabel: t.exposeString('proximoPeriodoLabel'),
      indicadores: t.field({
        type: InformeIndicadoresType,
        resolve: (p) => p.indicadores,
      }),
      acuerdos: t.field({
        type: [InformeAcuerdoItemType],
        resolve: (p) => p.acuerdos,
      }),
      pagos: t.field({
        type: [InformePagoItemType],
        resolve: (p) => p.pagos,
      }),
      segmentos: t.field({
        type: [InformeSegmentoType],
        resolve: (p) => p.segmentos,
      }),
      canales: t.field({
        type: [InformeCanalType],
        resolve: (p) => p.canales,
      }),
      accionesDesarrolladas: t.exposeStringList('accionesDesarrolladas'),
      perfilesGestion: t.field({
        type: [InformePerfilType],
        resolve: (p) => p.perfilesGestion,
      }),
      accionesRecomendadas: t.field({
        type: [InformeAccionType],
        resolve: (p) => p.accionesRecomendadas,
      }),
      planTrabajo: t.field({
        type: [InformePlanType],
        resolve: (p) => p.planTrabajo,
      }),
      narrativa: t.field({
        type: InformeNarrativaType,
        resolve: (p) => p.narrativa,
      }),
    }),
  });
