import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ITableCellOptions,
} from 'docx';
import { formatearMoneda, type InformeGerencial } from '@/types/cobranza';

export interface ExportInformeDocxOpts {
  destinatarioNombre: string;
  destinatarioCargo: string;
}

const HEADER_BG = '1E3A5F';
const ALT_ROW_BG = 'F8FAFC';
const TOTAL_BG = 'FEF08A';

function p(text: string, opts?: { bold?: boolean; size?: number }): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text,
        bold: opts?.bold,
        size: opts?.size ?? 20,
        font: 'Calibri',
      }),
    ],
  });
}

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1): Paragraph {
  return new Paragraph({
    heading: level,
    spacing: { before: 280, after: 160 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: level === HeadingLevel.HEADING_1 ? 26 : 22,
        font: 'Calibri',
        color: '0B2A4A',
      }),
    ],
  });
}

function cell(
  text: string,
  opts?: {
    bold?: boolean;
    header?: boolean;
    width?: number;
    fill?: string;
    color?: string;
  },
): TableCell {
  const props: ITableCellOptions = {
    width: { size: opts?.width ?? 2000, type: WidthType.DXA },
    shading: opts?.fill
      ? { fill: opts.fill }
      : opts?.header
        ? { fill: HEADER_BG }
        : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: opts?.bold ?? opts?.header,
            size: 16,
            font: 'Calibri',
            color: opts?.color ?? (opts?.header ? 'FFFFFF' : '1E293B'),
          }),
        ],
      }),
    ],
  };
  return new TableCell(props);
}

function buildTable(headers: string[], rows: string[][]): Table {
  const colW = Math.floor(9000 / Math.max(headers.length, 1));
  const headerRow = new TableRow({
    children: headers.map((h) =>
      cell(h, { header: true, width: colW, bold: true }),
    ),
  });
  const bodyRows = rows.map(
    (row, i) =>
      new TableRow({
        children: row.map((c) =>
          cell(c, {
            width: colW,
            fill: i % 2 === 1 ? ALT_ROW_BG : undefined,
          }),
        ),
      }),
  );
  return new Table({
    width: { size: 9000, type: WidthType.DXA },
    rows: [headerRow, ...bodyRows],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    bullet: { level: 0 },
    children: [
      new TextRun({ text, size: 20, font: 'Calibri' }),
    ],
  });
}

function safeFilename(name: string): string {
  return name.replace(/[^\w\-áéíóúÁÉÍÓÚñÑ]+/gi, '_').slice(0, 50);
}

/**
 * Genera y descarga el Informe Gerencial en formato Word (.docx).
 */
export async function exportInformeGerencialDocx(
  informe: InformeGerencial,
  opts: ExportInformeDocxOpts,
): Promise<void> {
  const ind = informe.indicadores;
  const n = informe.narrativa;
  const cargo = opts.destinatarioCargo || 'Ingeniero';
  const nombre = opts.destinatarioNombre || '—';

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: 'INFORME GERENCIAL DE GESTIÓN DE COBRANZA',
          bold: true,
          size: 32,
          font: 'Calibri',
          color: '0B2A4A',
        }),
      ],
    }),
    p(`${cargo}.`),
    p(nombre, { bold: true }),
    p('Gerente General'),
    p(informe.mandanteNombre),
    p(''),
    p('De nuestra mayor consideración:', { bold: true }),
    p(
      `Nos permitimos remitir el presente Informe Gerencial de Gestión de Cobranza, correspondiente al periodo comprendido del ${informe.periodoLabel}, en el marco del servicio de recuperación de cartera, detallando los avances, resultados y acciones ejecutadas.`,
    ),

    heading('1. RESUMEN EJECUTIVO'),
    p(n.resumenEjecutivo),
    p('Indicadores Clave de Gestión', { bold: true }),
    p('Resultados clave del período:'),
    buildTable(
      ['Indicador', 'Resultado'],
      [
        [
          'Monto total recuperado efectivamente',
          formatearMoneda(ind.montoRecuperado),
        ],
        [
          'Acuerdos de pago formalizados',
          `${ind.acuerdosFormalizados} nuevos acuerdos`,
        ],
        ['Acuerdos incumplidos', String(ind.acuerdosIncumplidos)],
      ],
    ),
    p(''),
    p('Valoración general:', { bold: true }),
    p(n.valoracionGeneral),

    heading('2. INDICADORES CLAVE DE GESTIÓN'),
    buildTable(
      ['Indicador', 'Valor'],
      [
        ['Monto recuperado', formatearMoneda(ind.montoRecuperado)],
        ['Acuerdos formalizados', String(ind.acuerdosFormalizados)],
        ['Acuerdos incumplidos', String(ind.acuerdosIncumplidos)],
        [
          'Eficacia de acuerdos',
          `${ind.eficaciaAcuerdosPct}% (${ind.acuerdosCumplidos} de ${ind.acuerdosFormalizados} cumplido${ind.acuerdosCumplidos === 1 ? '' : 's'})`,
        ],
      ],
    ),

    heading('3. ALCANCE DE LA GESTIÓN'),
    heading('3.1 Acciones desarrolladas', HeadingLevel.HEADING_2),
    p('Las acciones desarrolladas comprendieron:'),
    ...informe.accionesDesarrolladas.map((a) => bullet(a)),
    heading('3.2 Canales utilizados', HeadingLevel.HEADING_2),
    buildTable(
      ['Canal', 'Uso'],
      informe.canales.map((c) => [c.canal, c.uso]),
    ),

    heading('4. CONTROL Y COMPORTAMIENTO DE CARTERA'),
    p(
      'La cartera se mantiene bajo control operativo, con seguimiento individualizado por cliente y priorización basada en nivel de morosidad y riesgo de incobrabilidad.',
    ),
    heading('4.1 Segmentos identificados', HeadingLevel.HEADING_2),
    buildTable(
      ['Segmento', 'Descripción', 'Porcentaje estimado'],
      informe.segmentos.map((s) => [
        s.segmento,
        s.descripcion,
        `${s.porcentaje}%`,
      ]),
    ),
    heading('4.2 Gestión diferenciada por perfil', HeadingLevel.HEADING_2),
    buildTable(
      ['Perfil', 'Acción aplicada', 'Frecuencia'],
      informe.perfilesGestion.map((pf) => [
        pf.perfil,
        pf.accion,
        pf.frecuencia,
      ]),
    ),

    heading('5. DETALLE DE CLIENTES CON PROMESAS Y ACUERDOS DE PAGO'),
    p(
      `A continuación, se detallan los ${informe.acuerdos.length} acuerdos formalizados durante el período, con su estatus actual:`,
    ),
    buildTable(
      [
        'N°',
        'Cliente',
        'Saldo Total (C$)',
        'Tipo de Arreglo',
        'Monto de Cuota (C$)',
        'Plazo',
        'Fecha de Primer Pago',
        'Estatus',
      ],
      informe.acuerdos.length > 0
        ? informe.acuerdos.map((a) => [
            String(a.numero),
            a.cliente,
            a.saldoTotal.toLocaleString('es-NI', {
              minimumFractionDigits: 2,
            }),
            a.tipoArreglo,
            formatearMoneda(a.montoCuota),
            a.plazo,
            a.fechaPrimerPago,
            a.estatus,
          ])
        : [['—', 'Sin acuerdos en el período', '—', '—', '—', '—', '—', '—']],
    ),

    heading('6. CLIENTES QUE REALIZARON PAGOS'),
    p(
      `Detalle de pagos aplicados en el período (${formatearMoneda(ind.montoRecuperado)} recuperados):`,
    ),
  ];

  const pagoHeaders = [
    'Cliente',
    'N° Prestamo',
    'Código único',
    'Monto original',
    'Pagado',
    'Fecha',
    'Banco-Referencia',
    'Ejecutivo',
    'Depto/ciud',
    'Sucursal',
    'Tramo mora',
  ];
  const pagoRows =
    informe.pagos.length > 0
      ? informe.pagos.map((pago) => [
          pago.cliente,
          pago.noPrestamo,
          pago.codigoUnico,
          formatearMoneda(pago.montoOriginal),
          formatearMoneda(pago.montoPagado),
          pago.fechaPago,
          pago.medioReferencia,
          pago.ejecutivo,
          pago.departamentoCiudad,
          pago.sucursal,
          String(pago.diasMora),
        ])
      : [
          [
            'Sin pagos aplicados en el período',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
          ],
        ];

  const colWPago = Math.floor(9000 / pagoHeaders.length);
  const pagoTableRows = [
    new TableRow({
      children: pagoHeaders.map((h) =>
        cell(h, { header: true, width: colWPago, bold: true }),
      ),
    }),
    ...pagoRows.map(
      (row, i) =>
        new TableRow({
          children: row.map((c, j) =>
            cell(c, {
              width: colWPago,
              fill: i % 2 === 1 ? ALT_ROW_BG : undefined,
              color: j === 3 ? 'DC2626' : undefined,
            }),
          ),
        }),
    ),
  ];

  if (informe.pagos.length > 0) {
    pagoTableRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 4,
            width: { size: colWPago * 4, type: WidthType.DXA },
            shading: { fill: TOTAL_BG },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
              left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
              right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'TOTAL',
                    bold: true,
                    size: 16,
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
          cell(formatearMoneda(ind.montoRecuperado), {
            bold: true,
            width: colWPago,
            fill: TOTAL_BG,
          }),
          ...Array.from({ length: 6 }, () =>
            cell('', { width: colWPago, fill: TOTAL_BG }),
          ),
        ],
      }),
    );
  }

  children.push(
    new Table({
      width: { size: 9000, type: WidthType.DXA },
      rows: pagoTableRows,
    }),
  );

  children.push(
    heading('7. PRINCIPALES HALLAZGOS Y BRECHAS DE GESTIÓN'),
    heading('7.1 Hallazgos positivos', HeadingLevel.HEADING_2),
    ...n.hallazgosPositivos.map((h) => bullet(h)),
    heading('7.2 Brechas críticas identificadas', HeadingLevel.HEADING_2),
    ...n.brechasCriticas.map((b) => bullet(b)),

    heading('8. ACCIONES ESTRATÉGICAS RECOMENDADAS'),
    p(
      'Como empresa especializada en recuperación de cartera, implementaremos las siguientes acciones en el próximo período:',
    ),
    buildTable(
      ['Acción', 'Responsable', 'Fecha límite', 'KPI de éxito'],
      informe.accionesRecomendadas.map((a) => [
        a.accion,
        a.responsable,
        a.fechaLimite,
        a.kpiExito,
      ]),
    ),

    heading(
      `9. PLAN DE TRABAJO PARA EL PRÓXIMO PERÍODO (${informe.proximoPeriodoLabel.toUpperCase()})`,
    ),
    buildTable(
      ['Actividad', 'Frecuencia', 'Responsable'],
      informe.planTrabajo.map((pl) => [
        pl.actividad,
        pl.frecuencia,
        pl.responsable,
      ]),
    ),
    p(
      `Compromisos del equipo para ${informe.proximoPeriodoLabel.toLowerCase()}:`,
      { bold: true },
    ),
    ...n.compromisosProximoPeriodo.map((c) => bullet(c)),

    heading('10. CONCLUSIÓN GERENCIAL'),
    ...n.conclusion.split('\n').filter(Boolean).map((line) => p(line)),

    p(''),
    p('Atentamente,'),
    p(''),
    p('Equipo de Gestión de Cobranza', { bold: true }),
    p('TIC TAC'),
  );

  const doc = new Document({
    creator: 'FlowPay / TIC TAC',
    title: `Informe Gerencial ${informe.mandanteNombre} ${informe.periodo}`,
    description: `Informe de gestión de cobranza — ${informe.periodoLabel}`,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Informe_Gerencial_${safeFilename(informe.mandanteNombre)}_${informe.periodo}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
