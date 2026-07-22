# Portal developer — FlowPay API (I006 / I056)

Documentación para integradores. El contrato de producto es **REST OpenAPI v1**
(`/api/v1/...`). GraphQL (`/api/graphql`) es interno de la UI.

## OpenAPI

- Spec canónica: [openapi.yaml](./openapi.yaml)
- Runtime YAML: `GET /api/v1/openapi` (alias legacy: `GET /api/openapi`)
- Versionado: paths bajo `/api/v1`; breaking changes → `/api/v2`

## Autenticación

Sesión cookie (`auth-token`) tras `POST /api/auth/login`.  
REST de cobranza y GraphQL requieren usuario autenticado + CSRF en mutaciones
(`X-CSRF-Token` / cookie `flowpay-csrf`).

## Superficie pública v1

| Método | Path | Auth |
|--------|------|------|
| GET | `/api/v1/health` | No |
| GET | `/api/v1/ready` | No |
| GET | `/api/v1/openapi` | No |
| POST | `/api/v1/cobranza/importar` | Sí + CSRF |
| POST | `/api/v1/cobranza/importar/async` | Sí + CSRF |
| GET | `/api/v1/cobranza/importar/jobs/{id}` | Sí |

## GraphQL (interno UI)

- Endpoint: `POST /api/graphql`
- En producción:
  - Introspection **deshabilitada**
  - Solo `operationName` en allowlist del cliente oficial (`GRAPHQL_PERSISTED_ONLY`)
  - Límites: profundidad, campos, **costo ponderado** (`GRAPHQL_MAX_COST`)
  - Rate limit por IP, por usuario y por **usuario+operación**

Regenerar allowlist:

```bash
npm run graphql:persisted
```

## Webhooks HMAC (mandantes)

Configure en mandante (`updateMandante`): `webhookUrl` (HTTPS), `webhookSecret`, `webhookActivo`.

### Eventos

| Evento | Cuándo |
|--------|--------|
| `pago.creado` | Tras `createPago` |
| `importacion.completada` | Job de importación COMPLETADO |

### Firma

```
X-FlowPay-Timestamp: <unix>
X-FlowPay-Signature: sha256=<hmac_hex>
X-FlowPay-Event: <evento>
```

`HMAC_SHA256(secret, `${timestamp}.${rawBody}`)`  
Rechazar si `|now - timestamp| > 300s`.

Verificador de referencia: `verificarFirmaWebhook` en `src/lib/cobranza/webhook-mandante-service.ts`.

## Idempotency-Key

Header opcional (8–64, `[a-zA-Z0-9_-]`):

| Superficie | Scope |
|------------|--------|
| `POST /api/v1/cobranza/importar` (+ async) | usuario + key → mismo job |
| `createPago` (GraphQL) | gestor + key → mismo pago |
| `generarLiquidacion` (GraphQL) | mandante + key → misma liquidación |

`emitirLiquidacion` / `marcarLiquidacionPagada` son idempotentes de estado
(si ya está EMITIDA/PAGADA, no-op éxito).

## Errores REST

Contrato estable:

```json
{ "success": false, "error": "...", "code": "VALIDACION_ERROR" }
```

Los 5xx nunca incluyen stack ni SQL (`code: INTERNAL_ERROR` / `DATABASE_ERROR`).

## Deprecación GraphQL

Ver [GRAPHQL-DEPRECATION.md](./GRAPHQL-DEPRECATION.md).
