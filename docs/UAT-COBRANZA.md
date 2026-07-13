# UAT — Cobranza FlowPay

Guía de pruebas de aceptación de usuario (UAT) por rol.  
Versión alineada con evolución Fases 4–11.

---

## 1. Pre-requisitos

```bash
npm install
npx prisma migrate deploy
# Si la BD ya existía con db push (una sola vez):
# npm run db:migrate:resolve-baseline
npm run db:seed
npm run dev
```

Variables mínimas en `.env`:

| Variable | Requerido |
|----------|-----------|
| `DATABASE_URL` | Sí |
| `JWT_SECRET` | Sí (≥16 chars dev, ≥32 prod) |
| `CRON_SECRET` | Recomendado en prod |

Automatizado (sin UI):

```bash
npm run qa:gate          # Auditorías + tests unitarios
npm run test:uat         # Matriz RBAC por rol demo
npm run smoke:test       # Smoke con BD
SMOKE_BASE_URL=http://localhost:3000 npm run smoke:test  # + HTTP live
```

---

## 2. Usuarios demo (seed)

| Rol | Email | Contraseña | Uso principal |
|-----|-------|------------|---------------|
| **Cobrador** | cobrador@flowpay.com | cobrador123 | Operación diaria de campo |
| **Supervisor** | supervisor@flowpay.com | supervisor123 | Supervisión de equipo |
| **Gerente** | gerente@flowpay.com | gerente123 | Gestión operativa y usuarios |
| **Admin** | admin@flowpay.com | admin123 | Configuración total |

Mandante de prueba: **CREDICOMPRAS** (si existe tras seed).

---

## 3. Criterios de aceptación globales

- [ ] Login exitoso redirige a `/dashboard` sin exponer token en JSON
- [ ] Sesión persiste por cookie HTTP-only (recargar página mantiene sesión)
- [ ] Logout limpia sesión y redirige a `/login`
- [ ] Rutas sin permiso redirigen a `/dashboard?error=sin_permiso`
- [ ] Sin sesión → redirección a `/login`
- [ ] Importación async activa por defecto en formulario de importar

---

## 4. UAT — Cobrador

### 4.1 Acceso esperado

| Ruta | Debe acceder |
|------|--------------|
| `/dashboard` | Sí |
| `/cobranza/mi-dia` | Sí |
| `/cobranza/bandeja` | Sí |
| `/cobranza/cartera` | Sí |
| `/cobranza/gestiones` | Sí |
| `/cobranza/reportes` | Sí |
| `/cobranza/importar` | **No** |
| `/cobranza/asignacion` | **No** |
| `/cobranza/centro-inteligencia` | **No** |
| `/configuracion` | **No** |

### 4.2 Escenarios funcionales

| # | Escenario | Pasos | Resultado esperado |
|---|-----------|-------|-------------------|
| C1 | Mi día | Login → Mi día | KPIs, casos prioritarios y agenda visibles |
| C2 | Bandeja | Bandeja → filtrar por mora | Lista paginada con score de prioridad |
| C3 | Gestión rápida | Mi día → Gestionar en un caso | Modal de gestión abre con préstamo cargado |
| C4 | Registrar gestión | Préstamo → pestaña Gestiones → nueva | Gestión guardada y visible en historial |
| C5 | Registrar pago | Préstamo → Pagos → nuevo pago | Pago aplicado, saldo actualizado |
| C6 | Promesa | Gestión con fecha promesa | Aparece en resumen Mi día / bandeja |
| C7 | Cliente 360 | Clientes → buscar → detalle | Vista 360 con préstamos y contactos |
| C8 | Bloqueo importar | Navegar a `/cobranza/importar` | Redirección sin acceso |

**Sign-off cobrador:** _______________ Fecha: _______

---

## 5. UAT — Supervisor

### 5.1 Acceso adicional vs cobrador

| Ruta | Debe acceder |
|------|--------------|
| `/cobranza/importar` | Sí |
| `/cobranza/asignacion` | Sí |
| `/cobranza/centro-inteligencia` | Sí |
| `/cobranza/equipo` | Sí |
| `/cobranza/liquidaciones` (lectura) | Sí |
| `/configuracion/usuarios` | **No** |

### 5.2 Escenarios funcionales

| # | Escenario | Pasos | Resultado esperado |
|---|-----------|-------|-------------------|
| S1 | Importar cartera (async) | Importar → archivo Excel → confirmar | Job encolado, monitor de progreso, estado COMPLETADO |
| S2 | Vista previa import | Importar → vista previa | Resumen filas nuevas/actualizadas sin commit |
| S3 | Asignación masiva | Asignación → seleccionar préstamos → asignar cobrador | Gestor actualizado en cartera |
| S4 | Centro inteligencia | Centro inteligencia → seleccionar mandante | KPIs, alertas y gráficos cargan |
| S5 | Equipo | Mi equipo | Dashboard supervisor con métricas del equipo |
| S6 | Reportes | Reportes → mandante CREDICOMPRAS | Aging + reporte cobranza con datos |
| S7 | Reclamos | Reclamos → listar / crear | CRUD según permisos de gestión |

**Sign-off supervisor:** _______________ Fecha: _______

---

## 6. UAT — Gerente

### 6.1 Acceso adicional vs supervisor

| Ruta | Debe acceder |
|------|--------------|
| `/configuracion/usuarios` | Sí |
| `/cobranza/liquidaciones` (escritura) | Sí |
| `/configuracion/auditoria` | **No** (solo admin) |

### 6.2 Escenarios funcionales

| # | Escenario | Pasos | Resultado esperado |
|---|-----------|-------|-------------------|
| G1 | Dashboard gerente | Equipo (vista gerente) | Resumen multi-equipo y KPIs consolidados |
| G2 | Usuarios | Configuración → Usuarios | Listado, crear/editar usuario |
| G3 | Liquidación | Liquidaciones → generar periodo | Liquidación creada con totales |
| G4 | Gamificación | Gamificación | Ranking y metas visibles |
| G5 | Mandante hub | Mandantes → detalle | Config mandante, plantillas, secuencias |

**Sign-off gerente:** _______________ Fecha: _______

---

## 7. UAT — Admin

### 7.1 Acceso total

| Ruta | Debe acceder |
|------|--------------|
| `/configuracion` | Sí |
| `/configuracion/auditoria` | Sí |
| `/configuracion/cron` | Sí |
| Todas las rutas cobranza | Sí |

### 7.2 Escenarios funcionales

| # | Escenario | Pasos | Resultado esperado |
|---|-----------|-------|-------------------|
| A1 | Auditoría | Configuración → Auditoría | Log paginado con filtros entidad/acción |
| A2 | Cron monitor | Configuración → Cron | Jobs registrados, historial ejecuciones |
| A3 | Permisos rol | Configuración → Usuarios → permisos rol | Panel RBAC funcional |
| A4 | Ejecutar cron manual | Cron → ejecutar operaciones | Resultado OK/PARCIAL con detalle jobs |
| A5 | Multi-mandante | Cambiar mandante en filtros | Datos scoped al mandante seleccionado |

**Sign-off admin:** _______________ Fecha: _______

---

## 8. UAT — Seguridad (Fase 8)

| # | Escenario | Verificación |
|---|-----------|--------------|
| SEC1 | Cookie-only | DevTools → Application → token no en localStorage |
| SEC2 | CSRF | Login sin `x-flowpay-request` → 403; con cookie CSRF, header `x-flowpay-csrf` debe coincidir |
| SEC3 | Scope cliente | Cobrador de mandante A no ve contactos de cliente de mandante B |
| SEC4 | GraphQL anónimo | Introspection sin sesión → rechazado en producción |
| SEC5 | Rate limit login | 6+ intentos fallidos → 429 |

---

## 9. UAT — Performance y escala (Fases 9–10)

| # | Escenario | Verificación |
|---|-----------|--------------|
| P1 | Bandeja | Carga < 3s con ~700 préstamos (orden prioridad) |
| P2 | Reportes | Solo consulta al seleccionar mandante |
| P3 | Import async | No bloquea UI; job procesa en background |
| P4 | Retención | Cron `auditoria_retencion` purga registros antiguos |

---

## 10. Matriz de trazabilidad

| Automatizado | Cubre |
|--------------|-------|
| `npm run test:uat` | Matriz RBAC §4–7 (acceso rutas) |
| `npm run smoke:test` | Usuarios demo, permisos, servicios core |
| `npm run qa:gate` | Regresión fases 4–10 |
| Manual §4–9 | Flujos UI end-to-end |

---

## 11. Sign-off final UAT

| Área | Aprobado | Responsable | Fecha |
|------|----------|-------------|-------|
| Cobrador | ☐ | | |
| Supervisor | ☐ | | |
| Gerente | ☐ | | |
| Admin | ☐ | | |
| Seguridad | ☐ | | |
| Performance | ☐ | | |

**Estado UAT global:** ☐ Aprobado  ☐ Aprobado con observaciones  ☐ Rechazado

Observaciones:

```
(espacio para notas)
```

---

## 12. Observaciones conocidas / backlog

- Importación sync (vista previa) sigue disponible; producción debe usar async.
- Archivos de import/upload en disco local: desplegar single-instance o migrar a object storage antes de escalar horizontalmente.
- Centro inteligencia y reportes: seleccionar mandante mejora tiempos de carga.
