# Arquitectura C4 — FlowPay (I010)

Documento vivo alineado al código (v1.2.8). Actualizar con cada cambio de contenedores.

## Nivel 1 — Context

```mermaid
flowchart LR
  Cobrador[Cobrador campo]
  Supervisor[Supervisor / Gerente]
  Mandante[Mandante / integrador]
  FlowPay[FlowPay]
  SMTP[SMTP Google Workspace]
  Sentry[Sentry opcional]
  Cobrador --> FlowPay
  Supervisor --> FlowPay
  Mandante --> FlowPay
  FlowPay --> SMTP
  FlowPay --> Sentry
```

## Nivel 2 — Containers

```mermaid
flowchart TB
  subgraph web [Next.js web]
    UI[Dashboard backoffice]
    PWA[Shell cobrador PWA]
    GQL[GraphQL Yoga]
    REST[REST /api y /api/v1]
    CronHTTP[Cron HTTP fallback]
  end
  subgraph workers [Workers Node I001]
    WCron[worker-cron]
    WQueue[worker-queue]
  end
  MySQL[(MySQL primary)]
  Disk[Disco local tmp uploads]
  Cache[Upstash Redis cache opcional]
  SMTP[SMTP]
  UI --> GQL
  PWA --> GQL
  GQL --> MySQL
  REST --> MySQL
  REST --> Disk
  CronHTTP --> MySQL
  WCron --> MySQL
  WQueue --> MySQL
  WQueue --> Disk
  GQL --> Cache
  WCron --> SMTP
  WQueue --> SMTP
```

### Jobs del cron maestro (`operaciones-cobranza`)

Fuente: `src/lib/cron/cron-registry.ts`

- Recálculo mora, castigo, promesas, secuencias, digests, retención, etc.
- Incluye **`digest_email_supervisores`** (SMTP)
- Importaciones: cron diario `07:00` + on-demand + **worker-queue**

### Diferido por costo

- Object storage S3/Azure (I003 / PP-2)
- Read replica MySQL (I004 / SC-1)
- BullMQ/Redis/SQS como cola (I002 → cola MySQL gratuita)

## Relacionado

- [ARCHITECTURE-BOUNDED-CONTEXTS.md](./ARCHITECTURE-BOUNDED-CONTEXTS.md)
- [ADR-001-MULTI-TENANT.md](./ADR-001-MULTI-TENANT.md)
- [CATALOGO-PROCESOS.md](./catalogos/CATALOGO-PROCESOS.md)
