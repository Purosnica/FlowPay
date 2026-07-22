# FlowPay

Plataforma empresarial de recuperación de cartera.

**Stack:** Next.js · GraphQL · Prisma · MySQL · RBAC

---

## Inicio rápido

```bash
npm install
cp .env.example .env   # configurar DATABASE_URL, JWT_SECRET
npx prisma migrate deploy
# BD ya existente con db push: npm run db:migrate:resolve-baseline (una vez)
npm run db:seed
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

Usuarios de desarrollo: se crean con `npm run db:seed`. Las contraseñas
solo aparecen en la salida de la consola del seed — no las uses en
staging/producción y cámbialas de inmediato si el seed corrió ahí.

---

## Módulos principales

- **Dashboard** por rol (cobrador, supervisor, gerente)
- **Mi día / Bandeja** — priorización operativa
- **Cartera** — préstamos, clientes, asignación, importación
- **Gestiones, acuerdos, pagos** — ciclo de cobranza
- **Centro de Inteligencia** — analytics y alertas
- **Reportes y liquidaciones** — entregables a mandantes
- **RBAC** — 46 permisos, 4 roles organizacionales
- **Auditoría y cron** — operaciones automáticas y trazabilidad

---

## Scripts útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run db:seed` | Datos iniciales y permisos |
| `npm run qa:gate` | Puerta de calidad (audits + tests) |
| `npm run audit:docs` | Validar documentación oficial |
| `npm run test:uat` | Matriz RBAC automatizada |
| `npm run test:e2e` | Playwright (login smoke; requiere Chromium) |
| `npm run smoke:test` | Smoke test con BD |

---

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Conexión MySQL |
| `JWT_SECRET` | Firma de sesión (≥32 chars en prod) |
| `CRON_SECRET` | Auth de endpoints cron (Bearer) |
| `IMPORT_MAX_CONCURRENT` | Jobs de importación simultáneos |
| `AUDIT_RETENTION_DAYS` | Retención de auditoría (default 90) |
| `TRUST_PROXY` | `true` solo detrás de proxy que reescribe IP (p. ej. Vercel) |
| `SESSION_IDLE_SECONDS` | Idle sin actividad (default 1800 = 30 min) |
| `GRAPHQL_MAX_DEPTH` | Límite profundidad GraphQL (default 12) |
| `GRAPHQL_MAX_FIELDS` | Límite campos GraphQL (default 250) |

Tras pull de cambios de schema: `npx prisma migrate deploy` (si el host no responde, SQL en `scripts/sql/apply-pago-idempotency.sql` / `scripts/sql/apply-liquidacion-idempotency.sql` / `scripts/sql/apply-drop-legacy-password.sql`).

Healthchecks: `GET /api/health` · `GET /api/ready` (DB). Backup/DR: [docs/BACKUP-DR.md](./docs/BACKUP-DR.md).

Ver `src/lib/env.ts` para el esquema completo.

---

## Documentación

Toda la documentación oficial está en **[docs/README.md](./docs/README.md)**.

Incluye:

- Manuales detallados por rol (cobrador, supervisor, gerente, admin, mandante)
- Manual de reportes y glosario
- Catálogos de KPIs, permisos, reglas y procesos
- Guías técnicas (mora, castigo, config, concurrencia)
- UAT, roadmap y release notes

---

## Licencia

Proyecto privado — uso interno.
