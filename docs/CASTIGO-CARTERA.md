# Castigo de cartera — FlowPay

Documentación técnica del castigo automático de préstamos.

**Servicio:** `src/lib/cobranza/castigo-cartera-service.ts`  
**Cron:** `castigo_cartera` (después de `mora_recalculo`)

---

## 1. Objetivo

Marcar como **Castigo** los préstamos cuya mora alcanza o supera el umbral de política, excluyendo estados que no deben castigarse automáticamente.

---

## 2. Umbral

Clave de configuración: `CLAVE_DIAS_MORA_CASTIGO`  
Leída vía `obtenerConfigNumerica` en `configuracion-cobranza-service.ts`.

| Valor | Comportamiento |
|-------|----------------|
| `<= 0` | Castigo automático **deshabilitado** |
| `> 0` | Castiga si `diasMora >= umbral` |

---

## 3. Condiciones para castigar un préstamo

`evaluarCastigoPrestamo`:

1. Umbral > 0  
2. Préstamo existe  
3. `saldoTotal > 0`  
4. Estado **no** está en la lista de exclusión  
5. `diasMora >= umbral`  

Entonces:

```
transicionarEstadoPrestamo → "Castigo"
motivo: "Mora >= {umbral} días — castigo automático"
forzar: true
```

### Estados excluidos

- Castigo (ya castigado)  
- Cancelado  
- Finalizado  
- Con acuerdo  

---

## 4. Proceso batch

`procesarCastigoCartera(idmandante?)`:

1. Lee umbral  
2. Selecciona hasta 500 candidatos (`diasMora >= umbral`, saldo > 0, estado no excluido)  
3. Evalúa uno a uno  
4. Retorna `{ evaluados, castigados }`  

Filtro opcional por `idmandante` para corridas acotadas.

---

## 5. Orden en el cron diario

```
acuerdos_vencidos → mora_recalculo → castigo_cartera
```

Garantiza que `diasMora` esté actualizado antes de castigar.

---

## 6. Efectos operativos

| Área | Efecto |
|------|--------|
| Estado | Transición a Castigo (timeline / auditoría) |
| Mora automática | Estado Castigo queda protegido de sobrescritura típica |
| Bandeja | El caso cambia prioridad / filtros según UI |
| Reportes | Aparece en aging / riesgo como castigado |
| Acuerdos | Préstamos “Con acuerdo” no se castigan automáticamente |

---

## 7. Operación manual

Un usuario con permisos puede forzar transiciones de estado según reglas de `estado-prestamo-service.ts`.  
El castigo automático usa `forzar: true` para aplicar la política aunque la transición manual estuviera restringida.

---

## 8. Troubleshooting

| Síntoma | Causa probable |
|---------|----------------|
| No castiga nada | Umbral ≤ 0 o mora aún bajo umbral |
| Castiga con acuerdo | Estado del acuerdo no es vigente / préstamo no en “Con acuerdo” |
| Castigo masivo | Umbral bajado por error en config |
| Solo 500 por corrida | Límite batch; la siguiente ejecución del cron continúa |

---

## 9. Relacionados

- [MORA-AUTOMATICA.md](./MORA-AUTOMATICA.md)  
- [CATALOGO-REGLAS-NEGOCIO.md](./catalogos/CATALOGO-REGLAS-NEGOCIO.md)  
- [CONFIGURACION-SISTEMA.md](./CONFIGURACION-SISTEMA.md)
