# Configuración del sistema — FlowPay

Parámetros operativos y de entorno que gobiernan la cobranza.

**Versión:** 1.2.2  
**UI:** `/configuracion`  
**Código:** `src/lib/cobranza/configuracion-cobranza-service.ts`, `src/lib/env.ts`

---

## 1. Capas de configuración

| Capa | Dónde | Ejemplos |
|------|-------|----------|
| Entorno | `.env` / hosting | `DATABASE_URL`, `JWT_SECRET`, `CRON_SECRET` |
| Sistema / UI | `/configuracion` | Parámetros globales visibles al admin |
| Mandante | Hub `/cobranza/mandantes/[id]` | Metas, tipificaciones, plantillas |
| Horarios | `tbl_horario_cobranza` | Franjas de contacto |
| Feriados | seed feriados Nicaragua | Calendario |

---

## 2. Variables de entorno (`src/lib/env.ts`)

### Producción (obligatorias)

| Variable | Regla |
|----------|-------|
| `DATABASE_URL` | URL MySQL válida |
| `JWT_SECRET` | ≥ 32 caracteres |
| `CRON_SECRET` | ≥ 16 caracteres |

### Operación / escala

| Variable | Default | Uso |
|----------|---------|-----|
| `IMPORT_MAX_CONCURRENT` | 1 | Jobs de importación en paralelo |
| `IMPORT_MAX_JOBS_PER_RUN` | 1 | Jobs tomados por tick del worker |
| `AUDIT_RETENTION_DAYS` | 90 | Purga de auditoría |
| `CRON_RETENTION_DAYS` | 90 | Retención de ejecuciones cron |
| `LOG_LEVEL` | info | error / warn / info / debug |
| `NEXT_PUBLIC_API_URL` | vacío | Same-origin si vacío |
| `TRUST_PROXY` | off | `true` solo si el proxy reescribe IP (Vercel) |
| `SESSION_IDLE_SECONDS` | 1800 | Idle máximo sin actividad (JWT `lastActivityAt`) |
| `GRAPHQL_MAX_DEPTH` | 12 | Límite profundidad GraphQL |
| `GRAPHQL_MAX_FIELDS` | 250 | Límite campos GraphQL |
| `GRAPHQL_MAX_COST` | 1000 | Costo ponderado (listas × pageSize) |
| `GRAPHQL_LIST_COST_DEFAULT` | 10 | Multiplicador lista sin literal |
| `GRAPHQL_PERSISTED_ONLY` | prod=true | Allowlist operationName en prod |

### SMTP (opcional)

`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_FROM_NAME`

### Observabilidad (opcional)

`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`

---

## 3. Parámetros de cobranza (negocio)

Claves típicas expuestas vía servicio de configuración (nombres canónicos en código):

| Área | Parámetro | Efecto |
|------|-----------|--------|
| Mora | Días de gracia | Resta al cálculo de `diasMora` |
| Castigo | Días de mora para castigo | Trigger de [CASTIGO-CARTERA.md](./CASTIGO-CARTERA.md) |
| Acuerdos | Descuento máx. sin aprobación | Requiere supervisor si se excede |
| Acuerdos | Días de gracia de cuota | Antes de marcar acuerdo ROTO |
| Pagos | Auto-aplicar | Marca `aplicado` al crear el pago |
| Metas | Gestiones / recuperación semana-mes | Gamificación y reportes |
| Cron | `cobranza.cron_alerta_email_activa` | Email a ADMIN/GERENTE si el cron maestro falla (default true; requiere SMTP) |

Valores por mandante tienen prioridad operativa cuando el módulo lo soporta; si no, aplica el global.

---

## 4. Horarios de contacto

Tabla: `tbl_horario_cobranza`

- Pueden ser **globales** (`idmandante = null`) o **por mandante**  
- Seed legal base: `prisma/seed-horarios-cobranza.ts`  
- Validación en gestiones: `contacto-compliance-service.ts`  
- UI: alerta de horario en formulario de gestión  

---

## 5. Tipificaciones y plantillas

No son “env”, pero son configuración operativa crítica:

| Artefacto | Ruta |
|-----------|------|
| Tipificaciones | Hub mandante |
| Plantillas importación | `/cobranza/plantillas` |
| Plantillas mensaje | `/cobranza/plantillas-mensaje` |
| Tramos / comisiones | Config mandante / `tbl_comision_cobro` |

---

## 6. RBAC

Los permisos **no** se editan por `.env`:

- Catálogo: `permiso-codes.ts`  
- Asignación: `/configuracion/usuarios` → panel de rol  
- Tras cambios: re-login o refresh de sesión  

Ver [CATALOGO-PERMISOS.md](./catalogos/CATALOGO-PERMISOS.md).

---

## 7. Checklist post-cambio de config

- [ ] Documentar el cambio en auditoría / ticket interno  
- [ ] Verificar efecto en un mandante piloto  
- [ ] Confirmar cron saludable en `/configuracion/cron`  
- [ ] Avisar a supervisores si cambió umbral de descuento o castigo  

---

## 8. Relacionados

- [MANUAL-ADMINISTRADOR.md](./manuales/MANUAL-ADMINISTRADOR.md)  
- [MORA-AUTOMATICA.md](./MORA-AUTOMATICA.md)  
- [CATALOGO-PROCESOS.md](./catalogos/CATALOGO-PROCESOS.md)
