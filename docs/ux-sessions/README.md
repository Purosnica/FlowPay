# Sesiones UX cobrador (I188 / H30)

Estado: **protocolo listo; sesiones de campo pendientes de ejecutar.**

El producto ya cubre los requisitos del protocolo (`docs/UX-USABILITY-TEST-COBRADORES.md`):

| Criterio protocolo | Implementación |
|--------------------|----------------|
| ≤3 clics a gestión | Mi día / bandeja → `GestionRapidaModal` (`data-ux-id`) |
| CTA primaria = pago | `PagoRapidaModal` + hotkey **P** (H15) |
| Ley 787 antes de contactar | `HorarioAlerta` |
| Script verbal | `gestion-form` + textos Ley 787 |
| Modo foco | Mi día + `DashboardShell` |
| TTFG ≤90s | Analytics `flowpay_ux_ttfg` |

## Cómo ejecutar

1. Reclutar 5 cobradores reales (ver tabla en el protocolo).
2. Copiar `SESSION-TEMPLATE.md` a `session-NN-YYYYMMDD.md`.
3. Completar tareas (máx. 25 min) y métricas.
4. Priorizar top 5 hallazgos y abrir issues/PRs.
5. Marcar el checklist de cierre en el protocolo.

Sin PII de deudores en las notas.
