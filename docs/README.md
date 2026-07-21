# Documentación oficial — FlowPay

Índice central de la documentación del producto.

> **Versión del producto:** ver `package.json` y [RELEASE-NOTES.md](./RELEASE-NOTES.md)  
> **Glosario:** [GLOSARIO.md](./GLOSARIO.md)

---

## Cómo empezar (usuarios)

| Si eres… | Empieza por |
|----------|-------------|
| Nuevo en FlowPay | [MANUAL-FUNCIONAL.md](./manuales/MANUAL-FUNCIONAL.md) + [GLOSARIO.md](./GLOSARIO.md) |
| Cobrador | [MANUAL-COBRADOR.md](./manuales/MANUAL-COBRADOR.md) |
| Supervisor | [MANUAL-SUPERVISOR.md](./manuales/MANUAL-SUPERVISOR.md) |
| Gerente | [MANUAL-GERENTE.md](./manuales/MANUAL-GERENTE.md) |
| Administrador | [MANUAL-ADMINISTRADOR.md](./manuales/MANUAL-ADMINISTRADOR.md) |
| Operaciones / mandante | [MANUAL-MANDANTE.md](./manuales/MANUAL-MANDANTE.md) |
| Analista de reportes | [MANUAL-REPORTES.md](./manuales/MANUAL-REPORTES.md) |

Instalación técnica: [INSTRUCCIONES-INSTALACION.md](../INSTRUCCIONES-INSTALACION.md) · [README.md](../README.md)

---

## Manuales por rol

| Documento | Audiencia | Descripción |
|-----------|-----------|-------------|
| [MANUAL-FUNCIONAL.md](./manuales/MANUAL-FUNCIONAL.md) | Todos | Visión general, mapa de menús y módulos |
| [MANUAL-COBRADOR.md](./manuales/MANUAL-COBRADOR.md) | Cobrador | Mi día, bandeja, gestiones, pagos, acuerdos |
| [MANUAL-SUPERVISOR.md](./manuales/MANUAL-SUPERVISOR.md) | Supervisor | Equipo, importación, asignación, inteligencia |
| [MANUAL-GERENTE.md](./manuales/MANUAL-GERENTE.md) | Gerente | Liquidaciones, informe gerencial, finanzas |
| [MANUAL-ADMINISTRADOR.md](./manuales/MANUAL-ADMINISTRADOR.md) | Admin | Usuarios, permisos, cron, auditoría, deploy |
| [MANUAL-MANDANTE.md](./manuales/MANUAL-MANDANTE.md) | Mandante / ops | Configuración del acreedor y entregables |
| [MANUAL-REPORTES.md](./manuales/MANUAL-REPORTES.md) | Todos con reportes | Catálogo de reportes, rutas y permisos |

---

## Catálogos

| Documento | Contenido |
|-----------|-----------|
| [CATALOGO-KPIs.md](./catalogos/CATALOGO-KPIs.md) | Indicadores por dashboard y módulo |
| [CATALOGO-PERMISOS.md](./catalogos/CATALOGO-PERMISOS.md) | Índice RBAC (detalle en [PERMISOS-RBAC.md](./PERMISOS-RBAC.md)) |
| [CATALOGO-REGLAS-NEGOCIO.md](./catalogos/CATALOGO-REGLAS-NEGOCIO.md) | Estados, mora, acuerdos, castigo, SLA |
| [CATALOGO-PROCESOS.md](./catalogos/CATALOGO-PROCESOS.md) | Procesos operativos y jobs automáticos |

---

## Documentación técnica

| Documento | Contenido |
|-----------|-----------|
| [MORA-AUTOMATICA.md](./MORA-AUTOMATICA.md) | Cálculo y sincronización de mora |
| [CASTIGO-CARTERA.md](./CASTIGO-CARTERA.md) | Castigo automático |
| [CONFIGURACION-SISTEMA.md](./CONFIGURACION-SISTEMA.md) | Env + parámetros operativos |
| [BACKUP-DR.md](./BACKUP-DR.md) | Backup MySQL, restore drill, RTO/RPO |
| [CONTROL-CONCURRENCIA.md](./CONTROL-CONCURRENCIA.md) | Locks MySQL y cron |
| [TRANSACCIONES-PRISMA.md](./TRANSACCIONES-PRISMA.md) | Patrones de BD |
| [GLOSARIO.md](./GLOSARIO.md) | Vocabulario del dominio |

---

## Gobernanza del producto

| Documento | Contenido |
|-----------|-----------|
| [ROADMAP.md](./ROADMAP.md) | Evolución planificada |
| [RELEASE-NOTES.md](./RELEASE-NOTES.md) | Notas de versión |
| [MATRIZ-TRAZABILIDAD.md](./MATRIZ-TRAZABILIDAD.md) | Requisito → implementación → validación |

---

## QA y UAT

| Documento | Contenido |
|-----------|-----------|
| [UAT-COBRANZA.md](./UAT-COBRANZA.md) | Escenarios UAT por rol |
| [PERMISOS-RBAC.md](./PERMISOS-RBAC.md) | Auditoría RBAC detallada |

```bash
npm run audit:docs    # Verifica documentación oficial
npm run audit:uat     # UAT estático
npm run qa:gate       # Puerta de calidad completa
```
