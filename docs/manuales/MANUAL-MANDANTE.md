# Manual del Mandante — FlowPay

Guía sobre la entidad **mandante** en FlowPay.

> **Nota:** FlowPay no expone un portal de login para mandantes externos. Este manual describe cómo se representa el mandante en el sistema, qué se configura y qué entregables recibe la entidad acreedora.

---

## 1. Concepto

Un **mandante** es la entidad acreedora cuya cartera se administra en FlowPay (`tbl_mandante`). Ejemplo de seed: **CREDICOMPRAS**.

Cada operación (préstamo, gestión, pago) está asociada a un `idmandante`.

---

## 2. Configuración (Admin / Supervisor)

### Datos maestros (`/cobranza/mandantes`)

| Elemento | Descripción |
|----------|-------------|
| Código y nombre | Identificación del mandante |
| Estado activo | Habilita operaciones |
| Contrato | Condiciones comerciales |
| Configuración operativa | Metas, castigo, descuentos, horarios |

### Plantillas de importación (`/cobranza/plantillas`)

Mapeo de columnas Excel → campos del sistema por mandante.

### Tipificaciones y políticas

Desde el hub del mandante:

- Tipificaciones de gestión
- Políticas de descuento
- Horarios de contacto permitidos
- Secuencias de contacto / campañas

---

## 3. Alcance de usuarios

Los usuarios solo ven mandantes asignados en `tbl_usuario_mandante`.

| Rol típico | Acceso mandante |
|------------|-----------------|
| Cobrador | Mandantes asignados, solo operación |
| Supervisor | Mandantes del equipo |
| Gerente | Mandantes de su organización |
| Admin | Todos |

---

## 4. Entregables al mandante

### 4.1 Liquidaciones (`/cobranza/liquidaciones`)

Documento periódico con:

- Pagos recuperados en el periodo
- Comisiones y neto a liquidar
- Generación: permiso `LIQUIDACION_WRITE` (gerente/admin)

### 4.2 Reportes (`/cobranza/reportes`)

| Reporte | Contenido |
|---------|-----------|
| Aging de cartera | Tramos de mora y saldos |
| Reporte de cobranza | Gestiones, recuperación, KPIs |
| Export CSV | Descarga para análisis externo |

### 4.3 Conciliaciones (`/cobranza/conciliaciones`)

Estado de pagos aplicados vs pendientes de conciliar.

---

## 5. KPIs visibles para el mandante

(vía reportes y centro de inteligencia del operador)

| KPI | Fuente |
|-----|--------|
| Cartera total / en mora | `tbl_prestamo` |
| Recuperación del mes | `tbl_pago` (aplicado) |
| Gestiones del mes | `tbl_gestion` |
| Promesas abiertas / vencidas | `tbl_gestion` |
| Acuerdos vigentes | `tbl_acuerdo` |

Detalle: [CATALOGO-KPIs.md](../catalogos/CATALOGO-KPIs.md)

---

## 6. Procesos automáticos que afectan al mandante

| Proceso | Impacto |
|---------|---------|
| Recálculo de mora | Actualiza `diasMora` de préstamos |
| Castigo | Cambia estado a Castigo según política |
| Acuerdos vencidos | Marca acuerdos rotos |
| Promesas vencidas | Alertas operativas |

Detalle: [CATALOGO-PROCESOS.md](../catalogos/CATALOGO-PROCESOS.md)

---

## 7. Integración futura (roadmap)

Portal mandante de solo lectura (reportes + liquidaciones) está planificado en [ROADMAP.md](../ROADMAP.md) como mejora P3.

---

## 8. Validación

Configuración mandante CREDICOMPRAS en seed. UAT supervisor sección importación y reportes en [UAT-COBRANZA.md](../UAT-COBRANZA.md).
