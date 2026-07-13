/**
 * Agrega datos del sistema para el Informe Gerencial de Gestión de Cobranza
 * (cierre de mes por mandante).
 */

import { prisma } from '@/lib/prisma';
import { requerirAccesoMandante } from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';
import { parsePeriodo } from './periodo-utils';
import {
  construirNarrativaInforme,
  type InformeGerencialNarrativa,
} from './informe-gerencial-narrativa';
import type {
  InformeGerencial,
  InformeGerencialAcuerdoItem,
  InformeGerencialCanalItem,
  InformeGerencialIndicadores,
  InformeGerencialPagoItem,
  InformeGerencialSegmentoItem,
} from '@/types/cobranza';

const MESES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

const CANAL_POR_CODIGO: Record<string, string> = {
  LLC: 'Llamadas telefónicas',
  TCC: 'Llamadas telefónicas',
  TRE: 'Llamadas telefónicas',
  LLT: 'Llamadas telefónicas',
  TTC: 'WhatsApp Business',
  SMS: 'SMS',
  CE: 'Correo electrónico',
  RCE: 'Correo electrónico',
};

const USO_CANAL_DEFAULT: Record<string, string> = {
  'Llamadas telefónicas': 'Horario extendido',
  'WhatsApp Business': 'Mensajería directa y recordatorios',
  'Correo electrónico': 'Formalización de acuerdos',
  SMS: 'Recordatorios automáticos',
};

function nombreCliente(row: {
  primer_nombres: string;
  segundo_nombres: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
}): string {
  return [
    row.primer_nombres,
    row.segundo_nombres,
    row.primer_apellido,
    row.segundo_apellido,
  ]
    .filter(Boolean)
    .join(' ');
}

function formatearFechaCorta(d: Date | null | undefined): string {
  if (!d) {
    return 'Por definir';
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function etiquetaPeriodo(inicio: Date, finExclusive: Date): string {
  const fin = new Date(finExclusive);
  fin.setDate(fin.getDate() - 1);
  const m = MESES_ES[inicio.getMonth()];
  return `1 al ${fin.getDate()} de ${m} del ${inicio.getFullYear()}`;
}

function etiquetaMesAnio(d: Date): string {
  const m = MESES_ES[d.getMonth()];
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${d.getFullYear()}`;
}

function estatusAcuerdoLabel(estado: string): string {
  // Mientras no esté ROTO, se reporta como cumplido.
  if (estado === 'ROTO') {
    return 'Incumplido';
  }
  return 'Cumplido';
}

function tipoArregloDesdeCuotas(
  numeroCuotas: number,
  fechaInicio: Date,
  primeraCuota: Date | null,
): string {
  if (!primeraCuota || numeroCuotas <= 1) {
    return 'Mensual';
  }
  const diffMs = primeraCuota.getTime() - fechaInicio.getTime();
  const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDias <= 8) {
    return 'Semanal';
  }
  if (diffDias <= 16) {
    return 'Quincenal';
  }
  return 'Mensual';
}

export async function obtenerInformeGerencial(
  idmandante: number,
  idusuario: number,
  periodo: string,
): Promise<InformeGerencial> {
  await requerirAccesoMandante(idusuario, idmandante);

  const { inicio, fin, periodo: periodoNorm } = parsePeriodo(periodo);
  const periodoLabel = etiquetaPeriodo(inicio, fin);
  const proximoInicio = new Date(fin);
  const proximoPeriodoLabel = etiquetaMesAnio(proximoInicio);

  const mandante = await prisma.tbl_mandante.findFirst({
    where: { idmandante, deletedAt: null },
    select: { idmandante: true, codigo: true, nombre: true },
  });
  if (!mandante) {
    throw new Error('Mandante no encontrado.');
  }

  const [
    pagosRaw,
    acuerdosRaw,
    gestionesPeriodo,
    totalPrestamos,
    prestamosConAcuerdo,
    prestamosConPromesa,
    gestionesPorAccion,
  ] = await Promise.all([
    prisma.tbl_pago.findMany({
      where: {
        idmandante,
        deletedAt: null,
        aplicado: true,
        fechaPago: { gte: inicio, lt: fin },
      },
      select: {
        idpago: true,
        monto: true,
        fechaPago: true,
        medio: true,
        diasMoraAplicacion: true,
        gestion: { select: { idgestor: true, gestor: { select: { nombre: true } } } },
        gestor: { select: { nombre: true } },
        prestamo: {
          select: {
            noPrestamo: true,
            codigoUnico: true,
            montoPrestamo: true,
            diasMora: true,
            gestor: { select: { nombre: true } },
            agencia: { select: { nombre: true } },
            cliente: {
              select: {
                primer_nombres: true,
                segundo_nombres: true,
                primer_apellido: true,
                segundo_apellido: true,
                ciudad: true,
                departamento: { select: { descripcion: true } },
              },
            },
          },
        },
      },
      orderBy: { fechaPago: 'asc' },
    }),
    prisma.tbl_acuerdo.findMany({
      where: {
        idmandante,
        deletedAt: null,
        createdAt: { gte: inicio, lt: fin },
      },
      select: {
        idacuerdo: true,
        numeroCuotas: true,
        montoCuota: true,
        fechaInicio: true,
        estado: true,
        prestamo: {
          select: {
            saldoTotal: true,
            cliente: {
              select: {
                primer_nombres: true,
                segundo_nombres: true,
                primer_apellido: true,
                segundo_apellido: true,
              },
            },
          },
        },
        cuotas: {
          orderBy: { numeroCuota: 'asc' },
          take: 1,
          select: { fechaVencimiento: true, montoCuota: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.tbl_gestion.count({
      where: {
        idmandante,
        deletedAt: null,
        fechaGestion: { gte: inicio, lt: fin },
      },
    }),
    prisma.tbl_prestamo.count({
      where: { idmandante, deletedAt: null, estado: { not: 'Cancelado' } },
    }),
    prisma.tbl_acuerdo.findMany({
      where: { idmandante, estado: 'VIGENTE', deletedAt: null },
      select: { idprestamo: true },
      distinct: ['idprestamo'],
    }),
    prisma.tbl_gestion.findMany({
      where: {
        idmandante,
        deletedAt: null,
        fechaPromesa: { not: null, gte: new Date() },
        montoPromesa: { not: null },
        NOT: { nota: { contains: '[PROMESA_CUMPLIDA]' } },
        prestamo: { deletedAt: null, estado: { not: 'Cancelado' } },
      },
      select: { idprestamo: true },
      distinct: ['idprestamo'],
    }),
    prisma.tbl_gestion.findMany({
      where: {
        idmandante,
        deletedAt: null,
        fechaGestion: { gte: inicio, lt: fin },
        idcodaccion: { not: null },
      },
      select: {
        codaccion: { select: { codigo: true } },
      },
    }),
  ]);

  const montoRecuperado = roundMoney(
    pagosRaw.reduce((s, p) => s + decimalToNumber(p.monto), 0),
  );

  const acuerdosFormalizados = acuerdosRaw.length;
  // VIGENTE y CUMPLIDO cuentan como cumplidos; solo ROTO es incumplido.
  const acuerdosIncumplidos = acuerdosRaw.filter(
    (a) => a.estado === 'ROTO',
  ).length;
  const acuerdosCumplidos = Math.max(
    0,
    acuerdosFormalizados - acuerdosIncumplidos,
  );
  const eficaciaAcuerdosPct =
    acuerdosFormalizados > 0
      ? roundMoney((acuerdosCumplidos / acuerdosFormalizados) * 100)
      : 0;

  const indicadores: InformeGerencialIndicadores = {
    montoRecuperado,
    acuerdosFormalizados,
    acuerdosCumplidos,
    acuerdosIncumplidos,
    eficaciaAcuerdosPct,
    totalGestiones: gestionesPeriodo,
  };

  const acuerdos: InformeGerencialAcuerdoItem[] = acuerdosRaw.map(
    (a, idx) => {
      const primera = a.cuotas[0] ?? null;
      const fechaPrimerPago = primera?.fechaVencimiento ?? a.fechaInicio;
      return {
        numero: idx + 1,
        cliente: nombreCliente(a.prestamo.cliente),
        saldoTotal: roundMoney(decimalToNumber(a.prestamo.saldoTotal)),
        tipoArreglo: tipoArregloDesdeCuotas(
          a.numeroCuotas,
          a.fechaInicio,
          primera?.fechaVencimiento ?? null,
        ),
        montoCuota: roundMoney(
          decimalToNumber(primera?.montoCuota ?? a.montoCuota),
        ),
        plazo:
          a.numeroCuotas > 0
            ? `${a.numeroCuotas} cuota${a.numeroCuotas === 1 ? '' : 's'}`
            : 'Por definir',
        fechaPrimerPago: formatearFechaCorta(fechaPrimerPago),
        estatus: estatusAcuerdoLabel(a.estado),
      };
    },
  );

  const pagos: InformeGerencialPagoItem[] = pagosRaw.map((p) => {
    const ejecutivo =
      p.gestor?.nombre ??
      p.gestion?.gestor?.nombre ??
      p.prestamo.gestor?.nombre ??
      '—';
    const depto =
      p.prestamo.cliente.departamento?.descripcion ??
      p.prestamo.cliente.ciudad ??
      '—';
    return {
      cliente: nombreCliente(p.prestamo.cliente),
      noPrestamo: p.prestamo.noPrestamo,
      codigoUnico: p.prestamo.codigoUnico,
      montoOriginal: roundMoney(decimalToNumber(p.prestamo.montoPrestamo)),
      montoPagado: roundMoney(decimalToNumber(p.monto)),
      fechaPago: formatearFechaCorta(p.fechaPago),
      medioReferencia: p.medio?.trim() || '—',
      ejecutivo,
      departamentoCiudad: depto,
      sucursal: p.prestamo.agencia?.nombre ?? '—',
      diasMora: p.diasMoraAplicacion ?? p.prestamo.diasMora,
    };
  });

  const idsConAcuerdo = new Set(prestamosConAcuerdo.map((a) => a.idprestamo));
  const idsConPromesa = new Set(
    prestamosConPromesa
      .map((g) => g.idprestamo)
      .filter((id) => !idsConAcuerdo.has(id)),
  );
  const baseCartera = Math.max(totalPrestamos, 1);
  const pctAcuerdo = roundMoney((idsConAcuerdo.size / baseCartera) * 100);
  const pctPromesa = roundMoney((idsConPromesa.size / baseCartera) * 100);
  const pctCritica = roundMoney(
    Math.max(0, 100 - pctAcuerdo - pctPromesa),
  );

  const segmentos: InformeGerencialSegmentoItem[] = [
    {
      segmento: 'Cartera con disposición de pago',
      descripcion: 'Clientes con acuerdos activos',
      porcentaje: pctAcuerdo,
    },
    {
      segmento: 'Cartera en seguimiento',
      descripcion: 'Clientes con promesas pendientes',
      porcentaje: pctPromesa,
    },
    {
      segmento: 'Cartera crítica',
      descripcion: 'Clientes reincidentes o sin respuesta',
      porcentaje: pctCritica,
    },
  ];

  const canalCounts = new Map<string, number>();
  for (const g of gestionesPorAccion) {
    const codigo = g.codaccion?.codigo;
    if (!codigo) {
      continue;
    }
    const canal = CANAL_POR_CODIGO[codigo];
    if (!canal) {
      continue;
    }
    canalCounts.set(canal, (canalCounts.get(canal) ?? 0) + 1);
  }

  const canalesBase = Object.keys(USO_CANAL_DEFAULT);
  const canales: InformeGerencialCanalItem[] = canalesBase.map((canal) => {
    const usos = canalCounts.get(canal) ?? 0;
    const usoBase = USO_CANAL_DEFAULT[canal] ?? 'Gestión operativa';
    return {
      canal,
      uso: usos > 0 ? `${usoBase} (${usos} gestiones)` : usoBase,
    };
  });

  const acuerdosSinFecha = acuerdosRaw.filter((a) => {
    const primera = a.cuotas[0];
    return !primera?.fechaVencimiento && !a.fechaInicio;
  }).length;

  const narrativa: InformeGerencialNarrativa = construirNarrativaInforme({
    periodoLabel,
    proximoPeriodoLabel,
    indicadores,
    pctCarteraCritica: pctCritica,
    acuerdosSinFechaInicio: acuerdosSinFecha,
  });

  const accionesRecomendadas = [
    {
      accion: 'Escalamiento de gestión en clientes reincidentes',
      responsable: 'Equipo de cobranza',
      fechaLimite: formatearFechaCorta(
        new Date(proximoInicio.getFullYear(), proximoInicio.getMonth(), 10),
      ),
      kpiExito: '100% de casos escalados',
    },
    {
      accion: 'Establecimiento de plazos estrictos para acuerdos',
      responsable: 'Gestor líder',
      fechaLimite: 'Inmediato',
      kpiExito: '0 acuerdos sin fecha definida',
    },
    {
      accion: 'Priorización de cuentas con más de 60 días de mora',
      responsable: 'Equipo de análisis',
      fechaLimite: 'Semanal',
      kpiExito: 'Reducción del 20% de cartera >60 días',
    },
    {
      accion: 'Implementación de recordatorios automáticos (WhatsApp/SMS)',
      responsable: 'Soporte técnico',
      fechaLimite: formatearFechaCorta(
        new Date(proximoInicio.getFullYear(), proximoInicio.getMonth(), 5),
      ),
      kpiExito: 'Tasa de recordatorio del 100%',
    },
    {
      accion: 'Solicitud formal de actualización de datos de contacto',
      responsable: 'Administración',
      fechaLimite: formatearFechaCorta(
        new Date(proximoInicio.getFullYear(), proximoInicio.getMonth(), 7),
      ),
      kpiExito: 'Actualización de 30 contactos',
    },
  ];

  const planTrabajo = [
    {
      actividad: `Seguimiento a los ${acuerdosFormalizados} acuerdos formalizados`,
      frecuencia: 'Semanal',
      responsable: 'Gestor asignado',
    },
    {
      actividad: 'Recordatorio programado 48h antes de cada vencimiento',
      frecuencia: 'Automatizado',
      responsable: 'Sistema + Gestor',
    },
    {
      actividad: 'Informe de incumplimientos para escalamiento',
      frecuencia: 'Diario',
      responsable: 'Coordinador',
    },
    {
      actividad: 'Reunión semanal de seguimiento de cartera crítica',
      frecuencia: 'Lunes 9:00 AM',
      responsable: 'Todo el equipo',
    },
  ];

  return {
    idmandante: mandante.idmandante,
    mandanteCodigo: mandante.codigo,
    mandanteNombre: mandante.nombre,
    periodo: periodoNorm,
    periodoLabel,
    proximoPeriodoLabel,
    indicadores,
    acuerdos,
    pagos,
    segmentos,
    canales,
    accionesDesarrolladas: [
      'Contacto directo con clientes en mora (llamadas, mensajes de texto, correo electrónico y WhatsApp).',
      'Negociación de acuerdos de pago según capacidad del cliente.',
      'Seguimiento a promesas de pago y compromisos adquiridos.',
      'Gestión de recuperación mediante incentivos autorizados (dispensas).',
      'Control y actualización permanente de la cartera gestionada.',
    ],
    perfilesGestion: [
      {
        perfil: 'Cartera con acuerdo activo',
        accion: 'Seguimiento post-acuerdo',
        frecuencia: 'Semanal',
      },
      {
        perfil: 'Cartera con promesa pendiente',
        accion: 'Recordatorio 3 días antes del vencimiento',
        frecuencia: 'Por evento',
      },
      {
        perfil: 'Cartera sin contacto',
        accion: 'Cambio de horario / método de contacto',
        frecuencia: 'Diario',
      },
      {
        perfil: 'Cartera reincidente',
        accion: 'Escalamiento + advertencia formal',
        frecuencia: 'Inmediato',
      },
    ],
    accionesRecomendadas,
    planTrabajo,
    narrativa,
  };
}
