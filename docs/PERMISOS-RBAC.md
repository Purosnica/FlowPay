# RBAC FlowPay — Auditoría y Catálogo de Permisos

> **Fuente única de verdad:** `src/lib/permissions/permiso-codes.ts`  
> **Jerarquía organizacional (roles):** `src/lib/permissions/role-codes.ts`  
> **Última auditoría:** 2026-07-07

---

## Resumen ejecutivo

El sistema tiene permisos RBAC en 3 categorías (ver `PERMISOS_CATALOGO` en `permiso-codes.ts`). Los reportes se controlan por **grupos** (`REPORTE_*_READ`) más el comodín legacy `REPORTE_READ`.

**Principio de diseño:**

- **Permisos (RBAC)** → controlan *qué módulos y acciones* puede ejecutar un usuario.
- **Roles organizacionales** (`COBRADOR`, `SUPERVISOR`, `GERENTE`, `ADMIN`) → controlan *jerarquía y alcance de datos* (equipo, aprobaciones, mandantes).
- **Nunca** usar permisos financieros (`LIQUIDACION_*`, `PAGO_*`) para inferir jerarquía.

---

## Capas de autorización

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│  Frontend   │───▶│  Middleware JWT  │───▶│  GraphQL / API      │
│  (nav UI)   │    │  (rutas páginas) │    │  (requerirPermiso)  │
└─────────────┘    └──────────────────┘    └─────────────────────┘
       │                    │                         │
       └────────────────────┴─────────────────────────┘
                    permisos en JWT
              + scope mandante (tbl_usuario_mandante)
              + scope equipo (rol + idsupervisor)
```

| Capa | Archivo | Qué valida |
|------|---------|------------|
| Constantes | `src/lib/permissions/permiso-codes.ts` | Códigos, catálogo, presets por rol |
| Seed | `prisma/seed-permisos.ts` | Persistencia en `tbl_permiso` / `tbl_rol_permiso` |
| Middleware páginas | `src/middleware.ts` + `route-permissions.ts` | Acceso a rutas del dashboard |
| API REST | `src/lib/middleware/auth.ts` | `requirePermission()` en rutas `/api/*` |
| GraphQL | Resolvers + `auth-helpers.ts` | `requerirPermiso()` por operación |
| Frontend nav | `sidebar/data/index.ts` + `filter-nav-by-permisos.ts` | Visibilidad de menú |
| Scope datos | `mandante-scope.ts`, `equipo-scope.ts` | Filtrado por mandante y equipo |

---

## Inconsistencias encontradas y correcciones

### Corregidas en esta auditoría

| # | Problema | Impacto | Corrección |
|---|----------|---------|------------|
| 1 | `PERMISOS_COBRADOR` en constantes no incluía `MANDANTE_READ` ni `REPORTE_READ` | Drift seed ↔ código | Presets unificados en `permiso-codes.ts`, seed importa de ahí |
| 2 | `PERMISOS_SUPERVISOR` no incluía `MANDANTE_READ` | Drift seed ↔ código | Hereda de `PERMISOS_COBRADOR` |
| 3 | `equipo/page.tsx` usaba `LIQUIDACION_WRITE` para detectar gerente | Permiso financiero usado como jerarquía | `useEsGerente()` basado en `rolCodigo` |
| 4 | Rutas sin regla en middleware: `/cobranza/asignacion`, `/historial-cargas`, `/campanas/wizard` | Bypass de RBAC en UI | Reglas agregadas en `route-permissions.ts` |
| 5 | Catálogo duplicado en seed y constantes | Mantenimiento frágil | `PERMISOS_CATALOGO` como fuente única |
| 6 | Bloque redundante en seed re-asignando permisos a ADMIN | Código muerto | Eliminado |

### Patrones correctos (no son bugs)

| Patrón | Ubicación | Explicación |
|--------|-----------|-------------|
| `esSupervisor()` por rol en acuerdos | `acuerdo/mutations.ts` | Aprobación de descuentos altos — jerarquía, no permiso |
| `esGerente()` en dashboard gerente | `dashboard-gerente-service.ts` | Vista multi-equipo — jerarquía, no `LIQUIDACION_WRITE` |
| `filtroMandante()` | Todos los resolvers de cobranza | Scope de datos independiente del permiso |
| `CARTERA_READ` amplio | Clientes, préstamos, bandeja | Permiso operativo base; no es redundancia |

### Permisos redundantes

**No se eliminó ningún permiso.** Los 18 cubren módulos distintos. Lo que parecía redundante era **uso incorrecto** (`LIQUIDACION_WRITE` como proxy de gerente), no permisos duplicados.

---

## Presets de rol (referencia)

| Rol | Permisos |
|-----|----------|
| **COBRADOR** | Cartera lectura, mandante lectura, gestión, acuerdos, pagos, `REPORTE_COBRANZA_READ`, `REPORTE_OPERACION_READ` |
| **SUPERVISOR** | Cobrador + cartera escritura, inteligencia, equipo, liquidación lectura, `REPORTE_RIESGO_READ`, `REPORTE_EQUIPO_READ` |
| **GERENTE** | Supervisor + liquidación escritura, usuarios lectura, `REPORTE_FINANZAS_READ`, `REPORTE_GERENCIAL_READ` |
| **ADMIN** | Todos los permisos (incl. comodín `REPORTE_READ`) |

Definidos en `PERMISOS_COBRADOR`, `PERMISOS_SUPERVISOR`, `PERMISOS_GERENTE`, `PERMISOS_ADMIN`.

---

## Catálogo detallado por permiso

### ADMINISTRACIÓN (administrativo)

#### `USER_READ`

| Aspecto | Detalle |
|---------|---------|
| **Permite** | Ver usuarios, roles, permisos asignados; listar cobradores/supervisores |
| **No permite** | Crear/editar usuarios, modificar roles ni asignar permisos |
| **Módulos** | Configuración → Usuarios y permisos |
| **Middleware** | `/configuracion/usuarios` |
| **GraphQL** | `usuarios`, `usuario`, `roles`, `rol`, `permisos` |
| **Frontend** | Nav "Usuarios y permisos"; sección Configuración visible |

#### `USER_WRITE`

| Aspecto | Detalle |
|---------|---------|
| **Permite** | Crear/editar/desactivar usuarios; crear/editar roles; asignar permisos a roles |
| **No permite** | Acceso a configuración del sistema ni módulos de cobranza sin otros permisos |
| **Módulos** | Administración de identidades |
| **GraphQL** | `createUsuario`, `updateUsuario`, `createRol`, `updateRol`, `asignarPermisoRol`, etc. |
| **Frontend** | Botones de escritura en `/configuracion/usuarios` |

---

### CONFIGURACIÓN (administrativo)

#### `CONFIG_SYSTEM`

| Aspecto | Detalle |
|---------|---------|
| **Permite** | Ver/editar configuración global; auditoría; cron operativo; catálogos de sistema |
| **No permite** | Gestionar usuarios (requiere `USER_WRITE`); operaciones de cobranza |
| **Módulos** | Configuración → Sistema, Auditoría, Cron |
| **Middleware** | `/configuracion`, `/configuracion/auditoria`, `/configuracion/cron` |
| **GraphQL** | `configuraciones`, `updateConfiguracion`, `auditoria`, cron jobs, algunos queries de inteligencia admin |
| **Frontend** | Nav Configuración (parcial; también requiere `USER_READ` para ver usuarios) |

---

### COBRANZA — Mandante (operativo)

#### `MANDANTE_READ`

| Aspecto | Detalle |
|---------|---------|
| **Permite** | Consultar mandantes, contratos, políticas descuento, comisiones, horarios, plantillas mensaje |
| **No permite** | Crear/editar mandantes ni su configuración |
| **Módulos** | Mandantes, Plantillas, horarios cobranza (lectura) |
| **Middleware** | `/cobranza/mandantes`, `/cobranza/plantillas` |
| **GraphQL** | `mandantes`, `mandante`, `contratosMandante`, `politicasDescuento`, `comisionesCobro`, `plantillasMensaje`, `horariosCobranza` |
| **Frontend** | Nav Mandantes, Plantillas |

#### `MANDANTE_WRITE`

| Aspecto | Detalle |
|---------|---------|
| **Permite** | CRUD mandantes, contratos, tipificaciones, plantillas mensaje, comisiones, horarios, asignación usuario-mandante |
| **No permite** | Importar cartera ni registrar gestiones |
| **Módulos** | Configuración de mandante |
| **Middleware** | `/cobranza/plantillas-mensaje` |
| **GraphQL** | Mutations de mandante, contrato, plantilla-mensaje, comision-cobro, mandante-tipificacion, horario-cobranza; queries de asignación usuario-mandante |
| **Frontend** | Nav Plantillas mensaje |

---

### COBRANZA — Cartera (operativo)

#### `CARTERA_READ`

| Aspecto | Detalle |
|---------|---------|
| **Permite** | Ver cartera, préstamos, clientes (360°), bandeja, campañas, agencias, documentos, fiadores, catálogos, secuencias contacto, historial cargas |
| **No permite** | Importar, asignar cartera, modificar préstamos ni subir documentos |
| **Módulos** | Dashboard, Mi día, Clientes, Cartera, Bandeja, Campañas, Agencias, Historial cargas |
| **Middleware** | `/dashboard`, `/clientes`, `/cobranza/mi-dia`, `/cobranza/cartera`, `/cobranza/bandeja`, `/cobranza/campanas`, `/cobranza/agencias`, `/cobranza/prestamos`, `/cobranza/historial-cargas` |
| **GraphQL** | `prestamos`, `clientes`, `cliente360`, `bandejaCobrador`, `documentos`, `fiadores`, `catalogosCobranza`, `cargasCartera`, `secuenciasContacto`, varios dashboards |
| **Frontend** | Mayoría de entradas del menú Cobranza (lectura) |

#### `CARTERA_WRITE`

| Aspecto | Detalle |
|---------|---------|
| **Permite** | Importar cartera, asignar cobradores, modificar préstamos, plantillas importación, documentos, contactos deudor, campañas wizard |
| **No permite** | Registrar gestiones ni pagos (permisos propios) |
| **Módulos** | Importar, Asignación, Wizard campaña |
| **Middleware** | `/cobranza/importar`, `/cobranza/asignacion`, `/cobranza/campanas/wizard` |
| **API REST** | `POST /api/cobranza/importar`, `/importar/async`, upload documentos |
| **GraphQL** | Mutations préstamo, asignación-cartera, plantilla-importación, documento, deudor-contacto, secuencia-contacto; castigo cartera |
| **Frontend** | Nav Importar, Asignación, Wizard campaña |

---

### COBRANZA — Gestión (operativo)

#### `GESTION_READ`

| Aspecto | Detalle |
|---------|---------|
| **Permite** | Consultar gestiones, tipificaciones, reclamos, horarios (vista gestor) |
| **No permite** | Registrar gestiones ni reclamos |
| **Módulos** | Gestiones, Reclamos |
| **Middleware** | `/cobranza/gestiones`, `/cobranza/reclamos`, `/cobranza` (OR con CARTERA_READ) |
| **GraphQL** | `gestiones`, `tipificaciones`, `reclamos`, horario validación |
| **Frontend** | Nav Mis gestiones, Reclamos |

#### `GESTION_WRITE`

| Aspecto | Detalle |
|---------|---------|
| **Permite** | Registrar gestiones y reclamos |
| **No permite** | Crear acuerdos ni registrar pagos |
| **Módulos** | Operación diaria del cobrador |
| **GraphQL** | `createGestion`, mutations reclamo, acciones inteligencia operativas |
| **Frontend** | Formularios de gestión (implícito por acceso a página) |

---

### COBRANZA — Acuerdos (operativo)

#### `ACUERDO_READ`

| Aspecto | Detalle |
|---------|---------|
| **Permite** | Consultar acuerdos y promesas de pago |
| **No permite** | Crear ni modificar acuerdos |
| **GraphQL** | `acuerdos`, `acuerdo` |

#### `ACUERDO_WRITE`

| Aspecto | Detalle |
|---------|---------|
| **Permite** | Crear acuerdos, simular, evaluar cuotas |
| **No permite** | Aprobar descuentos sobre umbral sin ser supervisor (validación por **rol**, no permiso) |
| **GraphQL** | `createAcuerdo`, `cancelarAcuerdo` |
| **Jerarquía** | Descuentos altos requieren `esSupervisor()` en `equipo-scope.ts` |

---

### COBRANZA — Pagos (operativo)

#### `PAGO_READ`

| Aspecto | Detalle |
|---------|---------|
| **Permite** | Consultar pagos registrados |
| **No permite** | Registrar ni reversar pagos |
| **GraphQL** | `pagos`, `pago` |

#### `PAGO_WRITE`

| Aspecto | Detalle |
|---------|---------|
| **Permite** | Registrar y aplicar pagos |
| **No permite** | Liquidar a mandantes |
| **GraphQL** | `createPago`, `aplicarPago` |

---

### COBRANZA — Liquidación (operativo, financiero)

#### `LIQUIDACION_READ`

| Aspecto | Detalle |
|---------|---------|
| **Permite** | Consultar liquidaciones a mandantes |
| **No permite** | Crear ni emitir liquidaciones |
| **Módulos** | Liquidaciones |
| **Middleware** | `/cobranza/liquidaciones` |
| **GraphQL** | Queries liquidación |
| **Frontend** | Nav Liquidaciones |

#### `LIQUIDACION_WRITE`

| Aspecto | Detalle |
|---------|---------|
| **Permite** | Crear, calcular y emitir liquidaciones |
| **No permite** | Inferir jerarquía de gerente (uso prohibido en UI) |
| **GraphQL** | Mutations liquidación |
| **Nota** | Solo operación financiera; gerente se detecta por `rolCodigo === GERENTE` |

---

### COBRANZA — Analítica (operativo)

#### `REPORTE_READ` (comodín legacy)

| Aspecto | Detalle |
|---------|---------|
| **Permite** | Acceso a **todos** los reportes (equivalente a tener todos los grupos) |
| **Preferir** | Grupos granulares abajo. Se mantiene por compatibilidad. |
| **Registro** | `src/lib/permissions/reporte-permisos.ts` |

#### Grupos granulares

| Código | Cubierta |
|--------|----------|
| `REPORTE_COBRANZA_READ` | Hub KPIs / aging / forecast |
| `REPORTE_FINANZAS_READ` | Ganancias, comisiones, margen, ingreso tramo, vs proyección |
| `REPORTE_OPERACION_READ` | Efectividad, gestiones, promesas, productividad, recontactos |
| `REPORTE_RIESGO_READ` | Acuerdos, sin gestión, migración mora, concentración, cuotas, SLA |
| `REPORTE_GERENCIAL_READ` | Informe gerencial |
| `REPORTE_EQUIPO_READ` | Cumplimiento metas, supervisor vs equipo |

Cada query/ruta/nav consulta el registro `REPORTE_PERMISO_MAP` + el comodín `REPORTE_READ` vía `permisosDeReporte()` / `requerirReporte()`.

**Escalar a permiso por reporte o por usuario:** cambiar valores del mapa a códigos finos (p. ej. `REPORTE_GANANCIAS_READ`) y asignarlos al rol o al usuario; no hace falta reescribir N resolvers.

#### `INTELIGENCIA_READ`

| Aspecto | Detalle |
|---------|---------|
| **Permite** | Centro de inteligencia, roll rate, forecast, decisiones operativas |
| **No permite** | Configuración de sistema ni gestión de usuarios |
| **Módulos** | Centro de Inteligencia |
| **Middleware** | `/cobranza/centro-inteligencia` |
| **GraphQL** | Queries `inteligencia/*`, `rollRateCartera`, `forecastRecuperacion` |
| **Frontend** | Nav Centro de Inteligencia |

#### `EQUIPO_READ`

| Aspecto | Detalle |
|---------|---------|
| **Permite** | Dashboard supervisor/gerente, gamificación, rankings |
| **No permite** | Ver datos de equipos ajenos (scope por `obtenerIdsEquipo`) |
| **Módulos** | Mi equipo, Gamificación |
| **Middleware** | `/cobranza/equipo`, `/cobranza/gamificacion` |
| **GraphQL** | `dashboardSupervisor`, `dashboardGerente`, `rankingGestores`, gamificación |
| **Frontend** | Nav Mi equipo, Gamificación |
| **Jerarquía** | `dashboardGerente` además valida `esGerente()` por rol |

---

## Matriz rol → permisos

Ver `PERMISOS_COBRADOR`, `PERMISOS_SUPERVISOR`, `PERMISOS_GERENTE`, `PERMISOS_ADMIN` en `permiso-codes.ts`.

---

## Cómo extender el RBAC

1. Agregar entrada en `PERMISOS_CATALOGO` (`permiso-codes.ts`).
2. Ejecutar `npx tsx prisma/seed-permisos.ts` (upsert automático).
3. Para **reportes**: registrar clave en `reporte-permisos.ts` (`REPORTE_KEY` + mapa) y usar `requerirReporte()` / `permisosDeReporte()` en resolver, ruta y nav.
4. Proteger otras APIs con `requerirPermiso()` o `requerirAlgunPermiso()`.
5. Agregar regla en `route-permissions.ts` si hay página nueva.
6. Agregar entrada en `sidebar/data/index.ts`.
7. Actualizar esta documentación.
8. Tras seed de nuevos permisos de reportes: **re-login** (JWT cachea permisos).

**No** crear permisos para jerarquía. Usar `role-codes.ts` + `equipo-scope.ts`.

---

## Verificación

```bash
npx tsx prisma/seed-permisos.ts
npx tsx scripts/smoke-test-cobranza.ts
```

El smoke test valida que ADMIN tiene permisos de escritura y COBRADOR no tiene `CARTERA_WRITE`.
