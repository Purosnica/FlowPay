# Portal developer — FlowPay API (I056)

Documentación para integradores (REST + webhooks + GraphQL).

## OpenAPI

- Spec: [openapi.yaml](./openapi.yaml)
- Runtime JSON: `GET /api/openapi`

## Autenticación

Sesión cookie (`flowpay_token`) tras `POST /api/auth/login`.  
GraphQL y REST de cobranza requieren usuario autenticado + CSRF en mutaciones.

## GraphQL

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

## Idempotency-Key (imports)

Header opcional en:

- `POST /api/cobranza/importar`
- `POST /api/cobranza/importar/async`

Mismo usuario + misma key → retorna el job existente (no duplica).

## Errores REST

Contrato estable:

```json
{ "success": false, "error": "...", "code": "VALIDACION_ERROR" }
```

Los 5xx nunca incluyen stack ni SQL (`code: INTERNAL_ERROR` / `DATABASE_ERROR`).

## Deprecación GraphQL

Ver [GRAPHQL-DEPRECATION.md](./GRAPHQL-DEPRECATION.md).
