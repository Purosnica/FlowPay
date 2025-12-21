# SISTEMA DE PERMISOS RBAC (Role-Based Access Control)

Este documento describe el sistema de permisos avanzados implementado en FlowPay, basado en roles (RBAC) y completamente dinámico.

## 📋 Índice

1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Modelos de Datos](#modelos-de-datos)
3. [Permisos Base](#permisos-base)
4. [Validación de Permisos](#validación-de-permisos)
5. [Integración en GraphQL](#integración-en-graphql)
6. [Gestión de Permisos](#gestión-de-permisos)
7. [Roles Predefinidos](#roles-predefinidos)

---

## Arquitectura del Sistema

### Estructura RBAC

```
Usuario (tbl_usuario)
  └── Rol (tbl_rol)
       └── Permisos (tbl_rol_permiso)
            └── Permiso (tbl_permiso)
```

**Flujo de Validación:**
1. Usuario intenta realizar una operación
2. Sistema obtiene el rol del usuario
3. Sistema obtiene los permisos asociados al rol
4. Sistema verifica si el permiso requerido está en la lista
5. Si tiene permiso: permite la operación
6. Si no tiene permiso: rechaza con error

---

## Modelos de Datos

### `tbl_permiso`

Catálogo de permisos disponibles en el sistema.

```prisma
model tbl_permiso {
  idpermiso   Int      @id @default(autoincrement())
  codigo      String   @unique // Ej: "CREATE_LOAN", "EDIT_LOAN"
  nombre      String   // Nombre legible
  descripcion String?  @db.Text
  categoria   String?  // "PRESTAMOS", "PAGOS", "COBRANZA", etc.
  estado      Boolean  @default(true)
  deletedAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  roles tbl_rol_permiso[]
}
```

### `tbl_rol_permiso`

Tabla intermedia para relación muchos a muchos entre roles y permisos.

```prisma
model tbl_rol_permiso {
  idrolPermiso Int      @id @default(autoincrement())
  idrol        Int
  idpermiso    Int
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  rol     tbl_rol     @relation(...)
  permiso tbl_permiso @relation(...)

  @@unique([idrol, idpermiso])
}
```

### `tbl_rol` (Actualizado)

Relación agregada con permisos:

```prisma
model tbl_rol {
  // ... campos existentes
  permisos tbl_rol_permiso[]
}
```

---

## Permisos Base

### Permisos de Préstamos

- **`CREATE_LOAN`**: Crear préstamos
- **`EDIT_LOAN`**: Editar préstamos
- **`DELETE_LOAN`**: Eliminar préstamos (soft delete)
- **`VIEW_LOAN`**: Ver préstamos
- **`RESTRUCTURE_LOAN`**: Reestructurar préstamos
- **`ASSIGN_MANAGER`**: Asignar gestores
- **`VIEW_PORTFOLIO`**: Ver cartera

### Permisos de Pagos

- **`APPLY_PAYMENT`**: Registrar pagos
- **`EDIT_PAYMENT`**: Editar pagos
- **`DELETE_PAYMENT`**: Eliminar pagos (soft delete)
- **`VIEW_PAYMENT`**: Ver pagos

### Permisos de Cobranza

- **`MANAGE_COLLECTION`**: Gestionar cobranza, promesas y castigos

### Permisos de Reportes

- **`VIEW_REPORTS`**: Ver reportes y KPIs

### Permisos de Configuración

- **`CONFIG_SYSTEM`**: Configurar sistema

### Permisos de Documentos

- **`MANAGE_DOCUMENTS`**: Gestionar documentos

### Permisos de Terceros

- **`MANAGE_THIRD_PARTY`**: Gestionar liquidaciones de terceros

---

## Validación de Permisos

### Servicio de Permisos

El servicio `permission-service.ts` proporciona funciones para validar permisos:

#### `tienePermiso()`
Verifica si un usuario tiene un permiso específico.

```typescript
const tiene = await tienePermiso(idusuario, "CREATE_LOAN");
if (!tiene) {
  throw new Error("No tienes permiso para crear préstamos");
}
```

#### `requerirPermiso()`
Lanza error automáticamente si no tiene permiso (útil para mutations).

```typescript
await requerirPermiso(idusuario, "CREATE_LOAN");
// Si no tiene permiso, lanza error automáticamente
```

#### `tieneAlgunPermiso()`
Verifica si tiene al menos uno de varios permisos.

```typescript
const tiene = await tieneAlgunPermiso(idusuario, [
  "EDIT_LOAN",
  "CREATE_LOAN",
]);
```

#### `tieneTodosLosPermisos()`
Verifica si tiene todos los permisos especificados.

```typescript
const tiene = await tieneTodosLosPermisos(idusuario, [
  "CREATE_LOAN",
  "APPLY_PAYMENT",
]);
```

#### `obtenerPermisosUsuario()`
Obtiene todos los permisos de un usuario.

```typescript
const permisos = await obtenerPermisosUsuario(idusuario);
// ["CREATE_LOAN", "EDIT_LOAN", "APPLY_PAYMENT", ...]
```

---

## Integración en GraphQL

### Mutations Protegidas

Todas las mutations críticas validan permisos antes de ejecutar:

#### Ejemplo: Crear Préstamo

```typescript
builder.mutationField("createPrestamo", (t) =>
  t.prismaField({
    type: Prestamo,
    args: {
      input: t.arg({ type: CreatePrestamoInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      const input = CreatePrestamoInputSchema.parse(args.input);

      // Validar permiso
      await requerirPermiso(input.idusuarioCreador, "CREATE_LOAN");

      // Continuar con la operación...
      const prestamo = await ctx.prisma.tbl_prestamo.create({...});
      return prestamo;
    },
  })
);
```

#### Ejemplo: Registrar Pago

```typescript
builder.mutationField("registrarPagoConAplicacion", (t) =>
  t.field({
    type: Pago,
    resolve: async (_parent, args, ctx) => {
      const input = CreatePagoInputSchema.parse(args.input);

      // Validar permiso
      await requerirPermiso(input.idusuario, "APPLY_PAYMENT");

      // Continuar con la operación...
    },
  })
);
```

### Queries Protegidas

Las queries también pueden validar permisos:

#### Ejemplo: Ver Cartera

```typescript
builder.queryField("cartera", (t) =>
  t.field({
    type: CarteraPage,
    args: {
      filters: t.arg({ type: CarteraFiltersInput, required: false }),
      idusuario: t.arg.int({ required: false }),
    },
    resolve: async (_parent, args, ctx) => {
      // Validar permiso
      await requerirPermiso(args.idusuario, "VIEW_PORTFOLIO");

      // Continuar con la consulta...
    },
  })
);
```

### Mutations con Validación de Permisos

| Mutation | Permiso Requerido |
|----------|-------------------|
| `createPrestamo` | `CREATE_LOAN` |
| `updatePrestamo` | `EDIT_LOAN` |
| `createPago` | `APPLY_PAYMENT` |
| `registrarPagoConAplicacion` | `APPLY_PAYMENT` |
| `updatePago` | `EDIT_PAYMENT` |
| `deletePago` | `DELETE_PAYMENT` |
| `asignarGestor` | `ASSIGN_MANAGER` |
| `reestructurarPrestamo` | `RESTRUCTURE_LOAN` |
| `castigarCartera` | `MANAGE_COLLECTION` |
| `createDocumento` | `MANAGE_DOCUMENTS` |
| `deleteDocumento` | `MANAGE_DOCUMENTS` |
| `createLiquidacionTercero` | `MANAGE_THIRD_PARTY` |
| `updateLiquidacionTercero` | `MANAGE_THIRD_PARTY` |
| `updateConfiguracionSistema` | `CONFIG_SYSTEM` |

### Queries con Validación de Permisos

| Query | Permiso Requerido |
|-------|-------------------|
| `cartera` | `VIEW_PORTFOLIO` |
| `agingCartera` | `VIEW_REPORTS` |
| `recuperacionRealVsEsperada` | `VIEW_REPORTS` |
| `rankingGestores` | `VIEW_REPORTS` |
| `moraPromedio` | `VIEW_REPORTS` |

---

## Gestión de Permisos

### Crear Nuevo Permiso

```typescript
import { crearPermiso } from "@/lib/permissions/permission-service";

const permiso = await crearPermiso(
  "NUEVO_PERMISO",
  "Nuevo Permiso",
  "Descripción del permiso",
  "CATEGORIA"
);
```

### Asignar Permiso a Rol

```typescript
import { asignarPermisoARol } from "@/lib/permissions/permission-service";

// Obtener IDs
const rol = await prisma.tbl_rol.findUnique({ where: { codigo: "GESTOR" } });
const permiso = await prisma.tbl_permiso.findUnique({ where: { codigo: "CREATE_LOAN" } });

// Asignar
await asignarPermisoARol(rol.idrol, permiso.idpermiso);
```

### Remover Permiso de Rol

```typescript
import { removerPermisoDeRol } from "@/lib/permissions/permission-service";

await removerPermisoDeRol(rol.idrol, permiso.idpermiso);
```

### Obtener Permisos de un Rol

```typescript
import { obtenerPermisosRol } from "@/lib/permissions/permission-service";

const permisos = await obtenerPermisosRol(idrol);
// ["CREATE_LOAN", "EDIT_LOAN", ...]
```

---

## Roles Predefinidos

### ADMIN

**Descripción:** Administrador del sistema con acceso completo.

**Permisos:**
- Todos los permisos del sistema

### GESTOR

**Descripción:** Gestor de cobranza con permisos operativos.

**Permisos:**
- `VIEW_LOAN`
- `VIEW_PAYMENT`
- `APPLY_PAYMENT`
- `MANAGE_COLLECTION`
- `VIEW_PORTFOLIO`
- `ASSIGN_MANAGER`
- `VIEW_REPORTS`
- `MANAGE_DOCUMENTS`

### CONSULTA

**Descripción:** Usuario de solo lectura.

**Permisos:**
- `VIEW_LOAN`
- `VIEW_PAYMENT`
- `VIEW_PORTFOLIO`
- `VIEW_REPORTS`

---

## Seed de Permisos

Para crear los permisos base y asignarlos a roles, ejecutar:

```bash
npx tsx prisma/seed-permisos.ts
```

Este script:
1. Crea todos los permisos base
2. Crea roles predefinidos (ADMIN, GESTOR, CONSULTA)
3. Asigna permisos a cada rol según su función

---

## Características del Sistema

### ✅ Dinámico

- Los permisos se almacenan en la base de datos
- No hay código hardcodeado
- Se pueden crear nuevos permisos sin modificar código
- Se pueden asignar/remover permisos a roles dinámicamente

### ✅ Flexible

- Un rol puede tener múltiples permisos
- Un permiso puede estar en múltiples roles
- Fácil agregar nuevos permisos y roles

### ✅ Seguro

- Validación en cada operación crítica
- Mensajes de error claros
- Auditoría completa

### ✅ Escalable

- Fácil agregar nuevos permisos
- Fácil crear nuevos roles
- Sistema preparado para crecer

---

## Mejores Prácticas

1. **Siempre validar permisos en mutations críticas**
   - Usar `requerirPermiso()` para validación automática
   - Validar antes de ejecutar la operación

2. **Usar códigos de permisos descriptivos**
   - Formato: `ACCION_RECURSO` (ej: `CREATE_LOAN`)
   - Mantener consistencia en nomenclatura

3. **Agrupar permisos por categoría**
   - Facilita la gestión y visualización
   - Permite filtros por categoría

4. **Documentar permisos nuevos**
   - Agregar al catálogo de permisos
   - Documentar en qué mutations/queries se usa

5. **Revisar permisos periódicamente**
   - Verificar que los roles tengan los permisos correctos
   - Limpiar permisos no utilizados

---

## Resumen

El sistema RBAC implementado garantiza:

✅ **Control de acceso granular** por operación
✅ **Sistema completamente dinámico** (sin código hardcodeado)
✅ **Fácil gestión** de permisos y roles
✅ **Validación automática** en todas las operaciones críticas
✅ **Escalable** para agregar nuevos permisos y roles
✅ **Seguro** con mensajes de error claros

El sistema está listo para usar y puede extenderse fácilmente con nuevos permisos y roles según las necesidades del negocio.




