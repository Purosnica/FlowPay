# Control de concurrencia — FlowPay

Mecanismos para evitar corridas duplicadas y condiciones de carrera.

**Versión:** 1.2.2

---

## 1. Advisory locks MySQL

**Módulo:** `src/lib/scalability/mysql-advisory-lock.ts`

Usa `GET_LOCK(nombre, timeout)` / `RELEASE_LOCK(nombre)` de MySQL.

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
Jobs en `PROCESANDO` demasiado tiempo (~30 min) pueden volver a `PENDIENTE` (ver catálogo de reglas).

---

## 5. Rate limit de login

En producción el rate limit de intentos de login puede ser distribuido (`tbl_rate_limit`) para coherencia multi-instancia.

---

## 6. Buenas prácticas

1. No deshabilitar locks en producción.  
2. Mantener `CRON_SECRET` fuerte y único por entorno.  
3. Ante “operación en curso”, reintentar unos segundos después.  
4. Monitorear ejecuciones en `/configuracion/cron`.  

---

## 7. Relacionados

- [TRANSACCIONES-PRISMA.md](./TRANSACCIONES-PRISMA.md)  
- [CATALOGO-PROCESOS.md](./catalogos/CATALOGO-PROCESOS.md)  
- [MANUAL-ADMINISTRADOR.md](./manuales/MANUAL-ADMINISTRADOR.md)
