# Manual del Supervisor — FlowPay

Guía operativa para el rol **SUPERVISOR**.

**Permisos:** todos los del cobrador + `CARTERA_WRITE`, `INTELIGENCIA_READ`, `EQUIPO_READ`, `LIQUIDACION_READ`

---

## 1. Responsabilidades

- Supervisar desempeño del equipo de cobradores
- Asignar y reasignar cartera
- Importar actualizaciones de cartera
- Monitorear KPIs operativos y alertas
- Aprobar acuerdos con descuento elevado
- Consultar liquidaciones (sin emitir)

---

## 2. Dashboard de equipo

### Mi equipo (`/cobranza/equipo`)

| KPI | Descripción |
|-----|-------------|
| Gestiones hoy / ayer | Comparativo diario del equipo |
| Monto recuperado mes | Suma de pagos aplicados |
| Promesas vencidas equipo | Casos con promesa incumplida |
| Casos sin gestión 7d | Inactividad crítica |
| Tasa de contacto | % gestiones efectivas |
| Ranking | Cobradores por gestiones y recuperación |

### Gamificación (`/cobranza/gamificacion`)

Rankings, niveles (Inicial → Elite), insignias y metas semanales.

---

## 3. Operaciones de cartera

### Importar (`/cobranza/importar`)

1. Seleccionar mandante y plantilla
2. Subir archivo Excel
3. **Modo async (default):** job en cola, monitorear en historial
4. Vista previa disponible sin commit

### Asignación (`/cobranza/asignacion`)

1. Filtrar préstamos sin gestor o por criterio
2. Seleccionar cobrador destino
3. Confirmar asignación masiva

### Historial de cargas (`/cobranza/historial-cargas`)

Auditoría de importaciones: estado, filas procesadas, errores.

---

## 4. Centro de Inteligencia (`/cobranza/centro-inteligencia`)

Seleccionar mandante para ver:

- Salud de cartera (score 0–100)
- Recuperación del mes vs mes anterior
- % préstamos en mora
- Promesas vencidas, acuerdos en riesgo, reclamos fuera SLA
- Insights automáticos con acción sugerida

---

## 5. Campañas y secuencias

| Módulo | Uso |
|--------|-----|
| `/cobranza/campanas` | Listar campañas activas |
| `/cobranza/campanas/wizard` | Crear campaña con filtros |
| Mandante → secuencias | Contacto automatizado por etapas |

---

## 6. Reclamos y liquidaciones

- **Reclamos** (`/cobranza/reclamos`): atender dentro del SLA; escalamiento automático si vence
- **Liquidaciones** (`/cobranza/liquidaciones`): consulta de periodos liquidados (solo lectura)

---

## 7. Aprobaciones de jerarquía

Cuando un cobrador propone acuerdo con descuento superior al umbral del mandante (`acuerdoDescuentoMaxSinAprobacion`), el supervisor debe aprobar la operación.

---

## 8. Restricciones del rol

| Acción | ¿Permitido? |
|--------|-------------|
| Crear usuarios | No |
| Emitir liquidación | No |
| Configuración sistema / auditoría | No |
| Editar permisos de roles | No |

---

## 9. Validación

Escenarios UAT: sección **Supervisor** en [UAT-COBRANZA.md](../UAT-COBRANZA.md).
