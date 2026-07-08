# Catálogo de Reglas de Negocio — FlowPay

Reglas implementadas en servicios. No modificar sin revisar impacto en cron y reportes.

---

## 1. Estados de préstamo

Fuente: `estado-prestamo-service.ts`

| Estado | Descripción |
|--------|-------------|
| Vigente | Al día o dentro de gracia |
| Vencido | Con mora activa |
| En negociación | En proceso de acuerdo |
| Con acuerdo | Acuerdo formal vigente |
| Pendiente revisión | Requiere validación |
| Castigo | Cartera castigada |
| Cancelado | Cerrado sin saldo |
| Finalizado | Cerrado con saldo cero |

### Transiciones permitidas

```
Vigente → Vencido, En negociación, Con acuerdo, Cancelado, Finalizado, Pendiente revisión
Vencido → En negociación, Con acuerdo, Castigo, Cancelado, Finalizado, Pendiente revisión
En negociación → Con acuerdo, Vencido, Cancelado, Castigo
Con acuerdo → Vencido, Cancelado, Finalizado, Castigo
Pendiente revisión → Vigente, Vencido, Cancelado, Finalizado
Castigo → Cancelado, Finalizado
```

Estados protegidos (no sobrescritos por mora automática): En negociación, Con acuerdo, Pendiente revisión, Castigo.

---

## 2. Mora

| Regla | Detalle |
|-------|---------|
| Cálculo | `diasMora` recalculado por cron `mora_recalculo` |
| Feriados | Considera calendario Nicaragua (`seed-feriados-nicaragua`) |
| Acuerdos | Cuotas vencidas evaluadas antes del recálculo |
| Tramos | Definidos en `tramos-mora.ts` para aging e insights |

Ver: [MORA-AUTOMATICA.md](../MORA-AUTOMATICA.md)

---

## 3. Castigo de cartera

| Regla | Detalle |
|-------|---------|
| Trigger | `diasMora >= diasMoraCastigo` (config mandante) |
| Acción | Transición a estado Castigo |
| Cron | `castigo_cartera` (después de mora) |

Ver: [CASTIGO-CARTERA.md](../CASTIGO-CARTERA.md)

---

## 4. Acuerdos de pago

| Regla | Detalle |
|-------|---------|
| Simulación | `acuerdo-simulator.ts` — cuotas y descuentos |
| Aprobación | Descuento > `acuerdoDescuentoMaxSinAprobacion` requiere supervisor |
| Cuotas vencidas | Cron `acuerdos_vencidos` marca acuerdos rotos |
| Días de gracia | `acuerdoDiasGracia` en config mandante |

---

## 5. Promesas de pago

| Regla | Detalle |
|-------|---------|
| Registro | En gestión con `fechaPromesa` y monto |
| Evaluación | Cron `promesas_vencidas` — cumplida vs vencida |
| Alertas | Dashboard, Mi día, Centro de Inteligencia |

---

## 6. Pagos

| Regla | Detalle |
|-------|---------|
| Aplicación | Campo `aplicado` — solo estos cuentan en recuperación |
| Auto-aplicar | `pagoAutoAplicar` en config mandante |
| Conciliación | Módulo `/cobranza/conciliaciones` |
| Atribución | Por `idgestor` o gestor asignado al préstamo |

---

## 7. Reclamos y SLA

| Regla | Detalle |
|-------|---------|
| Estados | ABIERTO → EN_PROCESO → CERRADO |
| SLA | Plazo configurable; cron `reclamos_sla` escala fuera de plazo |
| KPI | `reclamosFueraSla` en centro de inteligencia |

---

## 8. Horarios de contacto

| Regla | Detalle |
|-------|---------|
| Validación | `contacto-compliance-service.ts` |
| Config | Por mandante en horarios de cobranza |
| UI | Alerta `horario-alerta.tsx` en formulario de gestión |

---

## 9. Asignación y scope

| Regla | Detalle |
|-------|---------|
| Mandante | Usuario solo ve mandantes en `tbl_usuario_mandante` |
| Equipo | Cobrador ve sus casos; supervisor ve equipo (`equipo-scope.ts`) |
| Jerarquía | Gerente ve supervisores y sus equipos |

---

## 10. Importación de cartera

| Regla | Detalle |
|-------|---------|
| Plantilla | Mapeo por mandante obligatorio |
| Async default | Job en cola; no bloquea UI |
| Concurrencia | `IMPORT_MAX_CONCURRENT`, `IMPORT_MAX_JOBS_PER_RUN` |
| Atascados | PROCESANDO > 30 min → PENDIENTE |

---

## 11. Liquidaciones

| Regla | Detalle |
|-------|---------|
| Permiso escritura | `LIQUIDACION_WRITE` (gerente/admin) |
| Base | Pagos aplicados en periodo |
| Comisiones | `comision-cobro-service.ts` |

---

## 12. Retención de datos

| Regla | Detalle |
|-------|---------|
| Auditoría | `AUDIT_RETENTION_DAYS` (default 90) |
| Cron ejecuciones | `CRON_RETENTION_DAYS` |
| Job | `auditoria_retencion` |

---

## 13. Seguridad operativa

| Regla | Detalle |
|-------|---------|
| Sesión | JWT 8h en cookie HTTP-only |
| CSRF | Header obligatorio en mutaciones |
| Rate limit login | Por email, distribuido en prod |
| GraphQL prod | Sin introspection anónima |
