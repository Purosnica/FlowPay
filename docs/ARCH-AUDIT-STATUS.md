# Estado ARCH I001–I014 (oleada v1.2.8)

| ID | Estado | Notas |
|----|--------|-------|
| I001 | Hecho | `worker:cron` / `worker:queue`; HTTP cron = fallback |
| I002 | Hecho (MySQL) | Backpressure sin Redis/SQS/BullMQ |
| I003 | Diferido | S3/Azure genera costo (PP-2) |
| I004 | Diferido | Read replica genera costo (SC-1) |
| I005 | Hecho | Barrels `src/lib/contexts/*` |
| I006 | Hecho | Previo (`/api/v1`) |
| I007 | Hecho | `tbl_domain_event` + bus |
| I008 | Parcial | ADR row-level; schema = SC-3 |
| I010 | Hecho | `docs/ARCHITECTURE-C4.md` |
| I011 | Hecho | Circuit breaker SMTP/Sentry |
| I012 | Hecho | `tbl_feature_flag` |
| I013 | Hecho | `CobradorShell` Mi día / Bandeja |
| I014 | Hecho | Versionado plantillas import |

Canvas `flowpay-master-audit.canvas.tsx` no estaba presente en el workspace al cerrar la oleada; este archivo es la fuente de verdad de progreso ARCH.
