# Manual Funcional — FlowPay

**Versión del producto:** 1.2.2  
**Audiencia:** todos los roles  
**Idioma de la interfaz:** español

Documento de referencia funcional del sistema de **recuperación de cartera**. Describe qué hace FlowPay, quién lo usa y cómo se relacionan los módulos.

---

## 1. ¿Qué es FlowPay?

FlowPay es una plataforma empresarial para agencias de cobranza que administran préstamos por cuenta de **mandantes** (entidades acreedoras).

Permite el ciclo completo:

1. Cargar cartera (préstamos y clientes) desde Excel  
2. Asignar casos a cobradores  
3. Registrar gestiones, promesas, acuerdos y pagos  
4. Medir desempeño (KPIs, gamificación, reportes)  
5. Liquidar la recuperación al mandante  
6. Auditar operaciones y ejecutar procesos automáticos (cron)

**No es** un wallet digital ni un portal de comercios. El dominio es cobranza / recuperación de cartera.

---

## 2. Actores del sistema

| Actor | Descripción | ¿Tiene login? |
|-------|-------------|---------------|
| **Cobrador** | Gestiona casos asignados (llamadas, visitas, tipificación) | Sí |
| **Supervisor** | Supervisa equipo, asigna cartera, importa, aprueba descuentos | Sí |
| **Gerente** | Visión multi-equipo, liquidaciones y reportes gerenciales | Sí |
| **Administrador** | Usuarios, permisos, cron, auditoría, configuración global | Sí |
| **Mandante** | Entidad acreedora (dato maestro); recibe liquidaciones y reportes | No (sin portal propio) |
| **Cliente / deudor** | Persona o empresa con préstamo en mora | No |

Detalle por rol:

- [MANUAL-COBRADOR.md](./MANUAL-COBRADOR.md)  
- [MANUAL-SUPERVISOR.md](./MANUAL-SUPERVISOR.md)  
- [MANUAL-GERENTE.md](./MANUAL-GERENTE.md)  
- [MANUAL-ADMINISTRADOR.md](./MANUAL-ADMINISTRADOR.md)  
- [MANUAL-MANDANTE.md](./MANUAL-MANDANTE.md)

---

## 3. Acceso y sesión

| Tema | Detalle |
|------|---------|
| URL de login | `/login` |
| Credenciales | Email + contraseña (provisionadas por administrador) |
| Registro público | No existe |
| Recuperación de contraseña | No existe en self-service; la gestiona el admin |
| Sesión | Cookie HTTP-only (`auth-token`), JWT ~8 h |
| Perfil | `/perfil` — datos del usuario autenticado |
| Cierre de sesión | Desde el menú de usuario → logout |

Tras cambios de permisos en un rol, el usuario debe **cerrar sesión y volver a entrar** (o refrescar sesión) para que el JWT se actualice.

---

## 4. Mapa de navegación

El menú lateral muestra solo lo autorizado por RBAC.

### 4.1 Menú principal

| Ítem | Ruta | Permiso típico |
|------|------|----------------|
| Dashboard | `/dashboard` | `CARTERA_READ` |
| Mi día | `/cobranza/mi-dia` | `CARTERA_READ` |
| Clientes | `/clientes` | `CARTERA_READ` |

### 4.2 Cobranza

| Ítem | Ruta | Uso |
|------|------|-----|
| Mi bandeja | `/cobranza/bandeja` | Cola priorizada del cobrador |
| Mis gestiones | `/cobranza/gestiones` | Historial de gestiones |
| Cartera | `/cobranza/cartera` | Listado de préstamos |
| Campañas | `/cobranza/campanas` | Campañas de contacto |
| Wizard campaña | `/cobranza/campanas/wizard` | Alta de campaña |
| Reclamos | `/cobranza/reclamos` | Reclamos con SLA |
| Centro de Inteligencia | `/cobranza/centro-inteligencia` | Analytics operativos |
| Mi equipo | `/cobranza/equipo` | Dashboard del supervisor |
| Gamificación | `/cobranza/gamificacion` | Ranking e insignias |
| Mandantes | `/cobranza/mandantes` | Entidades acreedoras |
| Importar | `/cobranza/importar` | Carga Excel de cartera |
| Historial cargas | `/cobranza/historial-cargas` | Jobs de importación |
| Asignación | `/cobranza/asignacion` | Asignar gestores |
| Plantillas | `/cobranza/plantillas` | Plantillas de importación |
| Plantillas mensaje | `/cobranza/plantillas-mensaje` | Mensajes / plantillas de contacto |
| Agencias | `/cobranza/agencias` | Agencias / rutas |
| Liquidaciones | `/cobranza/liquidaciones` | Cierre a mandante |
| Conciliaciones | `/cobranza/conciliaciones` | Pagos aplicados / pendientes |

Detalle del préstamo: `/cobranza/prestamos/[id]`  
Cliente 360: `/clientes/[id]`

### 4.3 Reportes

Hub: `/cobranza/reportes`  
Detalle completo: [MANUAL-REPORTES.md](./MANUAL-REPORTES.md)

### 4.4 Configuración

| Ítem | Ruta |
|------|------|
| Sistema | `/configuracion` |
| Auditoría | `/configuracion/auditoria` |
| Cron operativo | `/configuracion/cron` |
| Usuarios y permisos | `/configuracion/usuarios` |

---

## 5. Módulos funcionales (detalle)

### 5.1 Dashboard

Resumen según rol y mandantes asignados:

- **Cobrador:** cartera propia, mora, gestiones/pagos del mes, promesas vencidas  
- **Supervisor:** métricas del equipo, ranking, casos sin gestión  
- **Gerente:** consolidado multi-supervisor, reclamos fuera de SLA  
- **Admin:** visión completa + accesos de configuración  

### 5.2 Mi día y Bandeja

Priorización operativa del cobrador:

- **Mi día:** agenda del día, promesas de hoy, promesas vencidas, recuperación diaria  
- **Bandeja:** cola ordenada por score (mora, promesas, última gestión, etc.)

### 5.3 Cartera y clientes

- Consulta de préstamos con filtros (mandante, mora, estado, gestor)  
- **Cliente 360:** vista consolidada del deudor (préstamos, gestiones, pagos)  
- **Asignación:** reasignación masiva de gestor  
- **Importación:** carga Excel asíncrona con jobs en cola  

### 5.4 Gestión de cobro

- Tipificación (acción + resultado)  
- Notas, próxima gestión, promesa (fecha + monto)  
- Validación de horarios de contacto (Ley 787 / config mandante)  
- Timeline del préstamo (estados y eventos)

### 5.5 Acuerdos y pagos

- Simulación y creación de acuerdos de pago (cuotas)  
- Aprobación de descuentos altos por jerarquía (supervisor)  
- Registro de pagos: medios `EFECTIVO` / `TRANSFERENCIA`, monedas `NIO` / `USD`  
- Solo pagos con `aplicado = true` cuentan en recuperación y liquidación  
- Conciliación de pagos  

### 5.6 Mandantes y configuración operativa

- Alta/edición de mandantes, contratos, comisiones por tramo de mora  
- Plantillas de importación, tipificaciones, plantillas de mensaje  
- Políticas de descuento, horarios, metas, secuencias de contacto  

### 5.7 Centro de Inteligencia

Analytics: salud de cartera, recuperación mensual, insights, aging, alertas (promesas, acuerdos en riesgo, reclamos SLA).

### 5.8 Reportes y liquidaciones

- Suite de reportes operativos, de riesgo y financieros  
- Liquidaciones periódicas: `BORRADOR` → `EMITIDA` → `PAGADA`

### 5.9 Reclamos

Estados: `ABIERTO` → `EN_PROCESO` → `RESUELTO`  
Escalamiento automático si se excede el SLA (cron).

### 5.10 Administración

- Usuarios, roles y permisos (RBAC)  
- Auditoría de acciones  
- Monitor de jobs cron  
- Configuración global  

---

## 6. Alcance de datos (multi-mandante y jerarquía)

| Capa | Comportamiento |
|------|----------------|
| Mandante | El usuario solo ve mandantes en `tbl_usuario_mandante` |
| Equipo | El cobrador ve sus casos; el supervisor ve su equipo |
| Jerarquía | El gerente ve supervisores y sus equipos |
| Admin | Acceso amplio según permisos |

---

## 7. Monedas y medios de pago

| Concepto | Valores |
|----------|---------|
| Monedas | `NIO` (default), `USD` (+ tipo de cambio) |
| Medios de pago | `EFECTIVO`, `TRANSFERENCIA` |

---

## 8. Estados clave del negocio

### Préstamo

Vigente · Vencido · En negociación · Con acuerdo · Pendiente revisión · Castigo · Cancelado · Finalizado

### Acuerdo

`VIGENTE` · `CUMPLIDO` · `ROTO`

### Cuota de acuerdo

`PENDIENTE` · `PAGADA` · `VENCIDA`

### Liquidación

`BORRADOR` · `EMITIDA` · `PAGADA`

### Campaña

`ACTIVA` · `INACTIVA` · `CERRADA`

### Reclamo

`ABIERTO` · `EN_PROCESO` · `RESUELTO`

Detalle: [CATALOGO-REGLAS-NEGOCIO.md](../catalogos/CATALOGO-REGLAS-NEGOCIO.md)

---

## 9. Procesos automáticos (cron)

Job maestro diario (~06:00):

1. Acuerdos vencidos  
2. Recálculo de mora  
3. Castigo de cartera  
4. Promesas vencidas  
5. Reclamos SLA  
6. Importaciones pendientes  
7. Retención de auditoría  

Importaciones: worker diario 07:00 + procesamiento on-demand al subir.

Detalle: [CATALOGO-PROCESOS.md](../catalogos/CATALOGO-PROCESOS.md)

---

## 10. Integraciones técnicas

| Canal | Uso |
|-------|-----|
| GraphQL | API principal (`/api/graphql`) |
| REST | Auth, cron, importación async, uploads, email |
| Cron externo | Scheduler con `Authorization: Bearer CRON_SECRET` |
| SMTP (opcional) | Envío de correos de cobranza |
| Sentry (opcional) | Monitoreo de errores |

---

## 11. Glosario rápido

| Término | Significado |
|---------|-------------|
| Mandante | Entidad acreedora dueña de la cartera |
| Cartera | Conjunto de préstamos bajo gestión |
| Gestión | Registro de un contacto / intento de cobro |
| Tipificación | Código de acción + resultado del contacto |
| Promesa | Compromiso informal de pago (fecha + monto) |
| Acuerdo | Plan formal de pago en cuotas |
| Liquidación | Cierre periódico de recuperación al mandante |
| Mora | Días de atraso del préstamo |
| Castigo | Estado de cartera irrecuperable según política |
| Bandeja | Cola de trabajo priorizada del cobrador |

Glosario completo: [GLOSARIO.md](../GLOSARIO.md)

---

## 12. Documentos relacionados

- [MANUAL-COBRADOR.md](./MANUAL-COBRADOR.md)  
- [MANUAL-SUPERVISOR.md](./MANUAL-SUPERVISOR.md)  
- [MANUAL-GERENTE.md](./MANUAL-GERENTE.md)  
- [MANUAL-ADMINISTRADOR.md](./MANUAL-ADMINISTRADOR.md)  
- [MANUAL-MANDANTE.md](./MANUAL-MANDANTE.md)  
- [MANUAL-REPORTES.md](./MANUAL-REPORTES.md)  
- [CATALOGO-PROCESOS.md](../catalogos/CATALOGO-PROCESOS.md)  
- [CATALOGO-KPIs.md](../catalogos/CATALOGO-KPIs.md)  
- [UAT-COBRANZA.md](../UAT-COBRANZA.md)
