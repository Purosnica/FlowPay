# Glosario — FlowPay

Términos del dominio de cobranza usados en la interfaz y la documentación.

**Versión:** 1.2.2

---

## A

| Término | Definición |
|---------|------------|
| **Acuerdo** | Plan formal de pago en cuotas acordado con el deudor. Estados: VIGENTE, CUMPLIDO, ROTO. |
| **Agencia** | Unidad operativa / ruta geográfica de cobranza. |
| **Aging** | Clasificación de cartera por tramos de días de mora. |
| **Aplicado (pago)** | Flag `aplicado = true`. Solo estos pagos cuentan en recuperación y liquidación. |
| **Asignación** | Acción de vincular un préstamo a un cobrador (`idgestorAsignado`). |
| **Auditoría** | Registro de acciones críticas (quién, qué, cuándo, detalle). |

## B

| Término | Definición |
|---------|------------|
| **Bandeja** | Cola priorizada de casos del cobrador (`/cobranza/bandeja`). |

## C

| Término | Definición |
|---------|------------|
| **Campaña** | Conjunto de casos filtrados para un esfuerzo de contacto temporal. |
| **Cartera** | Conjunto de préstamos bajo gestión. |
| **Castigo** | Estado de préstamo cuando la mora supera el umbral configurado; se considera irrecuperable contable/operativamente según política. |
| **Centro de Inteligencia** | Módulo analítico con salud de cartera, insights y alertas. |
| **Cliente 360** | Vista consolidada del deudor y todos sus préstamos. |
| **Cobranza** | Actividad de recuperación de saldos vencidos. |
| **Cobrador** | Rol operativo que gestiona casos asignados. |
| **Comisión** | Porcentaje o monto que retiene la agencia según tramo de mora / contrato. |
| **Conciliación** | Proceso de validar y aplicar pagos pendientes. |
| **Cron** | Job automático programado (mora, castigo, SLA, importaciones, etc.). |
| **CSRF** | Protección contra request forgery en mutaciones. |
| **Cuota** | Parcela de un acuerdo (PENDIENTE / PAGADA / VENCIDA). |

## D

| Término | Definición |
|---------|------------|
| **Descuento** | Reducción sobre el saldo en un acuerdo; umbrales altos requieren aprobación. |
| **Deudor / Cliente** | Persona o entidad que adeuda el préstamo. |
| **Días de gracia** | Días que se restan del cálculo de mora o se toleran en cuotas de acuerdo. |

## E

| Término | Definición |
|---------|------------|
| **Emitida (liquidación)** | Liquidación formalizada y lista para entregar al mandante. |
| **Equipo** | Conjunto de cobradores bajo un supervisor. |

## F

| Término | Definición |
|---------|------------|
| **Feriado** | Día no hábil (calendario Nicaragua) considerado en horarios / procesos. |

## G

| Término | Definición |
|---------|------------|
| **Gamificación** | Ranking, XP, niveles e insignias para motivar al equipo. |
| **Gerente** | Rol multi-equipo con liquidaciones y reportes gerenciales. |
| **Gestión** | Registro de un contacto o intento de cobro (tipificación + resultado + nota). |
| **Gestor** | Usuario cobrador asignado al préstamo. |

## H

| Término | Definición |
|---------|------------|
| **Horario de cobranza** | Franja permitida para contactar deudores (por mandante / global). |

## I

| Término | Definición |
|---------|------------|
| **Importación** | Carga masiva de cartera vía Excel (job asíncrono). |
| **Insight** | Alerta automática del Centro de Inteligencia con acción sugerida. |

## J

| Término | Definición |
|---------|------------|
| **JWT** | Token de sesión firmado almacenado en cookie HTTP-only. |

## L

| Término | Definición |
|---------|------------|
| **Liquidación** | Cierre periódico de recuperación hacia el mandante (BORRADOR → EMITIDA → PAGADA). |

## M

| Término | Definición |
|---------|------------|
| **Mandante** | Entidad acreedora dueña de la cartera administrada. |
| **Mi día** | Pantalla de prioridades diarias del cobrador. |
| **Mora** | Días de atraso del préstamo (`diasMora`). |
| **Multi-mandante** | Capacidad de operar varias entidades acreedoras con alcance por usuario. |

## N

| Término | Definición |
|---------|------------|
| **NIO** | Córdoba nicaragüense (moneda default). |

## P

| Término | Definición |
|---------|------------|
| **Pago** | Registro de cobro (EFECTIVO / TRANSFERENCIA; NIO / USD). |
| **Permiso (RBAC)** | Código que habilita un módulo o acción. |
| **Plantilla** | Mapeo de columnas Excel → campos del sistema. |
| **Plantilla de mensaje** | Texto reutilizable para contacto. |
| **Préstamo** | Obligación individual en cartera. |
| **Promesa** | Compromiso informal de pago (fecha + monto) registrado en una gestión. |

## R

| Término | Definición |
|---------|------------|
| **RBAC** | Control de acceso basado en roles y permisos. |
| **Reclamo** | Queja o incidencia con ciclo ABIERTO → EN_PROCESO → RESUELTO y SLA. |
| **Recuperación** | Monto cobrado (típicamente pagos aplicados). |
| **Rol** | COBRADOR, SUPERVISOR, GERENTE, ADMIN. |

## S

| Término | Definición |
|---------|------------|
| **Salud de cartera** | Score 0–100 del Centro de Inteligencia. |
| **Score (bandeja)** | Prioridad relativa de un caso en la cola. |
| **Secuencia de contacto** | Etapas planificadas (llamada, SMS, visita, etc.). |
| **SLA** | Plazo máximo de atención (p. ej. reclamos). |
| **Supervisor** | Rol que lidera un equipo de cobradores. |

## T

| Término | Definición |
|---------|------------|
| **Tipificación** | Par acción + resultado que clasifica la gestión. |
| **Timeline** | Historial de eventos y estados del préstamo. |
| **Tramo de mora** | Rango de días (ej. 1–30, 31–60) usado en aging y comisiones. |

## U

| Término | Definición |
|---------|------------|
| **USD** | Dólar estadounidense; requiere tipo de cambio al registrar. |
| **UAT** | Pruebas de aceptación de usuario. |

## X

| Término | Definición |
|---------|------------|
| **XP** | Puntos de gamificación (gestiones, monto, promesas). |
