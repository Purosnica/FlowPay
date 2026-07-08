# Manual del Administrador — FlowPay

Guía para el rol **ADMIN** (acceso total).

**Permisos:** los 18 permisos del catálogo RBAC.

---

## 1. Responsabilidades

- Gobernanza de usuarios, roles y permisos
- Configuración global del sistema
- Monitoreo de auditoría y jobs cron
- Gestión completa de mandantes y plantillas
- Emisión de liquidaciones (vía permiso `LIQUIDACION_WRITE` o rol gerente)

---

## 2. Usuarios y permisos

### Usuarios (`/configuracion/usuarios`)

| Acción | Permiso |
|--------|---------|
| Listar usuarios | `USER_READ` |
| Crear / editar | `USER_WRITE` |
| Asignar mandantes | `USER_WRITE` |
| Asignar supervisor | Campo jerárquico en usuario |

### Panel de permisos por rol

Componente `rol-permisos-panel`: edita `tbl_rol_permiso`.  
**Fuente canónica de códigos:** `src/lib/permissions/permiso-codes.ts`

Tras cambios de permisos, el usuario debe **cerrar sesión y volver a entrar** para refrescar el JWT.

---

## 3. Configuración del sistema

### Sistema (`/configuracion`)

Parámetros operativos globales y por mandante:

- Metas de gestiones y recuperación
- Días de mora para castigo
- Descuento máximo sin aprobación
- Horarios de contacto

### Auditoría (`/configuracion/auditoria`)

Consulta de acciones registradas: entidad, usuario, detalle JSON.  
Retención configurable vía `AUDIT_RETENTION_DAYS` (job `auditoria_retencion`).

### Cron operativo (`/configuracion/cron`)

Monitor de jobs:

| Job | Frecuencia típica |
|-----|-------------------|
| `operaciones_cobranza` | Diario 06:00 (master) |
| `procesar-importaciones` | Cada 5 min |

Sub-jobs: acuerdos vencidos, mora, castigo, promesas, reclamos SLA, importaciones, retención.

---

## 4. Seguridad (post Fase 8)

| Control | Comportamiento |
|---------|----------------|
| Sesión | Cookie HTTP-only, JWT 8h, sin token en JSON |
| CSRF | Header `x-flowpay-request: 1` en mutaciones |
| GraphQL | Sin introspection en producción |
| Cron | Solo `Authorization: Bearer CRON_SECRET` |
| Rate limit | Login por email; distribuido en prod (`tbl_rate_limit`) |

Validar: `npm run audit:security`

---

## 5. Mandantes y plantillas

| Ruta | Permiso |
|------|---------|
| `/cobranza/mandantes` | `MANDANTE_READ/WRITE` |
| `/cobranza/plantillas` | `MANDANTE_READ` |
| `/cobranza/plantillas-mensaje` | `MANDANTE_WRITE` |

Configurar: contrato, tipificaciones, políticas, secuencias de contacto.

---

## 6. Despliegue y variables

Variables obligatorias en producción (`src/lib/env.ts`):

```
DATABASE_URL
JWT_SECRET          # ≥32 caracteres
CRON_SECRET         # ≥16 caracteres
NEXTAUTH_SECRET     # ≥32 caracteres
NEXTAUTH_URL
```

Opcionales de escalabilidad:

```
IMPORT_MAX_CONCURRENT=1
IMPORT_MAX_JOBS_PER_RUN=1
AUDIT_RETENTION_DAYS=90
```

Post-deploy:

```bash
npx prisma db push
npm run db:seed          # solo entornos nuevos
npm run qa:gate
```

---

## 7. Mantenimiento

| Tarea | Comando / acción |
|-------|------------------|
| Puerta de calidad | `npm run qa:gate` |
| Smoke test | `npm run smoke:test` |
| UAT RBAC | `npm run test:uat` |
| Auditoría código | `npm run audit:code` |

---

## 8. Validación

Escenarios UAT: sección **Admin** en [UAT-COBRANZA.md](../UAT-COBRANZA.md).
