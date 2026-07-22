# Catálogo de Permisos — FlowPay

Índice del sistema RBAC. **Detalle completo:** [PERMISOS-RBAC.md](../PERMISOS-RBAC.md)

**Fuente única de verdad:** `src/lib/permissions/permiso-codes.ts`

---

## Resumen

El catálogo incluye permisos de administración, configuración, cobranza operativa y una familia amplia de **permisos de reportes** (grupos + finos por pantalla).

| Categoría | Tipo | Ejemplos |
|-----------|------|----------|
| ADMINISTRACION | Administrativo | `USER_READ`, `USER_WRITE` |
| CONFIGURACION | Administrativo | `CONFIG_SYSTEM` |
| COBRANZA | Operativo | Cartera, gestiones, acuerdos, pagos, liquidaciones, inteligencia, equipo |
| REPORTES | Operativo | `REPORTE_*` (comodín, grupos y finos) |

---

## Permisos core

| Código | Nombre | Descripción |
|--------|--------|-------------|
| `USER_READ` | Ver Usuarios | Consultar usuarios, roles y asignaciones |
| `USER_WRITE` | Gestionar Usuarios | Crear, editar usuarios y permisos |
| `CONFIG_SYSTEM` | Configurar Sistema | Config global, auditoría y cron |
| `MANDANTE_READ` | Ver Mandantes | Consultar mandantes y configuración |
| `MANDANTE_WRITE` | Gestionar Mandantes | Crear/editar mandantes y plantillas |
| `CARTERA_READ` | Ver Cartera | Cartera, préstamos, clientes, bandeja |
| `CARTERA_WRITE` | Gestionar Cartera | Importar, asignar cobradores |
| `GESTION_READ` | Ver Gestiones | Gestiones y reclamos |
| `GESTION_WRITE` | Registrar Gestiones | Crear gestiones y reclamos |
| `ACUERDO_READ` | Ver Acuerdos | Consultar acuerdos y promesas |
| `ACUERDO_WRITE` | Gestionar Acuerdos | Crear y modificar acuerdos |
| `PAGO_READ` | Ver Pagos | Consultar pagos |
| `PAGO_WRITE` | Registrar Pagos | Registrar pagos (alta); no implica aplicar |
| `PAGO_APPLY` | Aplicar / conciliar pagos | SoD: aplicar, desaplicar, extracto auto (supervisor+) |
| `LIQUIDACION_READ` | Ver Liquidaciones | Consultar liquidaciones |
| `LIQUIDACION_WRITE` | Gestionar Liquidaciones | Crear y emitir liquidaciones |
| `INTELIGENCIA_READ` | Centro de Inteligencia | Analytics operativos |
| `EQUIPO_READ` | Supervisión de Equipo | Dashboard equipo y gamificación |

---

## Permisos de reportes

### Comodín y grupos

| Código | Descripción |
|--------|-------------|
| `REPORTE_READ` | Comodín legacy: todos los reportes |
| `REPORTE_COBRANZA_READ` | Grupo cobranza / hub / aging |
| `REPORTE_OPERACION_READ` | Grupo operativo (efectividad, productividad, etc.) |
| `REPORTE_RIESGO_READ` | Grupo riesgo (migración mora, concentración…) |
| `REPORTE_FINANZAS_READ` | Grupo financiero |
| `REPORTE_GERENCIAL_READ` | Grupo gerencial |
| `REPORTE_EQUIPO_READ` | Grupo equipo / supervisor |

### Finos (por pantalla)

Existen en catálogo y en `reporte-permisos.ts` (OR con grupo / `REPORTE_READ`).  
**Presets de rol usan grupos**, no asignan finos uno a uno: un fino sin grupo solo tiene sentido para roles custom (least privilege por pantalla).

Incluyen, entre otros:

`REPORTE_HUB_READ`, `REPORTE_AGING_READ`, `REPORTE_INFORME_GERENCIAL_READ`, `REPORTE_INFORME_GESTIONES_READ`, `REPORTE_EFECTIVIDAD_READ`, `REPORTE_PRODUCTIVIDAD_DIARIA_READ`, `REPORTE_CUMPLIMIENTO_METAS_READ`, `REPORTE_SUPERVISOR_EQUIPO_READ`, `REPORTE_PROMESAS_PAGO_READ`, `REPORTE_CUMPLIMIENTO_ACUERDOS_READ`, `REPORTE_CUOTAS_VENCIDAS_READ`, `REPORTE_CARTERA_SIN_GESTION_READ`, `REPORTE_RECONTACTOS_READ`, `REPORTE_RECLAMOS_SLA_READ`, `REPORTE_MIGRACION_MORA_READ`, `REPORTE_CONCENTRACION_RIESGO_READ`, `REPORTE_INGRESO_TRAMO_MORA_READ`, `REPORTE_GANANCIAS_READ`, `REPORTE_MARGEN_MANDANTES_READ`, `REPORTE_COMISIONES_COBRADORES_READ`, `REPORTE_COMISIONES_VS_PROYECCION_READ`, …

Regla de acceso: permiso fino **OR** grupo **OR** `REPORTE_READ`.  
Registro: `src/lib/permissions/reporte-permisos.ts`  
Guía de pantallas: [MANUAL-REPORTES.md](../manuales/MANUAL-REPORTES.md)

---

## Presets por rol

| Rol | Permisos base |
|-----|---------------|
| **COBRADOR** | Cartera/mandante read, gestiones/acuerdos/pagos R/W (`PAGO_WRITE`, sin `PAGO_APPLY`), reportes cobranza + operación |
| **SUPERVISOR** | Cobrador + `CARTERA_WRITE`, `PAGO_APPLY`, `INTELIGENCIA_READ`, `EQUIPO_READ`, `LIQUIDACION_READ`, reportes riesgo + equipo |
| **GERENTE** | Supervisor + `LIQUIDACION_WRITE`, `USER_READ`, reportes finanzas + gerencial |
| **ADMIN** | Todo el catálogo (`PERMISOS_CATALOGO`) |

Definición exacta: `PERMISOS_COBRADOR`, `PERMISOS_SUPERVISOR`, `PERMISOS_GERENTE`, `PERMISOS_ADMIN` en `permiso-codes.ts`.

---

## Capas de enforcement

| Capa | Archivo |
|------|---------|
| Menú lateral | `src/components/Layouts/sidebar/data/index.ts` |
| Rutas páginas | `route-permissions.ts` + middleware |
| GraphQL | `requerirPermiso()` en resolvers |
| Scope datos | `mandante-scope.ts`, `equipo-scope.ts` |

---

## Validación automatizada

```bash
npm run test:uat      # Matriz RBAC contra BD
npm run audit:security # Checks de autorización
```
