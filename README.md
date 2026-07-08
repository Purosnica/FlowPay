# FlowPay

Plataforma empresarial de recuperación de cartera.

**Stack:** Next.js · GraphQL · Prisma · MySQL · RBAC

---

## Inicio rápido

```bash
npm install
cp .env.example .env   # configurar DATABASE_URL, JWT_SECRET
npx prisma db push
npm run db:seed
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

### Usuarios demo (seed)

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@flowpay.com | admin123 |
| Supervisor | supervisor@flowpay.com | supervisor123 |
| Gerente | gerente@flowpay.com | gerente123 |
| Cobrador | cobrador@flowpay.com | cobrador123 |

---

## Módulos principales

- **Dashboard** por rol (cobrador, supervisor, gerente)
- **Mi día / Bandeja** — priorización operativa
- **Cartera** — préstamos, clientes, asignación, importación
- **Gestiones, acuerdos, pagos** — ciclo de cobranza
- **Centro de Inteligencia** — analytics y alertas
- **Reportes y liquidaciones** — entregables a mandantes
- **RBAC** — 18 permisos, 4 roles organizacionales
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

Ver `src/lib/env.ts` para el esquema completo.

---

## Documentación

Toda la documentación oficial está en **[docs/README.md](./docs/README.md)**.

Incluye manuales por rol, catálogos de KPIs/permisos/reglas, UAT, roadmap y release notes.

---

## Licencia

Proyecto privado — uso interno.
