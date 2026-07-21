# Manual del Mandante — FlowPay

Guía sobre la entidad **mandante** (acreedor) en FlowPay.

**Versión:** 1.2.2

> FlowPay **no** expone un portal de login para mandantes externos.  
> Este manual describe cómo se representa el mandante, qué se configura y qué entregables recibe la entidad acreedora a través del equipo operador (supervisor / gerente / admin).

---

## 1. Concepto

Un **mandante** es la entidad acreedora cuya cartera se administra en FlowPay (`tbl_mandante`).

Ejemplo de seed: **CREDICOMPRAS**.

Cada préstamo, gestión, pago, acuerdo y liquidación está asociado a un `idmandante`.

---

## 2. Quién configura el mandante

| Rol | Qué puede hacer |
|-----|-----------------|
| Administrador | Alta completa, tipificaciones, plantillas, políticas |
| Supervisor | Operación sobre mandantes asignados (importar, campañas, consulta) |
| Gerente | Liquidaciones y reportes gerenciales / financieros |
| Cobrador | Solo operación de cobranza sobre cartera del mandante |

---

## 3. Datos maestros (`/cobranza/mandantes`)

| Elemento | Descripción |
|----------|-------------|
| Código | Identificador corto único |
| Nombre | Razón social / nombre comercial |
| Estado activo | Habilita u opera operaciones |
| Contrato | Condiciones comerciales con la agencia |
| Comisiones | Tramos de mora → % comisión (`tbl_comision_cobro`) |
| Config operativa | Metas, castigo, descuentos, gracia, auto-aplicar pagos |

### Hub del mandante (`/cobranza/mandantes/[id]`)

Desde el detalle se administran:

- Tipificaciones de gestión (acciones / resultados)  
- Políticas de descuento  
- Horarios de contacto  
- Secuencias de contacto / campañas  
- Metas de gestiones y recuperación  
- Plantillas asociadas  

---

## 4. Plantillas de importación (`/cobranza/plantillas`)

Mapeo **columnas Excel → campos del sistema** por mandante.

Sin plantilla correcta:

- La importación falla o carga datos incompletos  
- Mora / saldos / identificadores pueden quedar mal  

Flujo recomendado con el mandante:

1. Acordar layout del archivo (nombres de columnas)  
2. Crear/actualizar plantilla en FlowPay  
3. Probar con un Excel pequeño (vista previa)  
4. Cargar producción vía `/cobranza/importar`  
5. Validar en `/cobranza/historial-cargas`  

---

## 5. Plantillas de mensaje (`/cobranza/plantillas-mensaje`)

Textos reutilizables para comunicación (SMS, email, scripts de llamada) según política del mandante y cumplimiento local.

---

## 6. Alcance de usuarios

Los operadores solo ven mandantes asignados en `tbl_usuario_mandante`.

| Rol típico | Acceso |
|------------|--------|
| Cobrador | Mandantes asignados, solo operación |
| Supervisor | Mandantes del equipo |
| Gerente | Mandantes de su organización |
| Admin | Todos |

Si un cobrador “no ve” la cartera del mandante: primero verificar asignación usuario ↔ mandante, luego asignación de préstamos.

---

## 7. Entregables al mandante

### 7.1 Liquidaciones (`/cobranza/liquidaciones`)

Documento periódico con:

- Pagos recuperados en el periodo (solo **aplicados**)  
- Comisiones según tramos  
- Neto a liquidar  

Ciclo: `BORRADOR` → `EMITIDA` → `PAGADA`  
Emisión: permiso `LIQUIDACION_WRITE` (gerente/admin)

### 7.2 Reportes (`/cobranza/reportes`)

| Entregable | Contenido típico |
|------------|------------------|
| Aging / mora | Tramos y saldos |
| Informe gerencial | Consolidado ejecutivo |
| Efectividad / productividad | Desempeño operativo |
| Margen por mandante | Rentabilidad |
| Export CSV | Análisis externo |

Ver [MANUAL-REPORTES.md](./MANUAL-REPORTES.md).

### 7.3 Conciliaciones (`/cobranza/conciliaciones`)

Estado de pagos aplicados vs pendientes.  
Útil para alinear cifras antes de la liquidación.

---

## 8. KPIs relevantes para el mandante

(Vía reportes y Centro de Inteligencia del operador)

| KPI | Fuente |
|-----|--------|
| Cartera total / en mora | `tbl_prestamo` |
| Recuperación del mes | `tbl_pago` (`aplicado = true`) |
| Gestiones del mes | `tbl_gestion` |
| Promesas abiertas / vencidas | gestiones con promesa |
| Acuerdos vigentes | `tbl_acuerdo` |
| Salud de cartera | Centro de Inteligencia |

Detalle: [CATALOGO-KPIs.md](../catalogos/CATALOGO-KPIs.md)

---

## 9. Políticas que el mandante define (vía config)

| Política | Impacto |
|----------|---------|
| Días de mora para castigo | Paso a estado Castigo |
| Descuento máx. sin aprobación | Control comercial |
| Días de gracia de acuerdo | Cuándo se marca ROTO |
| Metas semanales/mensuales | Gamificación y reportes |
| Horarios de contacto | Cumplimiento legal |
| Auto-aplicar pagos | Velocidad de conciliación |
| Tramos de comisión | Cálculo de liquidación |

---

## 10. Procesos automáticos que afectan al mandante

| Proceso | Impacto |
|---------|---------|
| Recálculo de mora | Actualiza `diasMora` |
| Castigo | Cambia estado a Castigo |
| Acuerdos vencidos | Marca acuerdos rotos |
| Promesas vencidas | Alertas operativas |
| Reclamos SLA | Escalamiento |

Detalle: [CATALOGO-PROCESOS.md](../catalogos/CATALOGO-PROCESOS.md)

---

## 11. Cumplimiento (Nicaragua)

FlowPay contempla aspectos operativos de cobranza local:

- Horarios de contacto  
- Feriados nacionales (seed)  
- Tipificación de contactos a terceros  
- Trazabilidad de gestiones  

El mandante y la agencia deben alinear políticas internas con la normativa vigente (p. ej. Ley 787) y con reguladores aplicables (CONAMI / SIBOIF según el caso).

---

## 12. Checklist de onboarding de un mandante nuevo

- [ ] Alta en `/cobranza/mandantes`  
- [ ] Contrato y tramos de comisión  
- [ ] Plantilla de importación validada  
- [ ] Tipificaciones cargadas  
- [ ] Horarios y umbrales (castigo, descuento, gracia)  
- [ ] Metas definidas  
- [ ] Usuarios asignados al mandante  
- [ ] Carga piloto de cartera  
- [ ] Asignación de gestores  
- [ ] Primer ciclo de gestiones + liquidación de prueba  

---

## 13. Integración futura

Portal mandante de solo lectura (reportes + liquidaciones) está planificado en [ROADMAP.md](../ROADMAP.md).

---

## 14. Validación

Seed: mandante CREDICOMPRAS.  
UAT: importación y reportes en [UAT-COBRANZA.md](../UAT-COBRANZA.md).

---

## 15. Documentos relacionados

- [MANUAL-GERENTE.md](./MANUAL-GERENTE.md)  
- [MANUAL-SUPERVISOR.md](./MANUAL-SUPERVISOR.md)  
- [CATALOGO-REGLAS-NEGOCIO.md](../catalogos/CATALOGO-REGLAS-NEGOCIO.md)  
- [GLOSARIO.md](../GLOSARIO.md)
