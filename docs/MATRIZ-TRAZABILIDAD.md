# Matriz de Trazabilidad — FlowPay

Requisito → implementación → validación (Fases 8–13).

---

## Leyenda

| Validación | Comando / artefacto |
|------------|---------------------|
| Audit estático | `npm run audit:*` |
| Test automatizado | `npm run test:*` |
| UAT manual | `docs/UAT-COBRANZA.md` |
| Documentación | `docs/*` |

---

## Seguridad (Fase 8)

| ID | Requisito | Implementación | Validación |
|----|-----------|----------------|------------|
| SEC-01 | Sin introspection anónima | `require-auth-plugin.ts`, `graphql/route.ts` | `audit:security` G-1, G-2 |
| SEC-02 | Sesión cookie-only | `jwt.ts`, `auth-context.tsx`, login/me routes | `audit:security` J-1, J-2 |
| SEC-03 | CSRF en mutaciones | `csrf.ts`, middleware, axios | `test:qa`, `smoke:test` |
| SEC-04 | Cron solo Bearer | `cron-auth.ts` | `audit:security`, `test:qa` |
| SEC-05 | Rate limit login | `rate-limit-service.ts`, login route | `audit:security`, `test:qa` |
| SEC-06 | Scope mandante contacto | `mandante-scope.ts`, deudor-contacto resolvers | `smoke:test`, `audit:security` |

---

## Performance (Fase 9)

| ID | Requisito | Implementación | Validación |
|----|-----------|----------------|------------|
| PERF-01 | Límite bandeja prioridad | `bandeja-cobrador-service.ts`, `performance-limits.ts` | `audit:performance` |
| PERF-02 | Límite Mi día | `mi-dia-service.ts` | `audit:performance` |
| PERF-03 | Batch secuencias | `secuencia-contacto-service.ts` | `audit:performance` |
| PERF-04 | Reporte aggregate | `reporte-cobranza-service.ts` | `audit:performance` |
| PERF-05 | Paginación GraphQL | `resolvePagination` en resolvers | `audit:graphql` |
| PERF-06 | Índices BD | `schema.prisma` | `audit:db`, `db push` |

---

## Escalabilidad (Fase 10)

| ID | Requisito | Implementación | Validación |
|----|-----------|----------------|------------|
| SCL-01 | Prisma singleton prod | `prisma.ts` | `audit:scalability` |
| SCL-02 | Rate limit distribuido | `tbl_rate_limit`, `rate-limit-service.ts` | `audit:scalability`, `smoke:test` |
| SCL-03 | Cron advisory lock | `mysql-advisory-lock.ts`, `cron-orchestrator.ts` | `audit:scalability` |
| SCL-04 | Import async + cron 5min | `importar/async/route.ts`, `procesar-importaciones` | `audit:scalability`, UAT S1 |
| SCL-05 | Retención auditoría | `auditoria-retention-service.ts` | `audit:scalability` |
| SCL-06 | Límites upload | `upload-limits.ts` | `audit:scalability` |

---

## QA (Fase 11)

| ID | Requisito | Implementación | Validación |
|----|-----------|----------------|------------|
| QA-01 | Puerta QA unificada | `audit-qa.ts` | `npm run qa:gate` |
| QA-02 | Tests módulos críticos | `test-qa-unit.ts` | `npm run test:qa` |
| QA-03 | Smoke ampliado | `smoke-test-cobranza.ts` | `npm run smoke:test` |
| QA-04 | Verificación fórmulas | `verify-implementaciones.ts` | `verify:formulas` |

---

## UAT (Fase 12)

| ID | Requisito | Implementación | Validación |
|----|-----------|----------------|------------|
| UAT-01 | Guía por rol | `docs/UAT-COBRANZA.md` | `audit:uat` |
| UAT-02 | Matriz RBAC auto | `test-uat-rbac.ts` | `npm run test:uat` |
| UAT-03 | Escenarios seguridad | UAT sección 3 | `audit:uat` U-6 |
| UAT-04 | Escenarios import async | UAT S1, P3 | `audit:uat` U-7 |

---

## Documentación (Fase 13)

| ID | Requisito | Implementación | Validación |
|----|-----------|----------------|------------|
| DOC-01 | Manual funcional | `docs/manuales/MANUAL-FUNCIONAL.md` | `audit:docs` |
| DOC-02 | Manual cobrador | `docs/manuales/MANUAL-COBRADOR.md` | `audit:docs` |
| DOC-03 | Manual supervisor | `docs/manuales/MANUAL-SUPERVISOR.md` | `audit:docs` |
| DOC-04 | Manual administrador | `docs/manuales/MANUAL-ADMINISTRADOR.md` | `audit:docs` |
| DOC-05 | Manual mandante | `docs/manuales/MANUAL-MANDANTE.md` | `audit:docs` |
| DOC-06 | Catálogo KPIs | `docs/catalogos/CATALOGO-KPIs.md` | `audit:docs` |
| DOC-07 | Catálogo permisos | `docs/catalogos/CATALOGO-PERMISOS.md` | `audit:docs` |
| DOC-08 | Reglas de negocio | `docs/catalogos/CATALOGO-REGLAS-NEGOCIO.md` | `audit:docs` |
| DOC-09 | Catálogo procesos | `docs/catalogos/CATALOGO-PROCESOS.md` | `audit:docs` |
| DOC-10 | Roadmap | `docs/ROADMAP.md` | `audit:docs` |
| DOC-11 | Release notes | `docs/RELEASE-NOTES.md` | `audit:docs` |
| DOC-12 | Índice documentación | `docs/README.md`, `README.md` | `audit:docs` |

---

## RBAC (transversal)

| ID | Requisito | Implementación | Validación |
|----|-----------|----------------|------------|
| RBAC-01 | 18 permisos canónicos | `permiso-codes.ts` | `test:uat`, `PERMISOS-RBAC.md` |
| RBAC-02 | Presets por rol | `seed-permisos.ts` | `test:uat` |
| RBAC-03 | Rutas protegidas | `route-permissions.ts` | `test:uat` (12 rutas) |
| RBAC-04 | Menú por permiso | `sidebar/data/index.ts` | `audit:frontend` |

---

## Cobertura de validación

```bash
npm run audit:docs     # Fase 13
npm run qa:gate        # Fases 4–12
npm run test:uat       # RBAC
```

**Meta:** 100% requisitos P0/P1 de fases 8–13 con al menos una validación automatizada o UAT documentado.
