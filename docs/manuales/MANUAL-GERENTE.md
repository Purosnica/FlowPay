# Manual del Gerente — FlowPay

Guía operativa para el rol **GERENTE**.

**Versión:** 1.2.2

---

## 1. Permisos del rol

Incluye todo lo del supervisor, más:

| Código | Permite |
|--------|---------|
| `LIQUIDACION_WRITE` | Generar, emitir y marcar liquidaciones pagadas |
| `USER_READ` | Consultar usuarios (sin gestionar permisos) |
| `REPORTE_FINANZAS_READ` | Reportes financieros |
| `REPORTE_GERENCIAL_READ` | Informe gerencial y consolidados |

Alcance de datos: **supervisores a su cargo** y los equipos de esos supervisores, más mandantes asignados.

---

## 2. Responsabilidades

1. Visión consolidada multi-equipo  
2. Cierre financiero con mandantes (liquidaciones)  
3. Seguimiento de margen, comisiones y recuperación  
4. Decisiones sobre riesgo de cartera y metas  
5. Lectura de usuarios / estructura (sin administrar RBAC)  
6. Coordinación con administración para cambios de permisos o config  

---

## 3. Rutina recomendada

```
Login → Dashboard gerencial → Informe gerencial / Centro de Inteligencia
  → Revisar liquidaciones del periodo
  → Reportes financieros y de riesgo
  → Alinear metas con supervisores
```

---

## 4. Dashboard (`/dashboard`)

KPIs consolidados típicos:

| KPI | Uso |
|-----|-----|
| Total supervisores / cobradores | Tamaño de la organización |
| Gestiones hoy | Actividad |
| Monto recuperado mes | Resultado |
| Cartera total / % en mora | Salud |
| Reclamos fuera de SLA | Cumplimiento operativo |
| Desglose por equipo | Comparar supervisores |

Actúe sobre equipos rezagados vía el supervisor correspondiente (no reasignando a ciegas).

---

## 5. Liquidaciones (`/cobranza/liquidaciones`)

Ciclo completo (permiso de escritura):

### 5.1 Generar borrador

1. Seleccionar **mandante** y **periodo**.  
2. Generar liquidación a partir de **pagos aplicados** del periodo.  
3. El sistema calcula comisiones según tramos / reglas del mandante.  
4. Estado inicial: **`BORRADOR`**.

### 5.2 Emitir

1. Revisar montos, comisiones y neto.  
2. Emitir → estado **`EMITIDA`**.  
3. Entregar el reporte al mandante (canal externo: email, portal, reunión).

### 5.3 Marcar pagada

Cuando el mandante paga / se cierra el ciclo financiero:

1. Marcar liquidación como **`PAGADA`**.  
2. Conservar evidencia fuera o dentro del sistema según política interna.

### Estados

```
BORRADOR → EMITIDA → PAGADA
```

**Importante:** solo cuentan pagos con `aplicado = true`. Coordine conciliaciones antes de emitir.

---

## 6. Conciliaciones (`/cobranza/conciliaciones`)

Antes del cierre:

1. Revisar pagos pendientes de aplicación.  
2. Coordinar con supervisores para completar evidencias.  
3. Confirmar que la base de liquidación está limpia.

---

## 7. Informe gerencial

Ruta: `/cobranza/reportes/informe-gerencial`

Consolidado ejecutivo: recuperación, gestiones, mora, tendencias.  
Úselo como input de comités semanales / mensuales con mandantes o dirección.

---

## 8. Reportes financieros y de riesgo

| Reporte | Ruta | Pregunta que responde |
|---------|------|------------------------|
| Ganancias | `/cobranza/reportes/ganancias` | Resultado económico |
| Margen por mandante | `/cobranza/reportes/margen-mandantes` | Rentabilidad por acreedor |
| Comisiones cobradores | `/cobranza/reportes/comisiones-cobradores` | Incentivos |
| Comisiones vs proyección | `/cobranza/reportes/comisiones-vs-proyeccion` | Desvíos |
| Migración de mora | `/cobranza/reportes/migracion-mora` | Deterioro entre tramos |
| Concentración de riesgo | `/cobranza/reportes/concentracion-riesgo` | Exposición concentrada |
| Ingreso por tramo | `/cobranza/reportes/ingreso-tramo-mora` | Recuperación por bucket |

Catálogo completo: [MANUAL-REPORTES.md](./MANUAL-REPORTES.md).

---

## 9. Centro de Inteligencia y equipos

Conserve las mismas pantallas del supervisor:

- `/cobranza/centro-inteligencia`  
- `/cobranza/equipo` (visión ampliada por jerarquía)  
- `/cobranza/gamificacion`  

Compare equipos y mueva recursos (vía supervisores) donde la salud de cartera o la recuperación lo requieran.

---

## 10. Usuarios (solo lectura)

Ruta: `/configuracion/usuarios` (con `USER_READ`)

Puede consultar estructura (roles, supervisores, mandantes).  
Para **crear usuarios o cambiar permisos**, solicitar al **Administrador** (`USER_WRITE`).

---

## 11. Operación de cartera

El gerente hereda capacidad de importar, asignar y operar casos.  
En la práctica, delegue la operación diaria a supervisores y reserve intervención para:

- Cierres de periodo  
- Casos de alto monto / alto riesgo  
- Acuerdos excepcionales  
- Conflictos entre equipos  

---

## 12. Checklist de cierre mensual

- [ ] Todas las importaciones del mes cerradas sin errores críticos  
- [ ] Conciliaciones al día  
- [ ] Liquidaciones en `EMITIDA` o `PAGADA` según calendario con mandantes  
- [ ] Informe gerencial exportado / presentado  
- [ ] Metas del mes siguiente alineadas con supervisores  
- [ ] Reclamos SLA bajo control  
- [ ] Revisión de margen y comisiones vs proyección  

---

## 13. Restricciones del rol

| Acción | ¿Permitido? |
|--------|-------------|
| Gestionar usuarios / permisos | No (`USER_WRITE`) |
| Configuración sistema / cron / auditoría | No (`CONFIG_SYSTEM`) |
| Ver mandantes no asignados | No |

---

## 14. Problemas frecuentes

| Síntoma | Qué hacer |
|---------|-----------|
| Liquidación con monto bajo | Revisar pagos no aplicados / fechas de periodo |
| No puede emitir | Verificar `LIQUIDACION_WRITE` |
| Diferencias vs Excel del mandante | Conciliar y revisar tipo de cambio USD |
| Equipo no aparece | Verificar jerarquía `idsupervisor` de usuarios |

---

## 15. Validación UAT

Escenarios de gerente / liquidación en [UAT-COBRANZA.md](../UAT-COBRANZA.md).

---

## 16. Documentos relacionados

- [MANUAL-SUPERVISOR.md](./MANUAL-SUPERVISOR.md)  
- [MANUAL-MANDANTE.md](./MANUAL-MANDANTE.md)  
- [MANUAL-REPORTES.md](./MANUAL-REPORTES.md)  
- [CATALOGO-KPIs.md](../catalogos/CATALOGO-KPIs.md)
