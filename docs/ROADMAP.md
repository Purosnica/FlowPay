# Roadmap — FlowPay

Evolución planificada post-preparación Enterprise (Fases 1–13).

**Estado actual:** v1.2.2 — producto listo para UAT y despliegue controlado.

---

## Completado (Fases 1–13)

| Fase | Entregable |
|------|------------|
| 1–3 | P0/P1/P2 funcionales (mora, timeline, dashboards, metas, etc.) |
| 4 | Auditoría código — duplicados, código muerto |
| 5 | Auditoría BD — índices, integridad |
| 6 | Auditoría GraphQL — N+1, paginación, permisos |
| 7 | Auditoría frontend — PermissionGate, AsyncPanel |
| 8 | Seguridad — CSRF, cookie-only, cron Bearer, rate limit |
| 9 | Performance — límites candidatos, índices, aggregates |
| 10 | Escalabilidad — rate limit DB, cron lock, import async |
| 11 | QA — `qa:gate`, tests unitarios y QA |
| 12 | UAT — guía por rol, matriz RBAC automatizada |
| 13 | Documentación oficial — manuales, catálogos, trazabilidad |

---

## P1 — Pre-producción (próximo trimestre)

| ID | Iniciativa | Valor |
|----|------------|-------|
| PP-1 | `prisma migrate` formal (baseline `20260711120000_baseline`) | Hecho — usar `migrate deploy` / `db:migrate:resolve-baseline` |
| PP-2 | Object storage para uploads/import (S3/Azure) | Escalabilidad horizontal |
| PP-3 | Observabilidad (logs estructurados, métricas APM) | Operaciones — **Sentry opcional (`SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`)** |
| PP-4 | Backup y DR documentado | Continuidad |
| PP-5 | Pentest externo | Seguridad |

---

## P2 — Producto (6 meses)

| ID | Iniciativa | Valor |
|----|------------|-------|
| PR-1 | Portal mandante read-only (reportes + liquidaciones) | Experiencia mandante |
| PR-2 | Notificaciones push / email operativas | Tiempo de respuesta — **email digest matutino vía cron `digest_email_supervisores` (SMTP)** |
| PR-3 | App móvil cobrador (PWA o nativa) | Campo |
| PR-4 | Integración pasarela de pagos | Conciliación automática |
| PR-5 | Motor de campañas omnicanal (SMS/WhatsApp) | Recuperación |

---

## P3 — Escala (12 meses)

| ID | Iniciativa | Valor |
|----|------------|-------|
| SC-1 | Read replicas MySQL para reportes | Performance lectura |
| SC-2 | Cola de mensajes (Redis/SQS) para imports masivos | Throughput |
| SC-3 | Multi-tenant con aislamiento por schema | Nuevos clientes |
| SC-4 | ML scoring de prioridad en bandeja | Efectividad cobro |
| SC-5 | API pública documentada para integradores | Ecosistema |

---

## Deuda técnica conocida

| Item | Riesgo | Mitigación planificada |
|------|--------|------------------------|
| Uploads en disco local | Multi-instancia | Aceptado por ahora (funcional) |
| Rate limit in-memory en dev | Solo dev/test | OK por diseño |
| Smoke test lento en BD remota | CI | Mock o BD efímera |
| Admin con permisos extra en BD | Drift | `scripts/check-role-drift.ts` (incluye ADMIN/GERENTE) |

---

## Criterio de priorización

1. Riesgo de producción (seguridad, datos)
2. Impacto operativo mandante
3. Esfuerzo del cobrador (UX campo)
4. Escalabilidad medible

---

## Revisión

Este roadmap se revisa al cierre de cada release mayor. Ver [RELEASE-NOTES.md](./RELEASE-NOTES.md).
