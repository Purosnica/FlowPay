import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  HeightRule,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertInchesToTwip,
  type ITableCellOptions,
} from 'docx';
import { formatearMoneda, type InformeGerencial } from '@/types/cobranza';

export interface ExportInformeDocxOpts {
  destinatarioNombre: string;
  destinatarioCargo: string;
}

const NAVY = '0B2A4A';
const HEADER_BG = '1E3A5F';
const ALT_ROW_BG = 'F1F5F9';
const TOTAL_BG = 'FEF08A';
const RED_AMOUNT = 'DC2626';
const BORDER = 'CBD5E1';
const PAGE_W = 11906;
const BODY_CONTENT_W = 10206;
const FONT = 'Calibri';

const NONE_BORDER = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

const THIN_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  left: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
  right: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
};

interface BrandImages {
  logo: Uint8Array;
  esquina: Uint8Array;
  pie: Uint8Array;
}

async function fetchPng(path: string): Promise<Uint8Array> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`No se pudo cargar ${path}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

async function loadBrandImages(): Promise<BrandImages> {
  const [logo, esquina, pie] = await Promise.all([
    fetchPng('/images/informe/logo-tic-tac.png'),
    fetchPng('/images/informe/esquina-superior.png'),
    fetchPng('/images/informe/pie-ola.png'),
  ]);
  return { logo, esquina, pie };
}

function p(
  text: string,
  opts?: {
    bold?: boolean;
    size?: number;
    color?: string;
    after?: number;
    before?: number;
    center?: boolean;
  },
): Paragraph {
  return new Paragraph({
    alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { after: opts?.after ?? 120, before: opts?.before ?? 0 },
    children: [
      new TextRun({
        text,
        bold: opts?.bold,
        size: opts?.size ?? 20,
        font: FONT,
        color: opts?.color ?? '1E293B',
      }),
    ],
  });
}

function heading(
  text: string,
  level:
    | typeof HeadingLevel.HEADING_1
    | typeof HeadingLevel.HEADING_2 = HeadingLevel.HEADING_1,
): Paragraph {
  return new Paragraph({
    heading: level,
    spacing: { before: 280, after: 140 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: level === HeadingLevel.HEADING_1 ? 26 : 22,
        font: FONT,
        color: NAVY,
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
    size?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    columnSpan?: number;
  },
): TableCell {
  const props: ITableCellOptions = {
    width: { size: opts?.width ?? 2000, type: WidthType.DXA },
    columnSpan: opts?.columnSpan,
    shading: opts?.fill
      ? { fill: opts.fill }
      : opts?.header
        ? { fill: HEADER_BG }
        : undefined,
    borders: opts?.header
      ? {
          top: { style: BorderStyle.SINGLE, size: 4, color: HEADER_BG },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: HEADER_BG },
          left: { style: BorderStyle.SINGLE, size: 4, color: HEADER_BG },
          right: { style: BorderStyle.SINGLE, size: 4, color: HEADER_BG },
        }
      : THIN_BORDER,
    children: [
      new Paragraph({
        alignment: opts?.align ?? AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: opts?.bold ?? opts?.header,
            size: opts?.size ?? (opts?.header ? 16 : 15),
            font: FONT,
            color: opts?.color ?? (opts?.header ? 'FFFFFF' : '1E293B'),
          }),
        ],
      }),
    ],
  };
  return new TableCell(props);
}

function buildTable(
  headers: string[],
  rows: string[][],
  widths?: number[],
): Table {
  const colW =
    widths ??
    headers.map(() => Math.floor(BODY_CONTENT_W / Math.max(headers.length, 1)));
  return new Table({
    width: { size: BODY_CONTENT_W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: headers.map((h, i) =>
          cell(h, { header: true, width: colW[i], bold: true }),
        ),
      }),
      ...rows.map(
        (row, i) =>
          new TableRow({
            children: row.map((c, j) =>
              cell(c, {
                width: colW[j],
                fill: i % 2 === 1 ? ALT_ROW_BG : 'FFFFFF',
              }),
            ),
          }),
      ),
    ],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    bullet: { level: 0 },
    children: [new TextRun({ text, size: 20, font: FONT, color: '1E293B' })],
  });
}

function safeFilename(name: string): string {
  return name.replace(/[^\w\-áéíóúÁÉÍÓÚñÑ]+/gi, '_').slice(0, 50);
}

function buildCover(informe: InformeGerencial): (Paragraph | Table)[] {
  const coverH = convertInchesToTwip(10.8);
  const sideW = 4200;
  const mainW = PAGE_W - sideW;
  return [
    new Table({
      width: { size: PAGE_W, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          height: { value: coverH, rule: HeightRule.EXACT },
          children: [
            new TableCell({
              width: { size: mainW, type: WidthType.DXA },
              shading: { fill: NAVY },
              borders: NONE_BORDER,
              verticalAlign: VerticalAlign.CENTER,
              margins: {
                top: 400,
                bottom: 400,
                left: 700,
                right: 200,
              },
              children: [
                new Paragraph({
                  spacing: { after: 40 },
                  children: [
                    new TextRun({
                      text: 'TIC',
                      bold: true,
                      size: 28,
                      font: FONT,
                      color: 'FFFFFF',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 400 },
                  children: [
                    new TextRun({
                      text: 'TAC',
                      bold: true,
                      size: 28,
                      font: FONT,
                      color: 'FFFFFF',
                    }),
                  ],
                }),
                ...[
                  'INFORME',
                  'GERENCIAL',
                  'DE GESTIÓN',
                  'DE COBRANZA',
                ].map(
                  (line) =>
                    new Paragraph({
                      spacing: { after: 20 },
                      children: [
                        new TextRun({
                          text: line,
                          bold: true,
                          size: 52,
                          font: FONT,
                          color: 'FFFFFF',
                        }),
                      ],
                    }),
                ),
                new Paragraph({
                  spacing: { before: 400, after: 40 },
                  children: [],
                }),
                p('Dirigido a', { color: 'B8C7D9', size: 18, after: 40 }),
                p(informe.mandanteNombre.toUpperCase(), {
                  bold: true,
                  color: 'FFFFFF',
                  size: 30,
                  after: 200,
                }),
                p('Periodo.', { color: 'B8C7D9', size: 18, after: 40 }),
                p(informe.periodoLabel, {
                  color: 'FFFFFF',
                  size: 22,
                  after: 0,
                }),
              ],
            }),
            new TableCell({
              width: { size: sideW, type: WidthType.DXA },
              shading: { fill: '1E5A8A' },
              borders: NONE_BORDER,
              children: [
                new Paragraph({
                  spacing: { before: 1200 },
                  children: [],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: '',
                      size: 20,
                      color: '3B9DD6',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];
}

function buildBodyHeader(imgs: BrandImages): Header {
  return new Header({
    children: [
      new Table({
        width: { size: BODY_CONTENT_W, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: BODY_CONTENT_W - 2200, type: WidthType.DXA },
                borders: NONE_BORDER,
                children: [
                  new Paragraph({
                    children: [
                      new ImageRun({
                        type: 'png',
                        data: imgs.logo,
                        transformation: { width: 96, height: 46 },
                        altText: {
                          title: 'TIC TAC',
                          description: 'Logo TIC TAC',
                          name: 'logo-header',
                        },
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 2200, type: WidthType.DXA },
                borders: NONE_BORDER,
                verticalAlign: VerticalAlign.TOP,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new ImageRun({
                        type: 'png',
                        data: imgs.esquina,
                        transformation: { width: 96, height: 52 },
                        altText: {
                          title: 'Decoración',
                          description: 'Esquina superior',
                          name: 'esquina',
                        },
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 120 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 12, color: '5EB8E8', space: 4 },
        },
        children: [],
      }),
    ],
  });
}

function buildBodyFooter(imgs: BrandImages): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new ImageRun({
            type: 'png',
            data: imgs.pie,
            transformation: { width: 520, height: 48 },
            altText: {
              title: 'Pie',
              description: 'Decoración inferior',
              name: 'pie',
            },
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'TIC TAC  ·  Página ',
            size: 14,
            font: FONT,
            color: '64748B',
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            size: 14,
            font: FONT,
            color: '64748B',
          }),
          new TextRun({
            text: ' de ',
            size: 14,
            font: FONT,
            color: '64748B',
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            size: 14,
            font: FONT,
            color: '64748B',
          }),
        ],
      }),
    ],
  });
}

function buildPagosTable(informe: InformeGerencial): Table {
  const headers = [
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
  const widths = [1400, 850, 850, 950, 900, 800, 1100, 750, 750, 850, 700];
  const rows =
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

  const tableRows = [
    new TableRow({
      children: headers.map((h, i) =>
        cell(h, { header: true, width: widths[i], bold: true, size: 12 }),
      ),
    }),
    ...rows.map(
      (row, i) =>
        new TableRow({
          children: row.map((c, j) =>
            cell(c, {
              width: widths[j],
              fill: i % 2 === 1 ? ALT_ROW_BG : 'FFFFFF',
              color: j === 3 ? RED_AMOUNT : undefined,
              bold: j === 3,
              size: 12,
            }),
          ),
        }),
    ),
  ];

  if (informe.pagos.length > 0) {
    tableRows.push(
      new TableRow({
        children: [
          cell('Total recuperado', {
            bold: true,
            width: widths[0] + widths[1] + widths[2] + widths[3],
            fill: TOTAL_BG,
            columnSpan: 4,
            align: AlignmentType.RIGHT,
            size: 12,
          }),
          cell(formatearMoneda(informe.indicadores.montoRecuperado), {
            bold: true,
            width: widths[4],
            fill: TOTAL_BG,
            size: 12,
          }),
          ...widths.slice(5).map((w) =>
            cell('', { width: w, fill: TOTAL_BG, size: 12 }),
          ),
        ],
      }),
    );
  }

  return new Table({
    width: { size: BODY_CONTENT_W, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    rows: tableRows,
  });
}

/**
 * Genera y descarga el Informe Gerencial en formato Word (.docx),
 * alineado visualmente con la vista del aplicativo y el membrete TIC TAC.
 */
export async function exportInformeGerencialDocx(
  informe: InformeGerencial,
  opts: ExportInformeDocxOpts,
): Promise<void> {
  const imgs = await loadBrandImages();
  const ind = informe.indicadores;
  const n = informe.narrativa;
  const cargo = opts.destinatarioCargo || 'Ingeniero';
  const nombre = opts.destinatarioNombre || '—';

  const bodyChildren: (Paragraph | Table)[] = [
    p('Informe Gerencial de Gestión de Cobranza', {
      bold: true,
      size: 28,
      color: NAVY,
      center: true,
      after: 60,
    }),
    p(`Periodo: ${informe.periodoLabel} · Mandante: ${informe.mandanteNombre}`, {
      size: 16,
      color: '64748B',
      center: true,
      after: 200,
    }),

    p('Contenido', { bold: true, color: NAVY, size: 18, after: 60 }),
    ...[
      '1. Resumen ejecutivo',
      '2. Indicadores clave de gestión',
      '3. Alcance de la gestión',
      '4. Control y comportamiento de cartera',
      '5. Detalle de clientes con promesas y acuerdos',
      '6. Clientes que realizaron pagos',
      '7. Principales hallazgos y brechas',
      '8. Acciones estratégicas recomendadas',
      '9. Plan de trabajo próximo período',
      '10. Conclusión gerencial',
    ].map((item) => p(item, { size: 16, after: 40, color: '334155' })),

    p(`${cargo}.`, { after: 40, before: 200 }),
    p(nombre, { bold: true, after: 40 }),
    p('Gerente General', { after: 40 }),
    p(informe.mandanteNombre, { after: 160 }),
    p('De nuestra mayor consideración:', { bold: true }),
    p(
      `Nos permitimos remitir el presente Informe Gerencial de Gestión de Cobranza, correspondiente al periodo comprendido del ${informe.periodoLabel}, en el marco del servicio de recuperación de cartera, detallando los avances, resultados y acciones ejecutadas.`,
      { after: 200 },
    ),

    heading('1. RESUMEN EJECUTIVO'),
    p(n.resumenEjecutivo),
    p('Indicadores Clave de Gestión', { bold: true, color: NAVY }),
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
        ['Acuerdos cumplidos', String(ind.acuerdosCumplidos)],
        ['Acuerdos incumplidos (rotos)', String(ind.acuerdosIncumplidos)],
      ],
      [6500, 3706],
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
        ['Acuerdos cumplidos', String(ind.acuerdosCumplidos)],
        ['Acuerdos incumplidos (rotos)', String(ind.acuerdosIncumplidos)],
        [
          'Eficacia de acuerdos',
          `${ind.eficaciaAcuerdosPct}% (${ind.acuerdosCumplidos} de ${ind.acuerdosFormalizados} cumplido${ind.acuerdosCumplidos === 1 ? '' : 's'})`,
        ],
      ],
      [6500, 3706],
    ),

    heading('3. ALCANCE DE LA GESTIÓN'),
    heading('3.1 Acciones desarrolladas', HeadingLevel.HEADING_2),
    p('Las acciones desarrolladas comprendieron:'),
    ...informe.accionesDesarrolladas.map((a) => bullet(a)),
    heading('3.2 Canales utilizados', HeadingLevel.HEADING_2),
    buildTable(
      ['Canal', 'Uso'],
      informe.canales.map((c) => [c.canal, c.uso]),
      [4200, 6006],
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
      [3400, 4800, 2006],
    ),
    heading('4.2 Gestión diferenciada por perfil', HeadingLevel.HEADING_2),
    buildTable(
      ['Perfil', 'Acción aplicada', 'Frecuencia'],
      informe.perfilesGestion.map((pf) => [
        pf.perfil,
        pf.accion,
        pf.frecuencia,
      ]),
      [3200, 4500, 2506],
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
      [500, 2200, 1300, 1100, 1300, 900, 1400, 1506],
    ),

    heading('6. CLIENTES QUE REALIZARON PAGOS'),
    p(
      `Detalle de pagos aplicados en el período (${formatearMoneda(ind.montoRecuperado)} recuperados):`,
    ),
    buildPagosTable(informe),

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
      [3600, 2000, 1600, 3006],
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
      [5200, 2200, 2806],
    ),
    p(
      `Compromisos del equipo para ${informe.proximoPeriodoLabel.toLowerCase()}:`,
      { bold: true },
    ),
    ...n.compromisosProximoPeriodo.map((c) => bullet(c)),

    heading('10. CONCLUSIÓN GERENCIAL'),
    ...n.conclusion
      .split('\n')
      .filter(Boolean)
      .map((line) => p(line)),

    p(''),
    p('Atentamente,'),
    p(''),
    p('Equipo de Gestión de Cobranza', { bold: true }),
    p('TIC TAC', { color: NAVY, bold: true }),
  ];

  const doc = new Document({
    creator: 'FlowPay / TIC TAC',
    title: `Informe Gerencial ${informe.mandanteNombre} ${informe.periodo}`,
    description: `Informe de gestión de cobranza — ${informe.periodoLabel}`,
    sections: [
      {
        properties: {
          page: {
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
          },
        },
        children: buildCover(informe),
      },
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.85),
              bottom: convertInchesToTwip(1.05),
              left: convertInchesToTwip(0.7),
              right: convertInchesToTwip(0.7),
            },
          },
        },
        headers: {
          default: buildBodyHeader(imgs),
        },
        footers: {
          default: buildBodyFooter(imgs),
        },
        children: bodyChildren,
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
