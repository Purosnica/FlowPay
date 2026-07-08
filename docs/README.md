# Documentación oficial — FlowPay

Índice central de la documentación del producto (Fase 13).

> **Versión del producto:** ver `package.json` y [RELEASE-NOTES.md](./RELEASE-NOTES.md)

---

## Manuales por rol

| Documento | Audiencia | Descripción |
|-----------|-----------|-------------|
| [MANUAL-FUNCIONAL.md](./manuales/MANUAL-FUNCIONAL.md) | Todos | Visión general del sistema y módulos |
| [MANUAL-COBRADOR.md](./manuales/MANUAL-COBRADOR.md) | Cobrador | Operación diaria: Mi día, bandeja, gestiones |
| [MANUAL-SUPERVISOR.md](./manuales/MANUAL-SUPERVISOR.md) | Supervisor | Equipo, asignación, centro de inteligencia |
| [MANUAL-ADMINISTRADOR.md](./manuales/MANUAL-ADMINISTRADOR.md) | Admin | Usuarios, permisos, cron, auditoría |
| [MANUAL-MANDANTE.md](./manuales/MANUAL-MANDANTE.md) | Mandante / operaciones | Configuración mandante, liquidaciones, entregables |

---

## Catálogos

| Documento | Contenido |
|-----------|-----------|
| [CATALOGO-KPIs.md](./catalogos/CATALOGO-KPIs.md) | Indicadores por dashboard y módulo |
| [CATALOGO-PERMISOS.md](./catalogos/CATALOGO-PERMISOS.md) | Índice RBAC (detalle en [PERMISOS-RBAC.md](./PERMISOS-RBAC.md)) |
| [CATALOGO-REGLAS-NEGOCIO.md](./catalogos/CATALOGO-REGLAS-NEGOCIO.md) | Estados, mora, acuerdos, castigo, SLA |
| [CATALOGO-PROCESOS.md](./catalogos/CATALOGO-PROCESOS.md) | Procesos operativos y jobs automáticos |

---

## Gobernanza del producto

| Documento | Contenido |
|-----------|-----------|
| [ROADMAP.md](./ROADMAP.md) | Evolución planificada post-enterprise |
| [RELEASE-NOTES.md](./RELEASE-NOTES.md) | Notas de versión |
| [MATRIZ-TRAZABILIDAD.md](./MATRIZ-TRAZABILIDAD.md) | Requisito → implementación → validación |

---

## QA y UAT

| Documento | Contenido |
|-----------|-----------|
| [UAT-COBRANZA.md](./UAT-COBRANZA.md) | Escenarios UAT por rol |
| [PERMISOS-RBAC.md](./PERMISOS-RBAC.md) | Auditoría RBAC detallada |

---

## Documentación técnica complementaria

| Documento | Contenido |
|-----------|-----------|
| [MORA-AUTOMATICA.md](./MORA-AUTOMATICA.md) | Lógica de mora |
| [CASTIGO-CARTERA.md](./CASTIGO-CARTERA.md) | Castigo automático |
| [CONFIGURACION-SISTEMA.md](./CONFIGURACION-SISTEMA.md) | Parámetros operativos |
| [CONTROL-CONCURRENCIA.md](./CONTROL-CONCURRENCIA.md) | Locks y transacciones |
| [TRANSACCIONES-PRISMA.md](./TRANSACCIONES-PRISMA.md) | Patrones de BD |

---

## Scripts de validación

```bash
npm run audit:docs    # Verifica documentación oficial (Fase 13)
npm run audit:uat     # UAT estático
npm run qa:gate       # Puerta de calidad completa
```
