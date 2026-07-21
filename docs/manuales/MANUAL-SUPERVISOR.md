# Manual del Supervisor — FlowPay

Guía operativa paso a paso para el rol **SUPERVISOR**.

**Versión:** 1.2.2

---

## 1. Permisos del rol

Incluye todo lo del cobrador, más:

| Código | Permite |
|--------|---------|
| `CARTERA_WRITE` | Importar cartera, asignar gestores, wizard de campaña |
| `INTELIGENCIA_READ` | Centro de Inteligencia |
| `EQUIPO_READ` | Mi equipo y gamificación |
| `LIQUIDACION_READ` | Consultar liquidaciones (sin emitir) |
| `REPORTE_RIESGO_READ` | Reportes de riesgo |
| `REPORTE_EQUIPO_READ` | Reportes de equipo |

Ve los **cobradores de su equipo** (jerarquía `idsupervisor`) y los mandantes asignados.

---

## 2. Responsabilidades

1. Supervisar productividad y calidad del equipo  
2. Importar y mantener cartera actualizada  
3. Asignar / reasignar casos  
4. Monitorear KPIs, alertas e inteligencia  
5. Aprobar acuerdos con descuento elevado  
6. Atender reclamos dentro del SLA  
7. Consultar liquidaciones (solo lectura)  
8. Crear y cerrar campañas de contacto  

También puede operar como cobrador sobre casos (gestiones, pagos, acuerdos).

---

## 3. Inicio de jornada recomendado

```
Login → Dashboard / Mi equipo → Centro de Inteligencia
  → Revisar promesas vencidas y casos sin gestión
  → Asignar cartera pendiente → Apoyar cobradores
  → Revisar importaciones / reclamos → Reportes
```

---

## 4. Mi equipo (`/cobranza/equipo`)

Dashboard de supervisión.

| KPI | Interpretación |
|-----|----------------|
| Gestiones hoy / ayer | Ritmo diario del equipo |
| Monto recuperado mes | Resultado económico |
| Promesas vencidas equipo | Riesgo de incumplimiento |
| Casos sin gestión 7d | Inactividad crítica |
| Tasa de contacto | % gestiones con contacto efectivo |
| Ranking | Cobradores por gestiones y recuperación |

**Acciones típicas:**

- Identificar cobradores bajo meta → coaching o reasignación  
- Detectar picos de promesas vencidas → campaña de seguimiento  
- Revisar casos sin gestión → redistribuir carga  

---

## 5. Gamificación (`/cobranza/gamificacion`)

Motivación del equipo:

| Concepto | Detalle |
|----------|---------|
| XP | Gestiones, monto recuperado, promesas cumplidas |
| Niveles | Inicial → Bronce → Plata → Oro → Elite |
| Insignias | Hitos (primera recuperación, meta semanal, etc.) |
| Metas | Semanales / mensuales según config del mandante |

Use el ranking para reforzar comportamientos, no solo castigar.

---

## 6. Centro de Inteligencia (`/cobranza/centro-inteligencia`)

1. Seleccionar **mandante**.  
2. Revisar:

| Indicador | Uso |
|-----------|-----|
| Salud de cartera (0–100) | Semáforo general |
| Recuperación del mes vs anterior | Tendencia |
| % préstamos en mora | Deterioro |
| Promesas vencidas | Operación |
| Acuerdos en riesgo | Negociación |
| Reclamos fuera de SLA | Cumplimiento |
| Insights | Alertas con acción sugerida |

Priorice insights de severidad alta.

---

## 7. Importar cartera (`/cobranza/importar`)

### Paso a paso

1. Ir a **Cobranza → Importar**.  
2. Seleccionar **mandante**.  
3. Seleccionar **plantilla** de mapeo Excel (columnas → campos).  
4. Subir el archivo Excel.  
5. (Opcional) Vista previa sin commit.  
6. Confirmar carga.  

Por defecto la importación es **asíncrona**:

- Se crea un job en cola  
- El worker `/api/cron/procesar-importaciones` procesa filas  
- El estado se consulta en **Historial de cargas**

### Historial de cargas (`/cobranza/historial-cargas`)

Revise:

- Estado del job (pendiente / procesando / completado / error)  
- Filas procesadas / fallidas  
- Mensajes de error por fila  

Si un job queda en `PROCESANDO` más de ~30 min, el sistema puede devolverlo a pendiente.

**Plantillas** (`/cobranza/plantillas`): mantenga el mapeo alineado con el layout del mandante antes de cada carga masiva.

---

## 8. Asignación de cartera (`/cobranza/asignacion`)

1. Ir a **Cobranza → Asignación**.  
2. Filtrar préstamos (sin gestor, por mandante, mora, campaña, etc.).  
3. Seleccionar uno o más préstamos.  
4. Elegir **cobrador destino**.  
5. Confirmar asignación masiva.  

El sistema actualiza el gestor asignado y deja traza en el historial del préstamo.

**Buenas prácticas:**

- Balancear carga (cantidad y saldo)  
- No reasignar en medio de una promesa del día sin avisar al cobrador  
- Revisar bloqueos de asignación si el caso lo tiene  

---

## 9. Campañas

| Ruta | Uso |
|------|-----|
| `/cobranza/campanas` | Listar / activar / cerrar |
| `/cobranza/campanas/wizard` | Crear con filtros de cartera |

Flujo:

1. Definir nombre, mandante y criterios (mora, sin gestión, tramo, etc.).  
2. Activar la campaña.  
3. Asignar o trabajar la población desde bandeja / asignación.  
4. Cerrar cuando termine el periodo.

Secuencias de contacto se configuran a nivel mandante (etapas TMC, SMS, visita, etc.).

---

## 10. Aprobación de acuerdos con descuento alto

Cuando un cobrador propone un acuerdo cuyo % de descuento supera  
`acuerdoDescuentoMaxSinAprobacion` (config del mandante):

1. El sistema exige aprobación de supervisor.  
2. El supervisor revisa el caso en el detalle del préstamo / flujo de aprobación.  
3. Aprueba o rechaza según política comercial.

Documente el motivo en la nota del acuerdo.

---

## 11. Reclamos (`/cobranza/reclamos`)

1. Filtrar por estado y vencimiento de SLA.  
2. Tomar reclamos `ABIERTO` → pasar a `EN_PROCESO`.  
3. Resolver con evidencia → `RESUELTO`.  

El cron `reclamos_sla` escala los que exceden el plazo.  
Monitoree también el reporte **SLA reclamos**.

---

## 12. Liquidaciones (solo lectura)

Ruta: `/cobranza/liquidaciones`

Puede **consultar** periodos, montos y estado (`BORRADOR` / `EMITIDA` / `PAGADA`).  
**No puede emitir ni marcar pagada** (eso es gerente/admin con `LIQUIDACION_WRITE`).

---

## 13. Conciliaciones (`/cobranza/conciliaciones`)

Revise pagos pendientes de aplicación vs aplicados.  
Coordine con operación/finanzas para que la recuperación contable sea correcta.

---

## 14. Operación como cobrador

El supervisor conserva las pantallas del cobrador:

- Mi día, bandeja, gestiones, detalle de préstamo  
- Registro de gestiones, pagos y acuerdos  

Úselo para casos especiales, coaching en vivo o cobertura de ausencias.

Ver [MANUAL-COBRADOR.md](./MANUAL-COBRADOR.md).

---

## 15. Reportes del supervisor

Además del hub de cobranza:

- Efectividad, productividad diaria, cumplimiento de metas  
- Supervisor vs equipo  
- Promesas, acuerdos, cartera sin gestión, recontactos  
- Migración de mora, concentración de riesgo (grupo riesgo)  

Detalle: [MANUAL-REPORTES.md](./MANUAL-REPORTES.md).

---

## 16. Agencias (`/cobranza/agencias`)

Consulta / mantenimiento de agencias y rutas operativas según permiso de cartera.

---

## 17. Restricciones del rol

| Acción | ¿Permitido? |
|--------|-------------|
| Crear / editar usuarios | No |
| Editar permisos de roles | No |
| Emitir liquidación | No |
| Configuración sistema / auditoría / cron | No |
| Ver todos los mandantes del sistema | Solo los asignados |

---

## 18. Checklist semanal

- [ ] Importaciones del periodo sin errores  
- [ ] Cartera sin gestor = 0 o mínima  
- [ ] Casos sin gestión 7d en descenso  
- [ ] Promesas vencidas bajo umbral interno  
- [ ] Reclamos dentro de SLA  
- [ ] Ranking y metas revisados con el equipo  
- [ ] Insights del Centro de Inteligencia atendidos  

---

## 19. Problemas frecuentes

| Síntoma | Qué hacer |
|---------|-----------|
| Importación falla | Revisar plantilla y columnas; ver historial de cargas |
| Job atascado | Esperar reintento del cron o contactar admin |
| Cobrador no ve casos | Verificar asignación y mandantes del usuario |
| No aparece Centro de Inteligencia | Confirmar `INTELIGENCIA_READ` en el rol |
| No puede emitir liquidación | Esperado; escalar a gerente |

---

## 20. Validación UAT

Sección **Supervisor** en [UAT-COBRANZA.md](../UAT-COBRANZA.md).

---

## 21. Documentos relacionados

- [MANUAL-GERENTE.md](./MANUAL-GERENTE.md)  
- [MANUAL-MANDANTE.md](./MANUAL-MANDANTE.md)  
- [CATALOGO-PROCESOS.md](../catalogos/CATALOGO-PROCESOS.md)  
- [CATALOGO-KPIs.md](../catalogos/CATALOGO-KPIs.md)
