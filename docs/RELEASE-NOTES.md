# Release Notes — FlowPay

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
