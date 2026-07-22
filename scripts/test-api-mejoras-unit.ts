import assert from 'node:assert/strict';
import { Kind, parse } from 'graphql';
import {
  estimateQueryCost,
  createMaxCostRule,
  GRAPHQL_MAX_COST_DEFAULT,
} from '@/lib/graphql/plugins/query-limits';
import {
  firmarWebhookPayload,
  verificarFirmaWebhook,
} from '@/lib/cobranza/webhook-mandante-service';
import {
  encodeCursor,
  decodeCursor,
  resolveCursorPagination,
  buildCursorPageMeta,
} from '@/lib/pagination/cursor-pagination';
import {
  parseIdempotencyKeyHeader,
  mensajeIdempotencyKeyInvalida,
} from '@/lib/api/idempotency-key';
import { extractOperationNameFromQuery } from '@/lib/graphql/plugins/persisted-queries';
import { PERSISTED_OPERATION_NAMES } from '@/lib/graphql/persisted-operations.generated';
import {
  CREATE_PAGO,
  GET_BANDEJA_COBRADOR,
  GET_PRESTAMOS,
} from '@/lib/graphql/queries/cobranza.queries';
import { GET_CLIENTES } from '@/lib/graphql/queries/cliente.queries';
import { isPersistedOperationAllowed } from '@/lib/graphql/plugins/persisted-queries';

function costOfQuery(query: string): number {
  const doc = parse(query);
  const op = doc.definitions.find((d) => d.kind === Kind.OPERATION_DEFINITION);
  assert.ok(op && op.kind === Kind.OPERATION_DEFINITION);
  return estimateQueryCost(op.selectionSet);
}

function testQueryCost(): void {
  const listDoc = parse(`
    query GetPrestamos {
      prestamos(pageSize: 50) {
        prestamos { idprestamo }
      }
    }
  `);
  const listOp = listDoc.definitions.find(
    (d) => d.kind === Kind.OPERATION_DEFINITION,
  );
  assert.ok(listOp && listOp.kind === Kind.OPERATION_DEFINITION);
  const listCost = estimateQueryCost(listOp.selectionSet, 10);
  // 1 + (1 + 1*1) * 50 = 101
  assert.equal(listCost, 101);

  const nestedDoc = parse(`
    query GetPrestamo {
      prestamo(id: 1) {
        idprestamo
        cliente { primer_nombres }
        mandante { nombre }
      }
    }
  `);
  const nestedOp = nestedDoc.definitions.find(
    (d) => d.kind === Kind.OPERATION_DEFINITION,
  );
  assert.ok(nestedOp && nestedOp.kind === Kind.OPERATION_DEFINITION);
  const nestedCost = estimateQueryCost(nestedOp.selectionSet, 10);
  // Sin args de lista: no multiplicar objetos anidados.
  // prestamo: 1 + id(1) + cliente(1+1) + mandante(1+1) = 6
  assert.equal(nestedCost, 6);
  assert.ok(nestedCost < GRAPHQL_MAX_COST_DEFAULT);
  assert.equal(typeof createMaxCostRule, 'function');

  for (const q of [GET_PRESTAMOS, GET_BANDEJA_COBRADOR, CREATE_PAGO, GET_CLIENTES]) {
    const doc = parse(q);
    const op = doc.definitions.find((d) => d.kind === Kind.OPERATION_DEFINITION);
    assert.ok(op && op.kind === Kind.OPERATION_DEFINITION);
    const name = op.name?.value ?? '';
    const cost = costOfQuery(q);
    assert.ok(
      cost <= GRAPHQL_MAX_COST_DEFAULT,
      `${name} cost ${cost} > ${GRAPHQL_MAX_COST_DEFAULT}`,
    );
    assert.equal(isPersistedOperationAllowed(name), true);
  }
}

function testWebhookHmac(): void {
  const secret = 'test-secret-min-16chars';
  const body = JSON.stringify({ event: 'pago.creado', id: 1 });
  const ts = Math.floor(Date.now() / 1000);
  const sig = firmarWebhookPayload(secret, ts, body);
  assert.ok(sig.startsWith('sha256='));
  assert.equal(
    verificarFirmaWebhook({
      secret,
      timestamp: ts,
      rawBody: body,
      signatureHeader: sig,
    }),
    true,
  );
  assert.equal(
    verificarFirmaWebhook({
      secret,
      timestamp: ts,
      rawBody: body,
      signatureHeader: 'sha256=deadbeef',
    }),
    false,
  );
}

function testCursor(): void {
  const c = encodeCursor(42);
  assert.equal(decodeCursor(c), 42);
  assert.equal(decodeCursor('nope'), null);
  const p = resolveCursorPagination(c, 25);
  assert.equal(p.afterId, 42);
  assert.equal(p.take, 25);
  const { items, meta } = buildCursorPageMeta(
    [
      { idprestamo: 1 },
      { idprestamo: 2 },
      { idprestamo: 3 },
    ],
    2,
    (r) => r.idprestamo,
  );
  assert.equal(items.length, 2);
  assert.equal(meta.hasNextPage, true);
  assert.ok(meta.nextCursor);
}

function testIdempotencyKey(): void {
  assert.equal(parseIdempotencyKeyHeader('abc'), undefined);
  assert.equal(parseIdempotencyKeyHeader('import-job-001'), 'import-job-001');
  assert.ok(mensajeIdempotencyKeyInvalida().includes('Idempotency-Key'));
}

function testPersistedOps(): void {
  assert.ok(PERSISTED_OPERATION_NAMES.includes('CreatePago'));
  assert.equal(
    extractOperationNameFromQuery('query GetPrestamos { prestamos { idprestamo } }'),
    'GetPrestamos',
  );
}

testQueryCost();
testWebhookHmac();
testCursor();
testIdempotencyKey();
testPersistedOps();
console.warn('api-mejoras unit: OK');
