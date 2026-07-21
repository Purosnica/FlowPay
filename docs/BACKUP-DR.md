# Backup y recuperación ante desastres (DR) — FlowPay

**Versión:** 1.2.4  
**Objetivo:** continuidad operativa sin depender de un proveedor cloud de pago.

---

## 1. Qué respaldar

| Activo | Ubicación típica | Criticidad |
|--------|------------------|------------|
| MySQL (schema + datos) | Hosting (Banahosting / VPS) | Crítica |
| `.env` / secretos | Panel host / Vercel / gestor de secretos | Crítica |
| Uploads locales | `DOCUMENTOS_STORAGE_DIR` / tmp del host | Alta |
| Código | GitHub `main` | Alta |

No respaldar `node_modules`, `.next`, ni dumps con contraseñas en texto plano en repos.

---

## 2. Backup MySQL (diario recomendado)

### Opción A — panel del hosting

1. phpMyAdmin / cPanel → Export / Backup.
2. Guardar `.sql.gz` fuera del servidor de producción (drive cifrado o otro host).
3. Retención mínima: **7 diarios + 4 semanales**.

### Opción B — `mysqldump` (SSH o cron del host)

```bash
mysqldump -h HOST -u USER -p DATABASE \
  --single-transaction --routines --triggers \
  | gzip > flowpay-$(date +%Y%m%d).sql.gz
```

Verificar que el archivo no esté vacío (`gzip -t` / tamaño > 0).

---

## 3. Restore drill (obligatorio cada trimestre)

1. Crear BD staging vacía.
2. Restaurar el dump más reciente.
3. Apuntar `DATABASE_URL` de un entorno no-prod.
4. `npx prisma migrate status` → debe listar migraciones aplicadas (o `resolve-baseline` + `deploy` según [TRANSACCIONES-PRISMA.md](./TRANSACCIONES-PRISMA.md)).
5. Smoke: login admin + `GET /api/ready` → `database: up`.
6. Anotar fecha, duración y responsable en el registro interno del equipo.

**Criterio de éxito:** login + lectura de cartera/pagos en staging en &lt; 2 h desde el inicio del drill.

---

## 4. Secuencia de incidente (RTO/RPO orientativos)

| Meta | Objetivo |
|------|----------|
| RPO | ≤ 24 h (último backup diario) |
| RTO | ≤ 4 h (restore + DNS/env + smoke) |

1. Declarar incidente (ADMIN/GERENTE + hosting).
2. Congelar writes si el daño es corrupción (modo mantenimiento / quitar crons).
3. Restaurar backup verificado a BD limpia o in-place según gravedad.
4. Reaplicar migraciones pendientes si el dump es anterior: `npx prisma migrate deploy`.
5. Restaurar uploads si aplica.
6. Validar `/api/health`, `/api/ready`, login, un pago de prueba en UAT.
7. Reactivar crons Vercel / host.
8. Postmortem: causa, gaps de backup, acción correctiva.

---

## 5. Checklist pre-producción

- [ ] `TRUST_PROXY=true` en Vercel/proxy
- [ ] `npx prisma migrate deploy` OK en prod
- [ ] Backup automático diario configurado en el host
- [ ] Al menos **un** restore drill documentado en los últimos 90 días
- [ ] `JWT_SECRET` / `CRON_SECRET` rotados si alguna vez se filtraron
- [ ] SMTP de alerta cron activo (`cobranza.cron_alerta_email_activa`)

---

## 6. Relacionado

- Migraciones: [TRANSACCIONES-PRISMA.md](./TRANSACCIONES-PRISMA.md)
- Config: [CONFIGURACION-SISTEMA.md](./CONFIGURACION-SISTEMA.md)
- Roadmap PP-4: [ROADMAP.md](./ROADMAP.md)
