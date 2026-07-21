# Manual de Reportes — FlowPay

Guía de la suite de reportes: qué responde cada uno, rutas y permisos.

**Versión:** 1.2.2  
**Hub:** `/cobranza/reportes`

---

## 1. Modelo de permisos de reportes

El acceso a un reporte se concede si el usuario tiene **alguno** de:

1. Permiso **fino** del reporte (ej. `REPORTE_EFECTIVIDAD_READ`)  
2. Permiso de **grupo** (ej. `REPORTE_OPERACION_READ`)  
3. Comodín legacy `REPORTE_READ`  

Fuente: `src/lib/permissions/reporte-permisos.ts` y `permiso-codes.ts`.

Grupos típicos por rol:

| Rol | Grupos habituales |
|-----|-------------------|
| Cobrador | Cobranza + Operación |
| Supervisor | + Riesgo + Equipo |
| Gerente | + Finanzas + Gerencial |
| Admin | Todos |

---

## 2. Hub e informes

| Reporte | Ruta | Para qué sirve |
|---------|------|----------------|
| Reportes de cobranza (hub) | `/cobranza/reportes` | Acceso central, KPIs y aging |
| Informe gerencial | `/cobranza/reportes/informe-gerencial` | Consolidado ejecutivo |
| Informe de gestiones | `/cobranza/reportes/informe-gestiones` | Export / detalle de gestiones |

---

## 3. Desempeño operativo

| Reporte | Ruta | Pregunta clave |
|---------|------|----------------|
| Efectividad | `/cobranza/reportes/efectividad` | ¿Qué % de gestiones logra contacto / promesa / pago? |
| Productividad diaria | `/cobranza/reportes/productividad-diaria` | ¿Cuántas gestiones/pagos por día y gestor? |
| Cumplimiento metas | `/cobranza/reportes/cumplimiento-metas` | ¿Se cumplen metas de gestiones y recuperación? |
| Supervisor vs equipo | `/cobranza/reportes/supervisor-equipo` | ¿Cómo se compara cada cobrador del equipo? |

---

## 4. Gestión y seguimiento

| Reporte | Ruta | Pregunta clave |
|---------|------|----------------|
| Promesas de pago | `/cobranza/reportes/promesas-pago` | ¿Qué promesas están abiertas, hoy o vencidas? |
| Cumplimiento acuerdos | `/cobranza/reportes/cumplimiento-acuerdos` | ¿Cuántos acuerdos vigentes / cumplidos / rotos? |
| Cuotas vencidas | `/cobranza/reportes/cuotas-vencidas` | ¿Qué cuotas de acuerdo están vencidas? |
| Cartera sin gestión | `/cobranza/reportes/cartera-sin-gestion` | ¿Qué casos llevan N días sin tipificar? |
| Recontactos | `/cobranza/reportes/recontactos` | ¿Agenda de recontactos y cumplimiento? |
| SLA reclamos | `/cobranza/reportes/reclamos-sla` | ¿Qué reclamos están fuera de plazo? |

---

## 5. Riesgo de cartera

| Reporte | Ruta | Pregunta clave |
|---------|------|----------------|
| Migración de mora | `/cobranza/reportes/migracion-mora` | ¿Cómo se mueven los préstamos entre tramos? |
| Concentración de riesgo | `/cobranza/reportes/concentracion-riesgo` | ¿Hay concentración por deudor / tramo / zona? |
| Ingreso por tramo | `/cobranza/reportes/ingreso-tramo-mora` | ¿Cuánto se recupera por bucket de mora? |

Los tramos de mora se definen por mandante en `tbl_comision_cobro` (helpers en `tramos-mora.ts`).

---

## 6. Financiero

| Reporte | Ruta | Pregunta clave |
|---------|------|----------------|
| Ganancias | `/cobranza/reportes/ganancias` | Resultado económico del periodo |
| Margen por mandante | `/cobranza/reportes/margen-mandantes` | Rentabilidad por acreedor |
| Comisiones cobradores | `/cobranza/reportes/comisiones-cobradores` | Incentivos por gestor |
| Comisiones vs proyección | `/cobranza/reportes/comisiones-vs-proyeccion` | Desvío vs esperado |

Relacionado: liquidaciones en `/cobranza/liquidaciones` (no es un “reporte” de menú, pero es el entregable financiero al mandante).

---

## 7. Cómo usar un reporte (patrón común)

1. Entrar por el menú **Reportes** o el hub.  
2. Seleccionar **mandante** (si aplica) y **rango de fechas**.  
3. Aplicar filtros (gestor, tramo, estado).  
4. Interpretar KPIs / tablas / gráficos.  
5. Exportar CSV cuando la pantalla lo ofrezca.  
6. Actuar: asignar, campaña, coaching o liquidación.

---

## 8. Aging de cartera

Disponible desde el hub de reportes de cobranza.

- Agrupa saldos por tramos de mora del mandante  
- Export CSV vía utilidades de aging (`export-aging-csv.ts`)  
- Base para comisiones y conversación con el mandante  

---

## 9. Buenas prácticas

1. Fije el mismo periodo al comparar equipos.  
2. Distinga **pagos registrados** vs **pagos aplicados**.  
3. No tome decisiones de castigo solo con un corte; cruce con migración de mora.  
4. Antes de liquidar, cruce ganancias / margen con conciliaciones.  
5. Comparta exports con el mandante solo por canales autorizados.

---

## 10. KPIs de referencia

Ver [CATALOGO-KPIs.md](../catalogos/CATALOGO-KPIs.md).

---

## 11. Documentos relacionados

- [MANUAL-FUNCIONAL.md](./MANUAL-FUNCIONAL.md)  
- [MANUAL-GERENTE.md](./MANUAL-GERENTE.md)  
- [CATALOGO-PERMISOS.md](../catalogos/CATALOGO-PERMISOS.md)
