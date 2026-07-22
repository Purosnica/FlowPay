# Control de concurrencia — FlowPay

Mecanismos para evitar corridas duplicadas y condiciones de carrera.

**Versión:** 1.2.2

---

## 1. Advisory locks MySQL

**Módulo:** `src/lib/scalability/mysql-advisory-lock.ts`

Usa `GET_LOCK(nombre, timeout)` / `RELEASE_LOCK(nombre)` de MySQL
sobre un **PrismaClient dedicado** con `connection_limit=1`
(`src/lib/scalability/mysql-advisory-lock.ts`). Así acquire y release
usan la misma conexión (los locks MySQL son connection-scoped; el pool
compartido no garantiza afinidad).

| Función | Uso |
|---------|-----|
| `adquirirBloqueoMysql(nombre, timeoutSec)` | Intenta tomar el lock |
| `liberarBloqueoMysql(nombre)` | Libera al terminar |

Si el lock no se adquiere, la operación se **omite o rechaza** (no corre en paralelo).

---

## 2. Cron master

**Archivo:** `src/lib/cron/cron-orchestrator.ts`

- Nombre de lock: constante del master (`CRON_MASTER_LOCK_NAME`)  
- Timeout 0: si otra instancia ya ejecuta, esta sale sin trabajo  
- Protege multi-instancia (varias réplicas / Vercel concurrent)

Endpoint: `/api/cron/operaciones-cobranza`  
Auth: `Authorization: Bearer CRON_SECRET`

---

## 3. Liquidaciones

**Servicio:** `src/lib/cobranza/liquidacion-service.ts`

Locks por operación:

| Acción | Nombre típico de lock |
|--------|------------------------|
| Generar | `liq:{idmandante}:{periodo}` |
| Emitir | `liq-emit:{idliquidacion}` |
| Marcar pagada | `liq-pagar:{idliquidacion}` |
| Revertir pago | `liq-revertir-pago:{idliquidacion}` |

Evita doble emisión o doble pago si dos usuarios confirman a la vez.

---

## 4. Importaciones

Variables:

- `IMPORT_MAX_CONCURRENT`  
- `IMPORT_MAX_JOBS_PER_RUN`  

El worker toma un número limitado de jobs por tick.  
Jobs en `PROCESANDO` demasiado tiempo (~30 min) pueden volver a `PENDIENTE` (CARTERA)
o a `DEAD_LETTER` (otros tipos / reintentos agotados).

---

## 5. Lock optimista (préstamo / acuerdo)

Columnas `version` en `tbl_prestamo` y `tbl_acuerdo`.  
Al aplicar pago se incrementa la versión del préstamo (`optimistic-lock.ts`)
además del `UPDATE` atómico de saldo. Si otra transacción ya cambió la
versión, la operación falla con mensaje de concurrencia.

---

## 6. Rate limit de login

En producción el rate limit de intentos de login puede ser distribuido (`tbl_rate_limit`) para coherencia multi-instancia.

---

## 7. Buenas prácticas

1. No deshabilitar locks en producción.  
2. Mantener `CRON_SECRET` fuerte y único por entorno.  
3. Ante “operación en curso”, reintentar unos segundos después.  
4. Monitorear ejecuciones en `/configuracion/cron`.  
5. Registrar handlers de apagado en scripts largos (`graceful-shutdown.ts`).

---

## 8. Relacionados

- [TRANSACCIONES-PRISMA.md](./TRANSACCIONES-PRISMA.md)  
- [CATALOGO-PROCESOS.md](./catalogos/CATALOGO-PROCESOS.md)  
- [MANUAL-ADMINISTRADOR.md](./manuales/MANUAL-ADMINISTRADOR.md)
