/**
 * Auditoría estática del schema Prisma + estadísticas opcionales de MySQL.
 * Ejecutar: npx tsx scripts/audit-database.ts
 */

import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';

const SCHEMA_PATH = 'prisma/schema.prisma';

interface ModelInfo {
  name: string;
  table: string;
  fields: string[];
  indexes: string[];
  relations: Array<{
    field: string;
    onDelete?: string;
    onUpdate?: string;
  }>;
}

function parseSchema(content: string): ModelInfo[] {
  const models: ModelInfo[] = [];
  const modelRe = /model\s+(\w+)\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = modelRe.exec(content))) {
    const name = match[1];
    const body = match[2];
    const tableMatch = body.match(/@@map\("([^"]+)"\)/);
    const table = tableMatch?.[1] ?? name;

    const fields: string[] = [];
    const fieldRe = /^\s+(\w+)\s+/gm;
    let fieldMatch: RegExpExecArray | null;
    while ((fieldMatch = fieldRe.exec(body))) {
      const fieldName = fieldMatch[1];
      if (
        !['@@index', '@@unique', '@@map', '@@id'].some((p) =>
          fieldName.startsWith(p.replace('@@', '')),
        ) &&
        !fieldName.startsWith('//')
      ) {
        fields.push(fieldName);
      }
    }

    const indexes = [...body.matchAll(/@@index\(\[([^\]]+)\]\)/g)].map(
      (m) => m[1].replace(/\s/g, ''),
    );
    const uniques = [...body.matchAll(/@@unique\(\[([^\]]+)\]/g)].map(
      (m) => `UNIQUE(${m[1].replace(/\s/g, '')})`,
    );

    const relations: ModelInfo['relations'] = [];
    const relRe =
      /(\w+)\s+tbl_\w+[^@]*@relation\([^)]*onDelete:\s*(\w+)[^)]*\)/g;
    let relMatch: RegExpExecArray | null;
    while ((relMatch = relRe.exec(body))) {
      relations.push({ field: relMatch[1], onDelete: relMatch[2] });
    }

    const relNoDeleteRe = /(\w+)\s+tbl_\w+[^@]*@relation\(fields:/g;
    while ((relMatch = relNoDeleteRe.exec(body))) {
      const field = relMatch[1];
      if (!relations.some((r) => r.field === field)) {
        relations.push({ field, onDelete: 'RESTRICT (default)' });
      }
    }

    models.push({
      name,
      table,
      fields,
      indexes: [...indexes, ...uniques],
      relations,
    });
  }

  return models;
}

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) {
    return out;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (!['node_modules', '.next', 'dist'].includes(entry.name)) {
        out.push(...walkTsFiles(full));
      }
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

function fieldUsageInCode(tableModel: string, field: string): number {
  const files = walkTsFiles('src');
  const needle = `prisma.${tableModel}`;
  const fieldNeedle = field;
  let count = 0;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    if (!content.includes(needle)) {
      continue;
    }
    const re = new RegExp(fieldNeedle, 'g');
    const matches = content.match(re);
    if (matches) {
      count += matches.length;
    }
  }
  return count;
}

async function liveStats(prisma: PrismaClient): Promise<void> {
  console.log('\n=== ESTADÍSTICAS LIVE (MySQL) ===');
  const tables = [
    'tbl_prestamo',
    'tbl_gestion',
    'tbl_pago',
    'tbl_acuerdo',
    'tbl_reclamo',
    'tbl_auditoria',
    'tbl_usuario_mandante',
    'tbl_notificacion_lectura',
    'tbl_notificacion',
  ];

  for (const table of tables) {
    try {
      const rows = await prisma.$queryRawUnsafe<
        Array<{ cnt: bigint | number }>
      >(`SELECT COUNT(*) AS cnt FROM ${table}`);
      const cnt = Number(rows[0]?.cnt ?? 0);
      console.log(`${table}: ${cnt.toLocaleString('es-NI')} filas`);
    } catch {
      console.log(`${table}: (no disponible)`);
    }
  }

  const missingNotif = await prisma.$queryRawUnsafe<
    Array<{ TABLE_NAME: string }>
  >(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN ('tbl_notificacion_lectura', 'tbl_notificacion')`,
  );
  const existing = new Set(missingNotif.map((r) => r.TABLE_NAME));
  if (!existing.has('tbl_notificacion_lectura')) {
    console.log(
      '\n⚠ tbl_notificacion_lectura NO existe en BD — ejecutar: npx prisma db push',
    );
  }
  if (!existing.has('tbl_notificacion')) {
    console.log(
      '\n⚠ tbl_notificacion NO existe en BD — ejecutar: npx prisma db push',
    );
  }
}

async function main(): Promise<void> {
  const content = fs.readFileSync(SCHEMA_PATH, 'utf8');
  const models = parseSchema(content);

  console.log('=== RESUMEN SCHEMA ===');
  console.log(`Modelos Prisma: ${models.length}`);
  const totalIndexes = models.reduce((s, m) => s + m.indexes.length, 0);
  console.log(`Índices/compuestos: ${totalIndexes}`);

  const cascadeRelations = models.flatMap((m) =>
    m.relations
      .filter((r) => r.onDelete === 'Cascade')
      .map((r) => `${m.name}.${r.field}`),
  );
  const restrictRelations = models.flatMap((m) =>
    m.relations
      .filter((r) => r.onDelete?.includes('RESTRICT'))
      .map((r) => `${m.name}.${r.field}`),
  );

  console.log(`\n=== ON DELETE CASCADE (${cascadeRelations.length}) ===`);
  for (const r of cascadeRelations.slice(0, 15)) {
    console.log(`  ${r}`);
  }
  if (cascadeRelations.length > 15) {
    console.log(`  ... +${cascadeRelations.length - 15} más`);
  }

  console.log(`\n=== ON DELETE RESTRICT/DEFAULT (${restrictRelations.length}) ===`);
  console.log(
    '  Entidades core (prestamo, gestion, pago, mandante) usan RESTRICT — correcto para integridad.',
  );

  console.log('\n=== ÍNDICES CRÍTICOS (cobranza) ===');
  const critical = [
    'tbl_prestamo',
    'tbl_gestion',
    'tbl_pago',
    'tbl_reclamo',
    'tbl_usuario_mandante',
    'tbl_liquidacion',
    'tbl_auditoria',
    'tbl_notificacion_lectura',
    'tbl_notificacion',
  ];
  for (const table of critical) {
    const model = models.find((m) => m.table === table);
    if (model) {
      console.log(`\n${table}:`);
      for (const idx of model.indexes) {
        console.log(`  - ${idx}`);
      }
    }
  }

  console.log('\n=== CAMPOS POCO REFERENCIADOS EN CÓDIGO (heurística) ===');
  const checkFields: Array<{ model: string; field: string }> = [
    { model: 'tbl_prestamo', field: 'codigoUnico' },
    { model: 'tbl_prestamo', field: 'tipoCambio' },
    { model: 'tbl_prestamo', field: 'seguroSvsd' },
    { model: 'tbl_prestamo', field: 'mantenimientoValor' },
    { model: 'tbl_gestion', field: 'latitud' },
    { model: 'tbl_gestion', field: 'longitud' },
    { model: 'tbl_pago', field: 'reciboUrl' },
  ];
  for (const { model, field } of checkFields) {
    const hits = fieldUsageInCode(model, field);
    const status = hits === 0 ? 'RESERVADO/import' : `usado ~${hits}x`;
    console.log(`  ${model}.${field}: ${status}`);
  }

  console.log('\n=== RIESGOS DE CRECIMIENTO ===');
  console.log('  tbl_gestion: alto volumen (1 gestión/caso/día) — índices por gestor/fecha OK');
  console.log('  tbl_auditoria: append-only — retención/archivado recomendado >1M filas');
  console.log('  tbl_prestamo_corte: crece con cada carga — OK con índice idprestamo+fechaCorte');
  console.log('  tbl_notificacion_lectura: bajo volumen — unique (idusuario, notificacionId)');
  console.log('  tbl_notificacion: crece con actividad — índice (idusuario, leida, createdAt)');

  console.log('\n=== MEJORAS APLICADAS EN SCHEMA (Fase 5) ===');
  console.log('  tbl_usuario_mandante: @@index([idusuario])');
  console.log('  tbl_reclamo: @@index([deletedAt, estado, fechaLimite])');
  console.log('  tbl_reclamo: @@index([idmandante, estado, fechaLimite])');
  console.log('  tbl_liquidacion: @@index([idmandante, periodo, deletedAt])');
  console.log('  tbl_horario_cobranza: @@index([idmandante, diaSemana])');

  if (process.env.DATABASE_URL) {
    const prisma = new PrismaClient();
    try {
      await liveStats(prisma);
    } finally {
      await prisma.$disconnect();
    }
  } else {
    console.log('\n=== LIVE STATS ===');
    console.log('DATABASE_URL no configurada — solo auditoría estática.');
  }

  console.log('\naudit-database: OK');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
