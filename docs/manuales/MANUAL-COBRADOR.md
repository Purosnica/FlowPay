# Manual del Cobrador — FlowPay

Guía operativa paso a paso para el rol **COBRADOR**.

**Versión:** 1.2.2

---

## 1. Permisos del rol

Preset típico (`PERMISOS_COBRADOR`):

| Código | Permite |
|--------|---------|
| `CARTERA_READ` | Ver cartera, bandeja, Mi día, clientes |
| `MANDANTE_READ` | Consultar datos del mandante |
| `GESTION_READ` / `GESTION_WRITE` | Ver y registrar gestiones / reclamos |
| `ACUERDO_READ` / `ACUERDO_WRITE` | Ver y crear acuerdos |
| `PAGO_READ` / `PAGO_WRITE` | Ver y registrar pagos |
| `REPORTE_COBRANZA_READ` | Reportes de cobranza |
| `REPORTE_OPERACION_READ` | Reportes operativos |

Solo ve **casos asignados** a su usuario y **mandantes** vinculados a su cuenta.

---

## 2. Inicio de sesión

1. Abrir la URL del sistema (ej. `https://tu-dominio/login` o `http://localhost:3000/login`).  
2. Ingresar **email** y **contraseña** (las entrega el administrador).  
3. Pulsar **Iniciar sesión**.  
4. El sistema redirige a `/dashboard`.  
5. El menú lateral muestra solo módulos autorizados.

**Demo local (solo desarrollo):** las contraseñas salen en la consola al ejecutar `npm run db:seed`. No usar esas claves en staging/producción.

Si aparece “Sin permisos” al abrir una pantalla, contactar al supervisor o administrador.

---

## 3. Rutina diaria recomendada

```
Login → Dashboard / Mi día → Promesas vencidas → Bandeja
  → Abrir préstamo → Gestionar → Pago o Acuerdo (si aplica)
  → Siguiente caso → Cerrar sesión al final del turno
```

Prioridad sugerida:

1. Promesas **vencidas**  
2. Promesas de **hoy**  
3. Casos prioritarios de **Mi día**  
4. Resto de la **bandeja**

---

## 4. Dashboard (`/dashboard`)

Vista de inicio con KPIs de su alcance:

| Indicador | Para qué sirve |
|-----------|----------------|
| Total préstamos / en mora | Tamaño de su cartera |
| Gestiones del mes | Productividad |
| Pagos del mes / conciliados | Recuperación |
| Promesas vencidas | Seguimiento urgente |
| Reclamos abiertos | Si tiene acceso |

Use los accesos rápidos hacia Mi día, bandeja o cartera.

---

## 5. Mi día (`/cobranza/mi-dia`)

Pantalla de arranque operativo del cobrador.

| Bloque | Qué muestra | Qué hacer |
|--------|-------------|-----------|
| Casos prioritarios | Top casos por score | Abrir y gestionar primero |
| Promesas hoy | Compromisos con fecha = hoy | Confirmar pago o reprogramar |
| Promesas vencidas | Compromisos incumplidos | Contacto inmediato |
| Agenda hoy | Próxima gestión programada para hoy | Seguir el orden |
| Gestiones / pagos hoy | Actividad del día | Autocontrol de meta |
| Monto recuperado hoy | Suma de pagos del día | Seguimiento informal de meta |

**Consejo:** no salga de Mi día sin atender promesas vencidas.

---

## 6. Mi bandeja (`/cobranza/bandeja`)

Cola de trabajo priorizada de **sus** préstamos.

### Cómo usarla

1. Entrar a **Cobranza → Mi bandeja**.  
2. Filtrar por mandante, tramo de mora o estado si hace falta.  
3. Abrir un caso (clic en el préstamo).  
4. Registrar gestión, pago o acuerdo.  
5. Volver a la bandeja; el score se actualiza con la nueva actividad.

La bandeja ordena por prioridad (mora, promesas, antigüedad sin gestión, etc.). Trabaje de arriba hacia abajo salvo instrucción del supervisor.

---

## 7. Detalle del préstamo (`/cobranza/prestamos/[id]`)

Pantalla central de operación. Suele incluir:

- Datos del préstamo (saldo, mora, estado, mandante)  
- Datos del cliente / contactos  
- Timeline (historial de estados y eventos)  
- Formularios de gestión, pago y acuerdo  
- Documentos asociados (si hay)

### 7.1 Registrar una gestión

1. Abrir el préstamo.  
2. Ir al formulario de **Nueva gestión**.  
3. Completar:

| Campo | Descripción |
|-------|-------------|
| Tipificación / acción | Código de acción (ej. llamada, visita, SMS) |
| Resultado | Código de resultado (localizado, tercero, sin contacto, etc.) |
| Nota / observación | Resumen del contacto |
| Próxima gestión | Fecha de recontacto (si aplica) |
| Promesa | Fecha y monto si el deudor se comprometió |

4. Guardar.

**Importante:**

- Registre **siempre** el intento, aunque no contesten.  
- Respete alertas de **horario de cobranza** (fuera de horario el sistema puede bloquear o advertir).  
- No ofrezca montos de descuento fuera de política sin pasar por acuerdo / aprobación.

### 7.2 Registrar un pago

1. En el préstamo, abrir formulario de **Pago**.  
2. Completar:

| Campo | Valores / notas |
|-------|-----------------|
| Monto | Obligatorio |
| Fecha | Fecha del cobro |
| Moneda | `NIO` o `USD` |
| Medio | `EFECTIVO` o `TRANSFERENCIA` |
| Referencia | Nº de voucher / transferencia |
| Comprobante | Tras guardar, use **Imprimir comprobante** o el botón **Comprobante** en el historial |

3. Guardar.

4. (Opcional) Abrir el comprobante e **Imprimir** (formato térmica 80 mm: saldo anterior, abono y saldo nuevo; folio `FP-########`).

**Regla de negocio:** solo los pagos marcados como **aplicados** (`aplicado = true`) suman a recuperación y liquidación. Según config del mandante, el pago puede auto-aplicarse o quedar pendiente de conciliación.

También puede imprimir el comprobante desde **Conciliaciones** o desde **Cliente 360 → Pagos**.

### 7.3 Crear un acuerdo de pago

1. En el préstamo, usar el **simulador de acuerdo**.  
2. Definir número de cuotas, fechas y descuento (si aplica).  
3. Revisar el plan generado.  
4. Confirmar creación.

| Situación | Resultado |
|-----------|-----------|
| Descuento dentro del umbral | Se crea el acuerdo; estado → **Con acuerdo** |
| Descuento alto | Requiere **aprobación del supervisor** |

Estados del acuerdo: `VIGENTE` → `CUMPLIDO` o `ROTO` (si no se pagan cuotas dentro de la gracia).

---

## 8. Clientes (`/clientes` y `/clientes/[id]`)

1. Buscar por nombre, documento u otro criterio disponible.  
2. Abrir **Cliente 360** para ver todos sus préstamos, gestiones y pagos.  
3. Entrar al préstamo concreto desde esa vista.

Útil cuando un deudor tiene varios productos o mandantes.

---

## 9. Mis gestiones (`/cobranza/gestiones`)

Historial de gestiones del cobrador (y filtros por fecha / mandante según UI).

Use esta pantalla para:

- Revisar tipificaciones del día  
- Preparar informe verbal al supervisor  
- Detectar casos sin recontacto programado  

---

## 10. Cartera (`/cobranza/cartera`)

Listado filtrable de préstamos. Como cobrador normalmente ve la cartera **asignada a usted**.

Filtros habituales: mandante, estado, días de mora, búsqueda por código.

---

## 11. Reclamos (`/cobranza/reclamos`)

Si tiene permiso de gestiones:

1. Crear reclamo asociado al caso (motivo, descripción).  
2. Seguir estados: `ABIERTO` → `EN_PROCESO` → `RESUELTO`.  
3. Atender dentro del SLA; el cron escala los vencidos.

No cierre un reclamo sin evidencia o resolución clara.

---

## 12. Reportes disponibles al cobrador

Según permisos de reporte de cobranza / operación:

- Hub `/cobranza/reportes`  
- Efectividad, productividad diaria, promesas, etc. (si el menú los muestra)

Ver [MANUAL-REPORTES.md](./MANUAL-REPORTES.md).

---

## 13. Perfil (`/perfil`)

Actualizar datos personales permitidos (nombre, contacto, etc.).  
**No** puede cambiar su propio rol ni permisos.

---

## 14. Restricciones del rol

| Acción | ¿Permitido? |
|--------|-------------|
| Importar cartera | No |
| Asignar cobradores | No |
| Centro de inteligencia | No |
| Ver equipo / gamificación de otros | No |
| Emitir liquidaciones | No |
| Configuración / usuarios / auditoría | No |
| Ver cartera de otro cobrador | No (salvo reasignación previa) |

---

## 15. Buenas prácticas

1. Atender primero **promesas vencidas** y **promesas de hoy**.  
2. Registrar gestión en **cada** contacto (incluye no contesta).  
3. Formalizar promesas en el sistema (fecha + monto).  
4. Respetar horarios legales de contacto y feriados.  
5. No compartir credenciales.  
6. Cerrar sesión en equipos compartidos.  
7. Adjuntar evidencia de pagos cuando exista.  
8. Escalar al supervisor descuentos fuera de política o casos sensibles (reclamos, terceros).

---

## 16. Problemas frecuentes

| Síntoma | Qué hacer |
|---------|-----------|
| No ve casos en bandeja | Confirmar asignación con supervisor |
| Error de horario al guardar gestión | Esperar franja permitida o coordinar con supervisor |
| No puede crear acuerdo con descuento | Pedir aprobación al supervisor |
| Pago no aparece en KPIs | Verificar si quedó **aplicado** / conciliado |
| Menú incompleto | Pedir revisión de permisos al admin |

---

## 17. Validación UAT

Escenarios de cobrador en [UAT-COBRANZA.md](../UAT-COBRANZA.md).

---

## 18. Documentos relacionados

- [MANUAL-FUNCIONAL.md](./MANUAL-FUNCIONAL.md)  
- [MANUAL-SUPERVISOR.md](./MANUAL-SUPERVISOR.md)  
- [CATALOGO-REGLAS-NEGOCIO.md](../catalogos/CATALOGO-REGLAS-NEGOCIO.md)  
- [GLOSARIO.md](../GLOSARIO.md)
