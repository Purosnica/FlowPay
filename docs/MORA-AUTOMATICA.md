# Mora automática — FlowPay

Documentación técnica del cálculo y sincronización de días de mora.

**Servicio:** `src/lib/cobranza/dias-mora-service.ts`  
**Cron:** `mora_recalculo` (después de `acuerdos_vencidos` en el master diario)

---

## 1. Objetivo

Mantener `tbl_prestamo.diasMora` como **fuente única** consumida por:

- Bandeja y Mi día (priorización)  
- Estados de préstamo (Vigente / Vencido)  
- Castigo automático  
- Aging y reportes de riesgo  
- Centro de Inteligencia  

---

## 2. Fórmula (`calcularDiasMora`)

Función pura a partir de:

| Campo | Uso |
|-------|-----|
| `fechaVencimiento` | Inicio del conteo |
| `saldoTotal` | Sin saldo → mora 0 |
| `estado` | Cancelado / Finalizado → mora 0 |
| `acuerdoVigente` + `fechaInicioAcuerdo` | Congela mora al inicio del acuerdo |
| `diasGracia` | Se restan del conteo |
| `fechaCalculo` | Default: hoy (00:00) |

### Reglas

1. `saldoTotal <= 0` o estado terminal → **0**  
2. Sin `fechaVencimiento` → **0**  
3. Si `fechaCalculo <= fechaVencimiento` → **0**  
4. Con acuerdo vigente → mora = días entre vencimiento e inicio de acuerdo, menos gracia (no sigue creciendo)  
5. Sin acuerdo → mora = días entre vencimiento y fecha de cálculo, menos gracia  
6. Resultado nunca negativo (`Math.max(0, …)`)  

**Nota:** los pagos parciales **no reinician** el conteo; solo la liquidación total (saldo ≤ 0) lo pone en 0.

---

## 3. Sincronización persistente

`sincronizarDiasMoraPrestamo` (nombre según implementación):

1. Carga datos del préstamo + acuerdo vigente  
2. Calcula nuevo `diasMora`  
3. Persiste si cambió  
4. Dispara efectos derivados:
   - `sincronizarEstadoPorMora` (Vigente ↔ Vencido cuando aplica)  
   - `evaluarCastigoPrestamo`  

Estados **protegidos** (no sobrescritos por mora automática):  
En negociación, Con acuerdo, Pendiente revisión, Castigo.

Detalle de transiciones: [CATALOGO-REGLAS-NEGOCIO.md](./catalogos/CATALOGO-REGLAS-NEGOCIO.md)

---

## 4. Job batch

El cron `mora_recalculo` recorre préstamos activos y sincroniza en lote.

Orden en el master (`operaciones_cobranza`):

```
acuerdos_vencidos → mora_recalculo → castigo_cartera
```

Así las cuotas de acuerdo se evalúan **antes** de recalcular mora y castigar.

---

## 5. Gracia y feriados

- Días de gracia: config operativa (`CLAVE_MORA_DIAS_GRACIA` / servicio de configuración).  
- Feriados Nicaragua: seed `seed-feriados-nicaragua` — usados por el motor de **horarios de contacto**; el cálculo de mora es por diferencia de fechas calendario (no “días hábiles” en la fórmula pura).  

---

## 6. Tramos de mora

No forman parte del cálculo de `diasMora`, pero lo consumen:

- `tramos-mora.ts`  
- `tbl_comision_cobro` (min/max por mandante)  
- Reportes de aging, migración e ingreso por tramo  

---

## 7. Operación / troubleshooting

| Síntoma | Revisar |
|---------|---------|
| Mora en 0 con saldo vencido | `fechaVencimiento`, estado, acuerdo vigente |
| Mora no baja tras pago total | ¿`saldoTotal` quedó en 0? ¿cron ya corrió? |
| Mora sigue subiendo con acuerdo | ¿Acuerdo realmente `VIGENTE`? |
| Castigo inmediato | Umbral `diasMoraCastigo` vs valor de mora |

---

## 8. Relacionados

- [CASTIGO-CARTERA.md](./CASTIGO-CARTERA.md)  
- [CATALOGO-PROCESOS.md](./catalogos/CATALOGO-PROCESOS.md)  
- [CONFIGURACION-SISTEMA.md](./CONFIGURACION-SISTEMA.md)
