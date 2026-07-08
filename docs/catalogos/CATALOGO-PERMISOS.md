# Catálogo de Permisos — FlowPay

Índice del sistema RBAC. **Detalle completo:** [PERMISOS-RBAC.md](../PERMISOS-RBAC.md)

**Fuente única de verdad:** `src/lib/permissions/permiso-codes.ts`

---

## Resumen

| Categoría | Cantidad | Tipo |
|-----------|----------|------|
| ADMINISTRACION | 2 | Administrativo |
| CONFIGURACION | 1 | Administrativo |
| COBRANZA | 15 | Operativo |
| **Total** | **18** | |

---

## Catálogo completo

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
| `PAGO_WRITE` | Registrar Pagos | Registrar pagos de deudores |
| `LIQUIDACION_READ` | Ver Liquidaciones | Consultar liquidaciones |
| `LIQUIDACION_WRITE` | Gestionar Liquidaciones | Crear y emitir liquidaciones |
| `REPORTE_READ` | Ver Reportes | Reportes analíticos |
| `INTELIGENCIA_READ` | Centro de Inteligencia | Analytics operativos |
| `EQUIPO_READ` | Supervisión de Equipo | Dashboard equipo y gamificación |

---

## Presets por rol

| Rol | Permisos |
|-----|----------|
| **COBRADOR** | 9 permisos operativos base |
| **SUPERVISOR** | Cobrador + CARTERA_WRITE, INTELIGENCIA, EQUIPO, LIQUIDACION_READ |
| **GERENTE** | Supervisor + LIQUIDACION_WRITE, USER_READ |
| **ADMIN** | Los 18 permisos |

Definición exacta: `PERMISOS_COBRADOR`, `PERMISOS_SUPERVISOR`, etc. en `permiso-codes.ts`.

---

## Capas de enforcement

| Capa | Archivo |
|------|---------|
| Menú lateral | `sidebar/data/index.ts` |
| Rutas páginas | `route-permissions.ts` + middleware |
| GraphQL | `requerirPermiso()` en resolvers |
| Scope datos | `mandante-scope.ts`, `equipo-scope.ts` |

---

## Validación automatizada

```bash
npm run test:uat      # Matriz RBAC contra BD
npm run audit:security # Checks de autorización
```
