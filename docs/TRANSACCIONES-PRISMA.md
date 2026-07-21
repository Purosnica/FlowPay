# Transacciones Prisma — FlowPay

Patrones de acceso a base de datos y transacciones en el backend.

**Stack:** Prisma 6 · MySQL  
**Cliente:** `src/lib/prisma.ts`

---

## 1. Principios

1. **Una responsabilidad por servicio** (`src/lib/cobranza/*-service.ts`).  
2. Operaciones que tocan varias tablas van en **transacción** (`prisma.$transaction`).  
3. Los servicios aceptan a menudo `Tx = Prisma.TransactionClient | typeof prisma` para poder anidarse.  
4. No exponer errores internos de BD al cliente; mapear a errores de dominio / GraphQL.  

---

## 2. Patrón `Tx`

Ejemplo usado en mora / castigo:

```typescript
type Tx = Prisma.TransactionClient | typeof prisma;

export async function evaluarCastigoPrestamo(
  db: Tx,
  idprestamo: number,
): Promise<boolean> {
  // lecturas y escrituras usan `db`, no el singleton global
}
```

Permite:

- Llamar la función sola con `prisma`  
- O dentro de `$transaction(async (tx) => { … })` pasando `tx`  

---

## 3. Cuándo usar transacción

| Caso | ¿Transacción? |
|------|----------------|
| Crear gestión simple | Suele ser un insert; tx si actualiza préstamo + timeline |
| Crear acuerdo + cuotas + cambio de estado | **Sí** |
| Aplicar pago + saldo + timeline | **Sí** |
| Generar liquidación + detalle | **Sí** (+ advisory lock) |
| Solo lectura de reporte | No |

---

## 4. Concurrencia + transacciones

Locks advisory (**fuera o alrededor** de la tx) evitan que dos transacciones de negocio entren al mismo tiempo en liquidaciones / cron.

Ver [CONTROL-CONCURRENCIA.md](./CONTROL-CONCURRENCIA.md).

Orden recomendado:

1. Adquirir lock  
2. Abrir `$transaction`  
3. Commit  
4. Liberar lock (en `finally`)  

---

## 5. Soft delete

Muchas entidades usan `deletedAt`. Las queries de negocio filtran `deletedAt: null` salvo pantallas de auditoría.

---

## 6. Decimales y dinero

Montos llegan de MySQL como `Decimal`.  
Helpers: `decimal-utils.ts` (`decimalToNumber`, etc.).  
No sumar decimales con aritmética flotante sin convertir de forma controlada.

---

## 7. Migraciones

- Desarrollo prototipo: `db push` (no preferido)  
- Staging/prod: `prisma migrate deploy`  
- Baseline de BD legacy: `npm run db:migrate:resolve-baseline` (una vez)  

---

## 8. Seed

`npm run db:seed` crea permisos, roles, mandante demo, tipificaciones, feriados, horarios, usuarios de desarrollo.

Las contraseñas solo aparecen en consola del seed.

---

## 9. Relacionados

- [CONFIGURACION-SISTEMA.md](./CONFIGURACION-SISTEMA.md)  
- [CONTROL-CONCURRENCIA.md](./CONTROL-CONCURRENCIA.md)  
- [MANUAL-ADMINISTRADOR.md](./manuales/MANUAL-ADMINISTRADOR.md)
