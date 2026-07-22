# Usability test — 5 cobradores reales (I188)

Protocolo corto para evidenciar UX de FlowPay en campo.
No sustituye UAT funcional (`docs/UAT-COBRANZA.md`); mide usabilidad.

## Objetivo

Validar con **5 cobradores reales** (no staff de producto) que:

1. Registrar una gestión toma **≤3 clics** desde Mi día o bandeja.
2. La acción primaria percibida es **recuperar / registrar pago**, no tipificar.
3. El **horario Ley 787** se entiende antes de contactar.
4. El **script de confirmación verbal** se usa en llamadas.
5. Modo foco de Mi día reduce distracciones.

## Participantes

| # | Rol | Experiencia | Mandante / equipo |
|---|-----|-------------|-------------------|
| 1 | Cobrador | Novato (&lt;1 mes) | |
| 2 | Cobrador | Intermedio | |
| 3 | Cobrador | Intermedio | |
| 4 | Cobrador | Experto | |
| 5 | Cobrador / supervisor ligero | Experto | |

Reclutar usuarios que **no** hayan diseñado la pantalla.

## Tareas (máx. 25 min / persona)

1. Abrir **Mi día** y activar **Modo foco**.
2. Gestionar el caso prioritario #1 (gestión rápida + tipificación).
3. En un préstamo, **registrar un pago** sin pedir ayuda.
4. Abrir Centro de Inteligencia y completar o omitir el tour.
5. En importación (si aplica al rol), corregir una fila con error inline.

## Métricas

| Métrica | Cómo medir | Meta |
|---------|------------|------|
| Time-to-first-gestion | Analytics local `flowpay_ux_ttfg` o cronómetro | ≤ 90 s sesión |
| Clics hasta submit gestión | Contar + heatmap `data-ux-id` | ≤ 3 |
| Éxito sin ayuda | Observación | ≥ 4/5 |
| SUS (opcional) | Cuestionario 10 ítems | ≥ 70 |
| Violaciones Ley 787 percibidas | Pregunta abierta | 0 críticas |

## Registro de hallazgos

Plantilla por sesión:

```
Fecha:
Participante #:
Tarea fallida / fricción:
Cita textual:
Severidad (bloqueante / mayor / menor):
Recomendación:
```

Guardar notas en `docs/ux-sessions/` (privado; sin PII de deudores).

## Criterio de cierre I188

- [ ] 5 sesiones completadas
- [ ] Hallazgos priorizados (top 5)
- [ ] Al menos 1 mejora UI mergeada por hallazgo bloqueante
- [ ] Time-to-first-gestion revisado en analytics de prueba

## Privacidad

- No grabar pantallas con datos de deudores reales sin consentimiento y enmascarado.
- El heatmap del producto (`data-ux-id`) **no** captura texto ni coordenadas (I189).
