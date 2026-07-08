# Manual Funcional — FlowPay

Documento de referencia funcional del sistema de cobranza.

---

## 1. Propósito

FlowPay gestiona el ciclo completo de recuperación de cartera para uno o más **mandantes** (entidades acreedoras). Permite:

- Cargar y mantener cartera (préstamos y clientes)
- Asignar casos a cobradores
- Registrar gestiones, acuerdos y pagos
- Medir desempeño (KPIs, gamificación)
- Liquidar recuperación a mandantes
- Auditar operaciones y ejecutar procesos automáticos

---

## 2. Actores

| Actor | Descripción | Acceso |
|-------|-------------|--------|
| **Cobrador** | Gestiona casos asignados | Mi día, bandeja, gestiones, pagos |
| **Supervisor** | Supervisa equipo y cartera | + asignación, importación, equipo, inteligencia |
| **Gerente** | Gestión multi-equipo | + usuarios (lectura), liquidaciones (escritura) |
| **Administrador** | Configuración total | Todos los permisos |
| **Mandante** | Entidad acreedora (datos) | No tiene login propio; se configura y liquida |

---

## 3. Módulos funcionales

### 3.1 Dashboard

Resumen según rol y mandantes asignados al usuario.

- **Cobrador:** cartera, mora, gestiones/pagos del mes, promesas vencidas
- **Supervisor:** métricas del equipo, ranking, casos sin gestión
- **Gerente:** consolidado multi-supervisor, reclamos fuera de SLA

### 3.2 Mi día y Bandeja

Priorización de casos para el cobrador:

- **Mi día:** agenda del día, promesas, recuperación diaria
- **Bandeja:** cola priorizada por score (mora, promesas, última gestión)

### 3.3 Cartera y clientes

- Consulta de préstamos con filtros (mora, estado, gestor)
- **Cliente 360:** vista consolidada del deudor
- **Asignación:** reasignación masiva de gestor
- **Importación:** carga Excel async con jobs en cola

### 3.4 Gestión de cobro

- Registro de tipificación, resultado, próxima gestión
- Promesas de pago con fecha y monto
- Validación de horarios de contacto por mandante
- Timeline del préstamo (historial de estados y eventos)

### 3.5 Acuerdos y pagos

- Simulación y creación de acuerdos de pago
- Aprobación de descuentos altos (jerarquía supervisor)
- Registro de pagos con aplicación a saldo
- Conciliación de pagos

### 3.6 Mandantes y configuración

- Alta/edición de mandantes, contratos, plantillas de importación
- Políticas de descuento, horarios, metas por mandante
- Secuencias de contacto y campañas

### 3.7 Centro de Inteligencia

Analytics operativos: salud de cartera, recuperación mensual, insights automáticos, aging.

### 3.8 Reportes y liquidaciones

- Aging de cartera, reporte de cobranza, export CSV
- Liquidaciones periódicas a mandantes

### 3.9 Reclamos

Gestión de reclamos con SLA y escalamiento automático.

### 3.10 Administración

- Usuarios, roles y permisos (RBAC)
- Auditoría de acciones
- Monitor de jobs cron
- Configuración global del sistema

---

## 4. Alcance de datos (multi-mandante)

Cada usuario tiene acceso solo a los mandantes asignados en `tbl_usuario_mandante`. Los supervisores ven su equipo; los gerentes ven equipos de sus supervisores.

---

## 5. Integraciones

| Canal | Uso |
|-------|-----|
| GraphQL | API principal (`/api/graphql`) |
| REST | Auth, cron, importación async, uploads |
| Cron externo | Vercel Cron o scheduler con `Authorization: Bearer CRON_SECRET` |

---

## 6. Documentos relacionados

- [MANUAL-COBRADOR.md](./MANUAL-COBRADOR.md)
- [MANUAL-SUPERVISOR.md](./MANUAL-SUPERVISOR.md)
- [MANUAL-ADMINISTRADOR.md](./MANUAL-ADMINISTRADOR.md)
- [MANUAL-MANDANTE.md](./MANUAL-MANDANTE.md)
- [CATALOGO-PROCESOS.md](../catalogos/CATALOGO-PROCESOS.md)
- [UAT-COBRANZA.md](../UAT-COBRANZA.md)
