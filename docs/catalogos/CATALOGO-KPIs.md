# Catálogo de KPIs — FlowPay

Indicadores expuestos por módulo. Fuente de tipos: `src/types/cobranza.ts`.

---

## 1. Dashboard general (`DashboardResumenCobranza`)

| KPI | Código | Cálculo | Servicio |
|-----|--------|---------|----------|
| Total préstamos | `totalPrestamos` | Count activos en mandantes del usuario | `dashboard-service.ts` |
| Préstamos en mora | `prestamosEnMora` | `diasMora > 0` | `dashboard-service.ts` |
| Saldo cartera | `saldoCartera` | Suma `saldoTotal` | `dashboard-service.ts` |
| Gestiones del mes | `gestionesMes` | Count desde día 1 del mes | `dashboard-service.ts` |
| Pagos del mes | `pagosMes` | Count pagos del mes | `dashboard-service.ts` |
| Pagos conciliados mes | `pagosConciliadosMes` | Pagos con `aplicado = true` | `dashboard-service.ts` |
| Reclamos abiertos | `reclamosAbiertos` | Estado ABIERTO / EN_PROCESO | `dashboard-service.ts` |
| Promesas vencidas | `promesasVencidas` | Promesas con fecha vencida | `promesas-vencidas-service.ts` |

---

## 2. Mi día (`MiDiaResumen`)

| KPI | Descripción |
|-----|-------------|
| `casosPrioritarios` | Casos con score de prioridad alto |
| `promesasHoy` | Promesas con fecha = hoy |
| `promesasVencidas` | Promesas incumplidas |
| `gestionesHoy` | Gestiones registradas hoy |
| `pagosHoy` | Pagos registrados hoy |
| `montoRecuperadoHoy` | Suma montos pagos hoy |
| `agendaHoy` | Casos con próxima gestión hoy |

Servicio: `mi-dia-service.ts`

---

## 3. Centro de Inteligencia (`CentroInteligenciaResumen`)

| KPI | Descripción |
|-----|-------------|
| `saludCartera` | Score 0–100 (mora, tramos altos, promesas) |
| `recuperacionMes` | Suma pagos aplicados mes actual |
| `variacionRecuperacionPct` | vs mes anterior |
| `prestamosEnMoraPct` | % cartera en mora |
| `promesasVencidas` | Count promesas vencidas |
| `acuerdosEnRiesgo` | Acuerdos con cuotas vencidas |
| `reclamosFueraSla` | Reclamos que exceden SLA |
| `insights` | Alertas automáticas con severidad |

Servicio: `centro-inteligencia-service.ts`

---

## 4. Dashboard Supervisor (`DashboardSupervisorResumen`)

| KPI | Descripción |
|-----|-------------|
| `totalCobradores` | Miembros del equipo |
| `gestionesHoy` / `gestionesAyer` | Comparativo diario |
| `montoRecuperadoMes` | Recuperación del equipo |
| `promesasVencidasEquipo` | Promesas vencidas del equipo |
| `casosSinGestion7d` | Sin gestión en 7 días |
| `tasaContactoEquipoPct` | Efectividad de contacto |
| `ranking[]` | Por gestor: gestiones, monto, efectividad |

Servicio: `dashboard-supervisor-service.ts`

---

## 5. Dashboard Gerente (`DashboardGerenteResumen`)

| KPI | Descripción |
|-----|-------------|
| `totalSupervisores` | Supervisores bajo el gerente |
| `totalCobradores` | Cobradores en toda la jerarquía |
| `gestionesHoy` | Gestiones consolidadas |
| `montoRecuperadoMes` | Recuperación consolidada |
| `reclamosFueraSla` | Reclamos escalados |
| `carteraTotal` | Saldo total cartera |
| `carteraEnMoraPct` | % en mora |
| `equipos[]` | Desglose por supervisor |

Servicio: `dashboard-gerente-service.ts`

---

## 6. Gamificación (`RankingCobrador`, `MetasGamificacion`)

| KPI | Descripción |
|-----|-------------|
| `gestiones` | Gestiones en periodo (default 30d) |
| `montoRecuperado` | Pagos aplicados atribuidos |
| `promesasCumplidas` | Promesas cumplidas |
| `xp` | `gestiones×2 + monto/100 + promesas×25` |
| `nivel` | Inicial / Bronce / Plata / Oro / Elite |
| `insignias` | Primera recuperación, meta semanal, etc. |
| `metaGestionesSemana` | Meta configurable por mandante |
| `metaRecuperacionSemana` | Meta configurable por mandante |

Servicio: `gamificacion-service.ts`

---

## 7. KPIs core de reportes (`KpiCobranzaCore`)

| KPI | Uso |
|-----|-----|
| `carteraTotal` | Reporte cobranza |
| `carteraEnMora` / `carteraEnMoraPct` | Aging |
| `recuperacionMes` | Tendencia |
| `gestionesMes` | Productividad |
| `tasaContactoPct` | Efectividad |
| `promesasAbiertas` | Pipeline |
| `acuerdosVigentes` | Negociación activa |

---

## 8. Aging de cartera

Tramos de mora según parametrización del Mandante (`tbl_comision_cobro`). Export CSV vía `export-aging-csv.ts`.

---

## 9. Metas operativas

Configurables por mandante (`ConfigCobranzaOperativa`):

- `metaGestionesSemana`
- `metaRecuperacionSemana`
- `metaRecuperacionMes`

Servicio: `configuracion-cobranza-service.ts`
