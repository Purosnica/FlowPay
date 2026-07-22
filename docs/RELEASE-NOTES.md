# Release Notes — FlowPay

## v1.2.9 — Performance PERF I106–I119 (2026-07-22)

- **I106:** KPIs de reportes leen `tbl_resumen_diario_cobranza` (híbrido: cartera/recuperación materializada + operativos live)
- **I107:** `NEXT_PUBLIC_ASSET_PREFIX` opcional + Cache-Control immutable en `/_next/static`
- **I109:** Lazy ApexCharts enforced (audit sin imports directos)
- **I110:** `ClienteTable` reutiliza `DataTable` virtualizado
- **I111:** `createBatchLoader` cableado (`Pago.gestorNombre` + loaders por request)
- **I112:** límites candidatos bandeja/Mi día en config operativa (UI + GraphQL)
- **I114/I117/I119:** profiling mora, shard imports, Prisma `$connect` (confirmados)
- **I116:** `GestionForm` global consume `/api/catalogos/tipificaciones` con ETag/304

## v1.2.8 — Arquitectura ARCH I001–I014 sin costos (2026-07-22)

- **I001:** workers Node `npm run worker:cron` / `worker:queue` (cron HTTP Vercel queda como fallback)
- **I002:** cola MySQL con backpressure (`enqueueImport`, 429 `QUEUE_BACKPRESSURE`); sin Redis/SQS/BullMQ
- **I003/I004:** diferidos (S3 y réplica MySQL generan costo) — ver ROADMAP PP-2 / SC-1
- **I005:** barrels bounded contexts `src/lib/contexts/{cartera,gestion,liquidacion}`
- **I007:** outbox `tbl_domain_event` + `publishDomainEvent` / `drainDomainEvents` (webhooks vía bus)
- **I008:** ADR row-level + `src/lib/tenancy/tenant-isolation.ts` (schema isolation = SC-3)
- **I010:** `docs/ARCHITECTURE-C4.md` (incluye digest cron y workers)
- **I011:** circuit breaker SMTP y Sentry
- **I012:** `tbl_feature_flag` + `isFeatureEnabled` (`pwa_offline_gestiones`, `event_bus_webhooks`)
- **I013:** `CobradorShell` en Mi día / Bandeja (sin sidebar gerencial)
- **I014:** versionado inmutable plantillas import (`contratoId`, `version`, `mapeoHash`)

## v1.2.7 — API pública v1 + idempotency liquidación (2026-07-22)

- **I006 / SC-5:** superficie REST versionada `/api/v1` (health, ready, openapi, imports) + OpenAPI actualizado
- Portal developer: GraphQL = interno UI; producto integradores = REST v1
- **I015:** `idempotencyKey` en `tbl_liquidacion` + `generarLiquidacion`; emitir/marcar pagada idempotentes de estado
- OpenAPI/health/ready públicos sin sesión
- **I016:** solo bcrypt; eliminada columna `password` legacy
- **I017:** Zod en mutations GraphQL restantes (inteligencia, metas, deletes, asignaciones)
- **I036:** PWA cola gestiones offline + `idempotencyKey` en `tbl_gestion`
- **I037:** Hub reportes consolidado (sidebar único)
- **I039:** PermissionGate en paneles mandante/config/equipo/centro-inteligencia
- **I072:** `tbl_pago.folio` generado (`FP-########`) con UNIQUE en BD; expuesto en GraphQL `Pago`

## v1.2.6 — API hardening I051–I060 (2026-07-21)

- CI/security audit: introspection gated a `NODE_ENV=production` (G-2b)
- GraphQL costo ponderado por listas (`GRAPHQL_MAX_COST`) además de depth/fields
- Persisted operations allowlist en prod (`GRAPHQL_PERSISTED_ONLY`, `npm run graphql:persisted`)
- Webhooks HMAC a mandantes (`pago.creado`, `importacion.completada`)
- Rate limit GraphQL por usuario + `operationName`
- OpenAPI + portal developer (`docs/API-DEVELOPER.md`, `GET /api/openapi`)
- Cursor pagination en `prestamos` (`cursor` / `nextCursor` / `hasNextPage`)
- Política de deprecación GraphQL (`docs/GRAPHQL-DEPRECATION.md`)
- `Idempotency-Key` en imports REST
- Contrato de errores REST estable sin leak interno en 5xx

## v1.2.5 — MFA TOTP + hardening (2026-07-21)

- MFA TOTP para ADMIN/GERENTE (setup en Perfil, paso en login, secreto cifrado AES-GCM)
- Rate-limit GraphQL también por `userId` (además de IP)
- `PermissionGate` en comprobante de pago
- Dependabot semanal + `npm audit` en CI (informativo)

## v1.2.4 — Ops, sesión idle, health (2026-07-21)

- Migración `idempotencyKey` aplicada en BD (baseline resuelto + deploy)
- `/api/health` (liveness) y `/api/ready` (MySQL)
- Idle de sesión 30 min (`SESSION_IDLE_SECONDS`) + aviso UX; refresh `lastActivityAt` en middleware
- Runbook backup/DR: `docs/BACKUP-DR.md`
- Playwright E2E base (`e2e/login.spec.ts`)
- `TRUST_PROXY` / `SESSION_IDLE_SECONDS` en `env.ts` y `.env.example`

## v1.2.3 — Hardening sin costos externos (2026-07-21)

- Scope cobrador en descarga de documentos por cliente
- IP rate-limit solo con `TRUST_PROXY=true` (deja de confiar en X-Real-IP spoofable)
- Límites GraphQL de profundidad/campos (sin deps de pago)
- Idempotencia de pagos (`idempotencyKey`) + medios de pago normalizados
- PermissionGate en pagos / importar / asignación
- CI GitHub Actions (lint, tsc, unit/qa, audits)
- Docs: cron import alineado, 46 permisos, digest email, credenciales seed fuera de guías
- Eliminada dependencia `mssql` no usada
- Alertas SMTP si cron maestro ERROR/PARCIAL/TIMEOUT
- Hub de reportes + PermissionGate ampliado

---

## v1.2.2 — Enterprise Readiness (2026-07-07)

Release de consolidación: seguridad, performance, escalabilidad, QA, UAT y documentación oficial.

---

### Seguridad (Fase 8)

- Sesión solo por cookie HTTP-only; JWT 8h; token eliminado de respuestas JSON
- CSRF: header `x-flowpay-request` + cookie double-submit `flowpay-csrf` / `x-flowpay-csrf`
- GraphQL: introspection deshabilitada en producción
- Cron: autenticación exclusiva Bearer (`CRON_SECRET`)
- Rate limit de login por email (distribuido en prod vía `tbl_rate_limit`)
- Scope mandante reforzado en resolvers de contacto deudor

### Performance (Fase 9)

- Límites de candidatos en bandeja (500) y Mi día (200)
- Batch en secuencias de contacto (elimina N+1)
- Reporte cobranza con aggregates
- Paginación GraphQL estandarizada (`resolvePagination`)
- Índices: `tbl_gestion` (fechas), `tbl_pago` (mandante/fecha)

### Escalabilidad (Fase 10)

- Prisma singleton en producción
- Rate limit distribuido en MySQL
- Cron con advisory lock multi-instancia
- Importación async por defecto + cron diario 07:00 (+ on-demand al subir)
- Retención automática de auditoría y ejecuciones cron
- Variables: `IMPORT_MAX_*`, `AUDIT_RETENTION_DAYS`

### QA y UAT (Fases 11–12)

- `npm run qa:gate` — orquesta audits fases 4–10 + tests
- `npm run test:qa` — tests unitarios de módulos críticos
- `npm run test:uat` — matriz RBAC automatizada
- `docs/UAT-COBRANZA.md` — escenarios por rol

### Documentación (Fase 13)

- Manuales: funcional, cobrador, supervisor, administrador, mandante
- Catálogos: KPIs, permisos, reglas de negocio, procesos
- Roadmap, matriz de trazabilidad, índice en `docs/README.md`
- `npm run audit:docs`

---

### Migración / deploy

```bash
npm install
npx prisma db push    # índices + tbl_rate_limit
npm run db:seed       # entornos nuevos
npm run qa:gate
```

Variables nuevas/requeridas en producción:

- `JWT_SECRET` (≥32 chars)
- `CRON_SECRET` (≥16 chars)

---

### Usuarios demo

Solo para entorno local vía `npm run db:seed`. Las contraseñas se imprimen
en consola al sembrar; **no** se documentan aquí. En staging/producción
rotar o eliminar esas cuentas.

---

## v1.2.x — Evolución funcional previa

- Módulo de cobranza consolidado (bandeja, Mi día, centro inteligencia)
- RBAC 18 permisos con presets por rol
- Cron orquestado de operaciones diarias
- Importación de cartera con plantillas por mandante
- Gamificación y metas por mandante

---

## Próxima versión planificada

**v1.3.0** — Pre-producción: migraciones formales, object storage, observabilidad.  
Ver [ROADMAP.md](./ROADMAP.md).
