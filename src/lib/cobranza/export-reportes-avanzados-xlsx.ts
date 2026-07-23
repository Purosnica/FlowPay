import type {
  ReporteClienteObligaciones,
  ReporteComisionesVsProyeccion,
  ReporteConcentracionRiesgo,
  ReporteCumplimientoMetas,
  ReporteCuotasVencidas,
  ReporteIngresoTramoMora,
  ReporteMargenMandantes,
  ReporteMigracionMora,
  ReporteProductividadDiaria,
  ReportePromesasPago,
  ReporteReclamosSla,
  ReporteRecontactos,
  ReporteSupervisorEquipo,
} from '@/types/cobranza';
import {
  downloadWorkbook,
  XLSX_FMT,
  type ExcelMetaRow,
} from '@/lib/cobranza/export-xlsx-utils';

function metaMandante(
  mandanteNombre: string,
  extra: ExcelMetaRow[] = [],
): ExcelMetaRow[] {
  return [{ label: 'Mandante', value: mandanteNombre }, ...extra];
}

export function exportReporteMargenMandantesXlsx(
  reporte: ReporteMargenMandantes,
): void {
  downloadWorkbook(
    [
      {
        name: 'Resumen',
        title: 'Margen por mandante',
        meta: [
          { label: 'Periodo', value: reporte.periodo },
          { label: 'Recuperado', value: reporte.totalRecuperado },
          { label: 'Ingreso empresa', value: reporte.totalIngresoEmpresa },
          { label: 'Comisiones', value: reporte.totalComision },
          { label: 'Ganancia neta', value: reporte.gananciaNeta },
          { label: 'Margen %', value: reporte.margenPct },
        ]
      },
      {
        name: 'Por mandante',
        title: 'Detalle por mandante',
        columns: [
          { header: 'Código', width: 12 },
          { header: 'Mandante', width: 28 },
          { header: 'Pagos', width: 10, numFmt: XLSX_FMT.integer },
          { header: 'Recuperado', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Ingreso', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Comisión', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Ganancia neta', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Margen %', width: 12, numFmt: XLSX_FMT.percent },
        ],
        rows: reporte.porMandante.map((m) => [
          m.mandanteCodigo,
          m.mandanteNombre,
          m.cantidadPagos,
          m.totalRecuperado,
          m.totalIngresoEmpresa,
          m.totalComision,
          m.gananciaNeta,
          m.margenPct,
        ]),
      },
    ],
    `reporte-margen-mandantes-${reporte.periodo}`,
  );
}

export function exportReporteComisionesVsProyeccionXlsx(
  reporte: ReporteComisionesVsProyeccion,
): void {
  downloadWorkbook(
    [
      {
        name: 'Comparativo',
        title: 'Comisiones vs proyección',
        meta: metaMandante(reporte.mandanteNombre, [
          { label: 'Periodo', value: reporte.periodo },
          { label: 'Estado liquidación', value: reporte.liquidacionEstado ?? '' },
          { label: 'Id liquidación', value: reporte.idliquidacion ?? '' },
        ]),
        columns: [
          { header: 'Concepto', width: 28 },
          { header: 'Proyectado', width: 16, numFmt: XLSX_FMT.money },
          { header: 'Liquidado', width: 16, numFmt: XLSX_FMT.money },
          { header: 'Diferencial', width: 16, numFmt: XLSX_FMT.money },
        ],
        rows: [
          [
            'Recuperado',
            reporte.proyectadoRecuperado,
            reporte.liquidadoRecuperado,
            reporte.diferencialRecuperado,
          ],
          [
            'Comisión',
            reporte.proyectadoComision,
            reporte.liquidadoComision,
            reporte.diferencialComision,
          ],
          [
            'Ingreso empresa (proy.)',
            reporte.proyectadoIngresoEmpresa,
            '',
            '',
          ],
          [
            'Pagos proyectados',
            reporte.proyectadoPagos,
            '',
            '',
          ],
          [
            '% liquidado vs proyectado',
            reporte.pctLiquidadoVsProyectado,
            '',
            '',
          ],
        ],
      },
    ],
    `reporte-comisiones-vs-proyeccion-${reporte.periodo}`,
  );
}

export function exportReporteIngresoTramoMoraXlsx(
  reporte: ReporteIngresoTramoMora,
): void {
  downloadWorkbook(
    [
      {
        name: 'Resumen',
        title: 'Ingreso por tramo de mora',
        meta: metaMandante(reporte.mandanteNombre, [
          { label: 'Periodo', value: reporte.periodo },
          { label: 'Ingreso empresa', value: reporte.totalIngresoEmpresa },
          { label: 'Comisiones', value: reporte.totalComision },
          { label: 'Ganancia neta', value: reporte.gananciaNeta },
        ])
      },
      {
        name: 'Por tramo',
        title: 'Detalle por tramo',
        columns: [
          { header: 'Tramo', width: 18 },
          { header: 'Pagos', width: 10, numFmt: XLSX_FMT.integer },
          { header: 'Recuperado', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Ingreso', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Comisión', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Ganancia neta', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Margen %', width: 12, numFmt: XLSX_FMT.percent },
          { header: 'Share ingreso %', width: 14, numFmt: XLSX_FMT.percent },
        ],
        rows: reporte.porTramo.map((t) => [
          t.tramo,
          t.cantidadPagos,
          t.totalRecuperado,
          t.totalIngresoEmpresa,
          t.totalComision,
          t.gananciaNeta,
          t.margenPct,
          t.shareIngresoPct,
        ]),
      },
    ],
    `reporte-ingreso-tramo-mora-${reporte.periodo}`,
  );
}

export function exportReportePromesasPagoXlsx(
  reporte: ReportePromesasPago,
): void {
  downloadWorkbook(
    [
      {
        name: 'Resumen',
        title: 'Promesas de pago',
        meta: metaMandante(reporte.mandanteNombre, [
          { label: 'Periodo', value: reporte.periodo },
          { label: 'Total promesas', value: reporte.totalPromesas },
          { label: 'Cumplidas', value: reporte.cumplidas },
          { label: 'Vencidas', value: reporte.vencidas },
          { label: 'Pendientes', value: reporte.pendientes },
          { label: 'Cumplimiento %', value: reporte.cumplimientoPct },
          { label: 'Monto prometido', value: reporte.montoPrometido },
          { label: 'Monto cumplido', value: reporte.montoCumplido },
        ])
      },
      {
        name: 'Promesas',
        title: 'Detalle de promesas',
        columns: [
          { header: 'Id gestión', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Préstamo', width: 14 },
          { header: 'Cliente', width: 28 },
          { header: 'Gestor', width: 24 },
          { header: 'Monto', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Fecha', width: 12 },
          { header: 'Estado', width: 12 },
          { header: 'Días vencidos', width: 14, numFmt: XLSX_FMT.integer },
        ],
        rows: reporte.promesas.map((p) => [
          p.idgestion,
          p.noPrestamo,
          p.nombreCliente,
          p.nombreGestor ?? '',
          p.montoPromesa,
          p.fechaPromesa,
          p.estado,
          p.diasVencidos ?? '',
        ]),
      },
    ],
    `reporte-promesas-pago-${reporte.periodo}`,
  );
}

export function exportReporteProductividadDiariaXlsx(
  reporte: ReporteProductividadDiaria,
): void {
  downloadWorkbook(
    [
      {
        name: 'Resumen',
        title: 'Productividad diaria',
        meta: metaMandante(reporte.mandanteNombre, [
          { label: 'Periodo', value: reporte.periodo },
          { label: 'Total gestiones', value: reporte.totalGestiones },
          { label: 'Promedio gestiones/día', value: reporte.promedioGestionesDia },
        ])
      },
      {
        name: 'Por gestor',
        title: 'Resumen por gestor',
        columns: [
          { header: 'Gestor', width: 28 },
          { header: 'Días activos', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Gestiones', width: 12, numFmt: XLSX_FMT.integer },
          {
            header: 'Promedio/día',
            width: 12,
            numFmt: '0.00',
          },
          { header: 'Recuperado', width: 14, numFmt: XLSX_FMT.money },
        ],
        rows: reporte.porGestor.map((g) => [
          g.nombreGestor,
          g.diasActivos,
          g.totalGestiones,
          g.promedioGestionesDia,
          g.totalRecuperado,
        ]),
      },
      {
        name: 'Por día',
        title: 'Detalle diario',
        columns: [
          { header: 'Fecha', width: 12 },
          { header: 'Gestor', width: 28 },
          { header: 'Gestiones', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Efectivas', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Recuperado', width: 14, numFmt: XLSX_FMT.money },
        ],
        rows: reporte.porDia.map((d) => [
          d.fecha,
          d.nombreGestor,
          d.gestiones,
          d.gestionesEfectivas,
          d.montoRecuperado,
        ]),
      },
    ],
    `reporte-productividad-diaria-${reporte.periodo}`,
  );
}

export function exportReporteRecontactosXlsx(
  reporte: ReporteRecontactos,
): void {
  downloadWorkbook(
    [
      {
        name: 'Resumen',
        title: 'Recontactos sin pago',
        meta: metaMandante(reporte.mandanteNombre, [
          { label: 'Periodo', value: reporte.periodo },
          { label: 'Mín. gestiones', value: reporte.minGestiones },
          { label: 'Préstamos', value: reporte.totalPrestamos },
          { label: 'Saldo', value: reporte.saldoTotal },
        ])
      },
      {
        name: 'Préstamos',
        title: 'Detalle de recontactos',
        columns: [
          { header: 'Préstamo', width: 14 },
          { header: 'Cliente', width: 28 },
          { header: 'Gestor', width: 24 },
          { header: 'Gestiones', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Días mora', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Saldo', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Última gestión', width: 14 },
        ],
        rows: reporte.prestamos.map((p) => [
          p.noPrestamo,
          p.nombreCliente,
          p.nombreGestor ?? '',
          p.gestionesPeriodo,
          p.diasMora,
          p.saldoTotal,
          p.ultimaGestion ?? '',
        ]),
      },
    ],
    `reporte-recontactos-${reporte.periodo}`,
  );
}

export function exportReporteReclamosSlaXlsx(
  reporte: ReporteReclamosSla,
): void {
  downloadWorkbook(
    [
      {
        name: 'Resumen',
        title: 'SLA de reclamos',
        meta: metaMandante(reporte.mandanteNombre, [
          { label: 'Total reclamos', value: reporte.totalReclamos },
          { label: 'Abiertos', value: reporte.abiertos },
          { label: 'En proceso', value: reporte.enProceso },
          { label: 'Resueltos', value: reporte.resueltos },
          { label: 'Fuera de SLA', value: reporte.fueraSla },
          { label: '% fuera SLA', value: reporte.pctFueraSla },
        ])
      },
      {
        name: 'Reclamos',
        title: 'Detalle de reclamos',
        columns: [
          { header: 'Id', width: 10, numFmt: XLSX_FMT.integer },
          { header: 'Estado', width: 12 },
          { header: 'Descripción', width: 36 },
          { header: 'Fecha límite', width: 14 },
          { header: 'Creado', width: 14 },
          { header: 'Fuera SLA', width: 12 },
          { header: 'Días fuera', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Préstamo', width: 14 },
          { header: 'Cliente', width: 28 },
        ],
        rows: reporte.reclamos.map((r) => [
          r.idreclamo,
          r.estado,
          r.descripcion,
          r.fechaLimite,
          r.createdAt,
          r.fueraSla ? 'Sí' : 'No',
          r.diasFueraSla ?? '',
          r.noPrestamo ?? '',
          r.nombreCliente,
        ]),
      },
    ],
    `reporte-reclamos-sla-${reporte.mandanteCodigo}`,
  );
}

export function exportReporteMigracionMoraXlsx(
  reporte: ReporteMigracionMora,
): void {
  downloadWorkbook(
    [
      {
        name: 'Resumen',
        title: 'Migración de mora',
        meta: metaMandante(reporte.mandanteNombre, [
          { label: 'Periodo', value: reporte.periodo },
          { label: 'Fecha origen', value: reporte.fechaOrigen },
          { label: 'Fecha destino', value: reporte.fechaDestino },
          { label: 'Total préstamos', value: reporte.totalPrestamos },
        ])
      },
      {
        name: 'Migraciones',
        title: 'Detalle de migraciones',
        columns: [
          { header: 'Tramo origen', width: 16 },
          { header: 'Tramo destino', width: 16 },
          { header: 'Cantidad', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Saldo destino', width: 14, numFmt: XLSX_FMT.money },
          { header: '%', width: 10, numFmt: XLSX_FMT.percent },
        ],
        rows: reporte.migraciones.map((m) => [
          m.tramoOrigen,
          m.tramoDestino,
          m.cantidad,
          m.saldoDestino,
          m.pct,
        ]),
      },
    ],
    `reporte-migracion-mora-${reporte.periodo}`,
  );
}

export function exportReporteConcentracionRiesgoXlsx(
  reporte: ReporteConcentracionRiesgo,
): void {
  downloadWorkbook(
    [
      {
        name: 'Resumen',
        title: 'Concentración de riesgo',
        meta: metaMandante(reporte.mandanteNombre, [
          { label: 'Saldo mora total', value: reporte.saldoMoraTotal },
        ])
      },
      {
        name: 'Top deudores',
        title: 'Top deudores',
        columns: [
          { header: 'Nombre', width: 28 },
          { header: 'Préstamos', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Saldo mora', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Share %', width: 12, numFmt: XLSX_FMT.percent },
        ],
        rows: reporte.topDeudores.map((d) => [
          d.nombre,
          d.cantidadPrestamos,
          d.saldoMora,
          d.shareSaldoPct,
        ]),
      },
      {
        name: 'Top gestores',
        title: 'Top gestores',
        columns: [
          { header: 'Nombre', width: 28 },
          { header: 'Préstamos', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Saldo mora', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Share %', width: 12, numFmt: XLSX_FMT.percent },
        ],
        rows: reporte.topGestores.map((g) => [
          g.nombre,
          g.cantidadPrestamos,
          g.saldoMora,
          g.shareSaldoPct,
        ]),
      },
    ],
    `reporte-concentracion-riesgo-${reporte.mandanteCodigo}`,
  );
}

export function exportReporteCuotasVencidasXlsx(
  reporte: ReporteCuotasVencidas,
): void {
  downloadWorkbook(
    [
      {
        name: 'Resumen',
        title: 'Cuotas vencidas',
        meta: metaMandante(reporte.mandanteNombre, [
          { label: 'Total cuotas', value: reporte.totalCuotas },
          { label: 'Monto total', value: reporte.montoTotal },
        ])
      },
      {
        name: 'Cuotas',
        title: 'Detalle de cuotas vencidas',
        columns: [
          { header: 'Id cuota', width: 10, numFmt: XLSX_FMT.integer },
          { header: 'Acuerdo', width: 10, numFmt: XLSX_FMT.integer },
          { header: 'Préstamo', width: 14 },
          { header: 'Cliente', width: 28 },
          { header: 'Gestor', width: 24 },
          { header: 'N° cuota', width: 10, numFmt: XLSX_FMT.integer },
          { header: 'Monto', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Vencimiento', width: 14 },
          { header: 'Días vencidos', width: 14, numFmt: XLSX_FMT.integer },
          { header: 'Estado acuerdo', width: 14 },
        ],
        rows: reporte.cuotas.map((c) => [
          c.idcuota,
          c.idacuerdo,
          c.noPrestamo,
          c.nombreCliente,
          c.nombreGestor ?? '',
          c.numeroCuota,
          c.montoCuota,
          c.fechaVencimiento,
          c.diasVencidos,
          c.estadoAcuerdo,
        ]),
      },
    ],
    `reporte-cuotas-vencidas-${reporte.mandanteCodigo}`,
  );
}

export function exportReporteCumplimientoMetasXlsx(
  reporte: ReporteCumplimientoMetas,
): void {
  downloadWorkbook(
    [
      {
        name: 'Resumen',
        title: 'Cumplimiento de metas',
        meta: metaMandante(reporte.mandanteNombre, [
          { label: 'Periodo', value: reporte.periodo },
          {
            label: 'Meta recuperación mandante',
            value: reporte.metaRecuperacionMandante,
          },
          {
            label: 'Recuperado mandante',
            value: reporte.recuperadoMandante,
          },
          { label: '% meta mandante', value: reporte.pctMetaMandante },
        ])
      },
      {
        name: 'Cobradores',
        title: 'Metas por cobrador',
        columns: [
          { header: 'Gestor', width: 28 },
          { header: 'Meta recuperación', width: 16, numFmt: XLSX_FMT.money },
          { header: 'Recuperado', width: 14, numFmt: XLSX_FMT.money },
          { header: '% meta recuperación', width: 16, numFmt: XLSX_FMT.percent },
          {
            header: 'Meta gestiones',
            width: 14,
            numFmt: XLSX_FMT.integer,
          },
          { header: 'Gestiones', width: 12, numFmt: XLSX_FMT.integer },
          { header: '% meta gestiones', width: 14, numFmt: XLSX_FMT.percent },
          { header: 'Meta rec. cumplida', width: 16 },
          { header: 'Meta gest. cumplida', width: 16 },
        ],
        rows: reporte.cobradores.map((c) => [
          c.nombre,
          c.metaRecuperacionMes,
          c.recuperadoMes,
          c.pctMetaRecuperacion,
          c.metaGestionesSemana,
          c.gestionesSemana,
          c.pctMetaGestiones,
          c.metaRecuperacionCumplida ? 'Sí' : 'No',
          c.metaGestionesCumplida ? 'Sí' : 'No',
        ]),
      },
    ],
    `reporte-cumplimiento-metas-${reporte.periodo}`,
  );
}

export function exportReporteSupervisorEquipoXlsx(
  reporte: ReporteSupervisorEquipo,
): void {
  downloadWorkbook(
    [
      {
        name: 'Resumen',
        title: 'Supervisor vs equipo',
        meta: metaMandante(reporte.mandanteNombre, [
          { label: 'Periodo', value: reporte.periodo },
          { label: 'Cobradores', value: reporte.totalCobradores },
          { label: 'Promedio recuperado', value: reporte.promedioRecuperado },
          {
            label: 'Promedio efectividad %',
            value: reporte.promedioEfectividad,
          },
          { label: 'Total recuperado', value: reporte.totalRecuperado },
        ])
      },
      {
        name: 'Ranking',
        title: 'Ranking del equipo',
        columns: [
          { header: 'Gestor', width: 28 },
          { header: 'Gestiones', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Efectivas', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Efectividad %', width: 14, numFmt: XLSX_FMT.percent },
          { header: 'Recuperado', width: 14, numFmt: XLSX_FMT.money },
          {
            header: 'Brecha vs avg recuperado',
            width: 18,
            numFmt: XLSX_FMT.money,
          },
          {
            header: 'Brecha vs avg efectividad',
            width: 18,
            numFmt: XLSX_FMT.percent,
          },
        ],
        rows: reporte.ranking.map((r) => [
          r.nombre,
          r.gestiones,
          r.gestionesEfectivas,
          r.efectividadPct,
          r.montoRecuperado,
          r.brechaVsPromedioRecuperado,
          r.brechaVsPromedioEfectividad,
        ]),
      },
    ],
    `reporte-supervisor-equipo-${reporte.periodo}`,
  );
}

export function exportReporteClienteObligacionesXlsx(
  reporte: ReporteClienteObligaciones,
): void {
  downloadWorkbook(
    [
      {
        name: 'Resumen',
        title: 'Cliente obligaciones por mandante',
        meta: [
          { label: 'Mín. mandantes (N)', value: reporte.minMandantes },
          { label: 'Clientes', value: reporte.totalClientes },
          {
            label: 'Multi-mandante (≥2)',
            value: reporte.clientesMultiMandante,
          },
          { label: 'Préstamos', value: reporte.totalPrestamos },
          { label: 'Saldo total', value: reporte.totalSaldo },
        ],
      },
      {
        name: 'Clientes',
        title: 'Clientes con obligaciones',
        columns: [
          { header: 'Documento', width: 16 },
          { header: 'Cliente', width: 32 },
          { header: 'Mandantes con deuda', width: 16, numFmt: XLSX_FMT.integer },
          { header: 'Préstamos', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Saldo', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Máx. días mora', width: 14, numFmt: XLSX_FMT.integer },
          { header: 'Mandantes', width: 40 },
        ],
        rows: reporte.clientes.map((c) => [
          c.numerodocumento,
          c.nombreCliente,
          c.cantidadMandantesConDeuda,
          c.cantidadPrestamos,
          c.saldoTotal,
          c.maxDiasMora,
          c.mandantes.map((m) => m.mandanteNombre).join(', '),
        ]),
      },
      {
        name: 'Por mandante',
        title: 'Deuda por cliente y mandante',
        columns: [
          { header: 'Documento', width: 16 },
          { header: 'Cliente', width: 32 },
          { header: 'Mandante', width: 24 },
          { header: 'Código', width: 12 },
          { header: 'Préstamos', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Saldo', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Máx. días mora', width: 14, numFmt: XLSX_FMT.integer },
        ],
        rows: reporte.clientes.flatMap((c) =>
          c.mandantes.map((m) => [
            c.numerodocumento,
            c.nombreCliente,
            m.mandanteNombre,
            m.mandanteCodigo,
            m.cantidadPrestamos,
            m.saldoTotal,
            m.maxDiasMora,
          ]),
        ),
      },
      {
        name: 'Obligaciones',
        title: 'Detalle de obligaciones',
        columns: [
          { header: 'Documento', width: 16 },
          { header: 'Cliente', width: 32 },
          { header: 'Préstamo', width: 14 },
          { header: 'Mandante', width: 24 },
          { header: 'Estado', width: 12 },
          { header: 'Saldo', width: 14, numFmt: XLSX_FMT.money },
          { header: 'Días mora', width: 12, numFmt: XLSX_FMT.integer },
          { header: 'Moneda', width: 10 },
        ],
        rows: reporte.clientes.flatMap((c) =>
          c.obligaciones.map((o) => [
            c.numerodocumento,
            c.nombreCliente,
            o.noPrestamo,
            o.mandanteNombre,
            o.estado,
            o.saldoTotal,
            o.diasMora,
            o.moneda,
          ]),
        ),
      },
    ],
    `reporte-cliente-obligaciones-n${reporte.minMandantes}`,
  );
}
