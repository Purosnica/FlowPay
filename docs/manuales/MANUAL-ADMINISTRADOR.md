# Manual del Administrador — FlowPay

Guía completa para el rol **ADMIN** (acceso total al catálogo RBAC).

**Versión:** 1.2.2

---

## 1. Responsabilidades

1. Gobernanza de usuarios, roles y permisos  
2. Configuración global y por mandante  
3. Monitoreo de auditoría y jobs cron  
4. Gestión completa de mandantes, plantillas y tipificaciones  
5. Soporte a operación (importaciones atascadas, seguridad, despliegue)  
6. Emisión de liquidaciones (también disponible para gerente)  

---

## 2. Inicio de sesión y seguridad de cuenta

1. Acceder a `/login` con credenciales de admin.  
2. Tras el primer acceso en un entorno nuevo, **cambiar contraseñas** de seed.  
3. No compartir `JWT_SECRET` ni `CRON_SECRET`.  
4. Sesión: cookie HTTP-only ~8 h.  

Demo local: passwords solo en salida de `npm run db:seed`.

---

## 3. Usuarios y permisos (`/configuracion/usuarios`)

### 3.1 Gestión de usuarios

| Acción | Permiso |
|--------|---------|
| Listar / consultar | `USER_READ` |
| Crear / editar | `USER_WRITE` |
| Asignar mandantes | `USER_WRITE` |
| Asignar supervisor (jerarquía) | Campo `idsupervisor` en el usuario |
| Activar / desactivar | Según UI de usuarios |

**Alta de usuario — checklist:**

1. Email único y nombre  
2. Rol organizacional: `COBRADOR` | `SUPERVISOR` | `GERENTE` | `ADMIN`  
3. Contraseña segura (comunicar por canal seguro)  
4. Asignar **mandantes** (`tbl_usuario_mandante`)  
5. Si es cobrador: asignar **supervisor**  
6. Verificar que el menú muestra lo esperado tras el primer login  

### 3.2 Permisos por rol

Panel de permisos (`rol-permisos-panel`) edita `tbl_rol_permiso`.

**Fuente canónica de códigos:** `src/lib/permissions/permiso-codes.ts`  
**Detalle:** [PERMISOS-RBAC.md](../PERMISOS-RBAC.md) · [CATALOGO-PERMISOS.md](../catalogos/CATALOGO-PERMISOS.md)

Tras cambiar permisos de un rol:

1. Pedir a los usuarios afectados **cerrar sesión y volver a entrar**, o  
2. Usar refresh de sesión (`/api/auth/refresh-session`) si está disponible en UI  

Presets de referencia:

| Rol | Contenido típico |
|-----|------------------|
| COBRADOR | Operación diaria (gestiones, acuerdos, pagos, reportes cobranza/operación) |
| SUPERVISOR | + cartera write, inteligencia, equipo, liquidación read, riesgo/equipo |
| GERENTE | + liquidación write, user read, finanzas/gerencial |
| ADMIN | Todo el catálogo |

---

## 4. Configuración del sistema (`/configuracion`)

Parámetros operativos globales y/o por mandante (según pantalla):

| Parámetro | Efecto |
|-----------|--------|
| Metas de gestiones / recuperación | Gamificación y reportes de cumplimiento |
| Días de mora para castigo | Trigger de castigo automático |
| Descuento máximo sin aprobación | Umbral de acuerdos |
| Días de gracia de mora / acuerdos | Cálculo de mora y rotura de acuerdos |
| Auto-aplicar pagos | `pagoAutoAplicar` |
| Horarios de contacto | Cumplimiento de franjas legales |

Detalle técnico: [CONFIGURACION-SISTEMA.md](../CONFIGURACION-SISTEMA.md)

---

## 5. Auditoría (`/configuracion/auditoria`)

Consulta de acciones registradas:

- Usuario, entidad, acción, detalle JSON, fecha  

Retención: `AUDIT_RETENTION_DAYS` (default 90), job `auditoria_retencion`.

Use auditoría para:

- Investigar cambios de estado de préstamo  
- Trazar quién emitió liquidaciones  
- Revisar logins / mutaciones críticas  

---

## 6. Cron operativo (`/configuracion/cron`)

Monitor de ejecuciones.

| Job | Frecuencia típica | Función |
|-----|-------------------|---------|
| `operaciones_cobranza` | Diario 06:00 | Master: acuerdos, mora, castigo, promesas, SLA, importaciones, retención |
| `procesar-importaciones` | Cada ~5 min | Worker de jobs Excel |

Auth del endpoint: `Authorization: Bearer CRON_SECRET`  
Lock multi-instancia: advisory lock MySQL (ver [CONTROL-CONCURRENCIA.md](../CONTROL-CONCURRENCIA.md)).

Si un sub-job falla:

1. Revisar log en el monitor  
2. Corregir causa (datos, config, timeout)  
3. Re-ejecutar según procedimiento de ops  

---

## 7. Mandantes y plantillas

| Ruta | Permiso | Uso |
|------|---------|-----|
| `/cobranza/mandantes` | `MANDANTE_READ/WRITE` | Alta, contrato, config |
| `/cobranza/mandantes/[id]` | Hub del mandante | Tipificaciones, políticas, secuencias |
| `/cobranza/plantillas` | `MANDANTE_READ` | Mapeo Excel |
| `/cobranza/plantillas-mensaje` | `MANDANTE_WRITE` | Mensajes de contacto |
| `/cobranza/agencias` | `CARTERA_READ` | Agencias / rutas |

Checklist de alta de mandante:

1. Código, nombre, estado activo  
2. Contrato y comisiones por tramo de mora  
3. Plantilla de importación  
4. Tipificaciones  
5. Horarios / metas / umbrales de descuento y castigo  
6. Asignar usuarios al mandante  

Ver [MANUAL-MANDANTE.md](./MANUAL-MANDANTE.md).

---

## 8. Seguridad (controles)

| Control | Comportamiento |
|---------|----------------|
| Sesión | Cookie HTTP-only, JWT ~8 h, sin token en JSON de login |
| CSRF | Header `x-flowpay-request: 1` + cookie/header CSRF |
| GraphQL | Sin introspection anónima en producción |
| Cron | Solo Bearer `CRON_SECRET` |
| Rate limit | Login por email; distribuido en prod (`tbl_rate_limit`) |
| Headers | Seguridad HTTP (XSS, etc.) |

Validar: `npm run audit:security`

---

## 9. Variables de entorno

Fuente: `src/lib/env.ts`

### Obligatorias en producción

```
DATABASE_URL=
JWT_SECRET=          # ≥32 caracteres
CRON_SECRET=         # ≥16 caracteres
```

### Opcionales

```
IMPORT_MAX_CONCURRENT=1
IMPORT_MAX_JOBS_PER_RUN=1
AUDIT_RETENTION_DAYS=90
CRON_RETENTION_DAYS=90
LOG_LEVEL=info
NEXT_PUBLIC_API_URL=   # vacío = same-origin
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
SMTP_FROM_NAME=
```

Auth: JWT propio (cookie `auth-token`). No se usa NextAuth.

Detrás de reverse proxy: configurar `X-Real-IP` o `TRUST_PROXY=true` según despliegue.

---

## 10. Despliegue y base de datos

```bash
npm install
# Configurar .env
npx prisma migrate deploy
npm run db:seed          # solo entornos que lo requieran
npm run build
npm run qa:gate
```

BD ya existente que usaba `db push`:

```bash
npm run db:migrate:resolve-baseline   # una sola vez
```

`db push` queda para prototipo local; staging/prod usan migraciones.

---

## 11. Mantenimiento y QA

| Tarea | Comando |
|-------|---------|
| Puerta de calidad | `npm run qa:gate` |
| Smoke test | `npm run smoke:test` |
| UAT RBAC | `npm run test:uat` |
| Auditoría docs | `npm run audit:docs` |
| Auditoría código | `npm run audit:code` |
| Auditoría seguridad | `npm run audit:security` |

---

## 12. Operaciones que el admin suele resolver

| Incidente | Acción |
|-----------|--------|
| Usuario sin menú | Revisar rol, permisos, mandantes |
| Importación atascada | Cron monitor + historial cargas; revisar concurrencia |
| Mora no actualiza | Verificar cron `mora_recalculo` y feriados |
| Castigo masivo inesperado | Revisar `diasMoraCastigo` / config |
| Liquidación duplicada | Locks de liquidación; no forzar doble emisión |
| Email no sale | Validar SMTP_* y logs |

---

## 13. Capacidades heredadas

El admin puede ejecutar todos los flujos de cobrador, supervisor y gerente.  
Para no mezclar roles en auditoría operativa, use cuentas de servicio solo cuando sea necesario.

Manuales:

- [MANUAL-COBRADOR.md](./MANUAL-COBRADOR.md)  
- [MANUAL-SUPERVISOR.md](./MANUAL-SUPERVISOR.md)  
- [MANUAL-GERENTE.md](./MANUAL-GERENTE.md)

---

## 14. Validación UAT

Sección **Admin** en [UAT-COBRANZA.md](../UAT-COBRANZA.md).

---

## 15. Documentos técnicos relacionados

- [MORA-AUTOMATICA.md](../MORA-AUTOMATICA.md)  
- [CASTIGO-CARTERA.md](../CASTIGO-CARTERA.md)  
- [CONFIGURACION-SISTEMA.md](../CONFIGURACION-SISTEMA.md)  
- [CONTROL-CONCURRENCIA.md](../CONTROL-CONCURRENCIA.md)  
- [TRANSACCIONES-PRISMA.md](../TRANSACCIONES-PRISMA.md)  
- [INSTRUCCIONES-INSTALACION.md](../../INSTRUCCIONES-INSTALACION.md)
