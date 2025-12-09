# Integración Full Stack - FlowPay

Este documento describe la integración completa de tecnologías full stack en el proyecto FlowPay.

## Tecnologías Integradas

- ✅ **Prisma ORM** - ORM para PostgreSQL
- ✅ **Pothos** - Constructor de esquemas GraphQL tipado
- ✅ **Zod** - Validación de esquemas
- ✅ **TanStack Query** - Manejo de estado del servidor y caché
- ✅ **TanStack Table** - Tablas avanzadas y flexibles
- ✅ **GraphQL** - API GraphQL con Pothos y GraphQL Yoga
- ✅ **Axios** - Cliente HTTP para todas las peticiones

## Configuración Inicial

### 1. Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# SQL Server Connection String
# Formato: sqlserver://server:port;database=dbname;user=username;password=password;encrypt=true
DATABASE_URL="sqlserver://localhost:1433;database=flowpay;user=sa;password=YourPassword123;encrypt=true;trustServerCertificate=true"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
NEXT_PUBLIC_DEMO_USER_MAIL="demo@example.com"
NEXT_PUBLIC_DEMO_USER_PASS="demo123"
```

**Nota sobre SQL Server:**
- Para desarrollo local, usa `trustServerCertificate=true` si no tienes certificado SSL
- Para producción, configura `encrypt=true` y un certificado válido
- El puerto por defecto de SQL Server es `1433`
- Puedes usar SQL Server Express, SQL Server LocalDB, o Azure SQL Database

### 2. Base de Datos

1. Asegúrate de tener SQL Server instalado y corriendo
   - **SQL Server Express** (gratis): https://www.microsoft.com/sql-server/sql-server-downloads
   - **SQL Server LocalDB** (para desarrollo): Incluido con Visual Studio
   - **Azure SQL Database** (cloud): https://azure.microsoft.com/services/sql-database/
2. Crea la base de datos:
   ```sql
   CREATE DATABASE flowpay;
   ```
3. Ejecuta las migraciones:

```bash
npm run db:push
# o
npm run db:migrate
```

3. Genera el cliente de Prisma:

```bash
npm run db:generate
```

4. (Opcional) Ejecuta el seed para poblar la base de datos con datos de ejemplo:

```bash
npm run db:seed
```

El seed creará:
- 2 usuarios de ejemplo
- 5 canales
- 4 dispositivos
- 4 pagos
- 5 chats
- 2 estadísticas (mensual y anual)

### 3. Estructura del Proyecto

```
src/
├── lib/
│   ├── prisma.ts              # Cliente de Prisma
│   ├── axios.ts               # Cliente Axios configurado
│   └── graphql/
│       ├── builder.ts         # Builder de Pothos
│       ├── schema.ts          # Schema GraphQL principal
│       ├── client.ts           # Cliente GraphQL (usa Axios)
│       ├── schemas/            # Schemas GraphQL
│       │   ├── user.schema.ts
│       │   ├── payment.schema.ts
│       │   └── channel.schema.ts
│       └── queries/            # Queries GraphQL
│           ├── user.queries.ts
│           ├── payment.queries.ts
│           └── channel.queries.ts
├── services/
│   ├── mock-data.service.ts   # Servicio consolidado de datos mock
│   └── charts.services.ts    # Servicios de gráficos
├── app/
│   ├── api/
│   │   └── graphql/
│   │       └── route.ts       # Endpoint GraphQL
│   └── providers.tsx          # Providers (incluye TanStack Query)
└── hooks/
    ├── use-graphql-query.ts    # Hook para queries GraphQL
    └── use-graphql-mutation.ts # Hook para mutations GraphQL
```

## Uso

### GraphQL Queries con TanStack Query

```tsx
"use client";

import { useGraphQLQuery } from "@/hooks/use-graphql-query";
import { GET_USERS } from "@/lib/graphql/queries/user.queries";

export function UsersList() {
  const { data, isLoading, error } = useGraphQLQuery<{ users: User[] }>(GET_USERS);

  if (isLoading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data?.users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### GraphQL Mutations con TanStack Query

```tsx
"use client";

import { useGraphQLMutation } from "@/hooks/use-graphql-mutation";
import { CREATE_USER } from "@/lib/graphql/queries/user.queries";
import { useQueryClient } from "@tanstack/react-query";

export function CreateUserForm() {
  const queryClient = useQueryClient();
  const mutation = useGraphQLMutation(CREATE_USER, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GET_USERS] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      input: {
        email: "user@example.com",
        name: "John Doe",
      },
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### TanStack Table

```tsx
"use client";

import { TanStackTable } from "@/components/Tables/tanstack-table";
import type { ColumnDef } from "@tanstack/react-table";

const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
];

export function UsersTable({ users }: { users: User[] }) {
  return <TanStackTable data={users} columns={columns} enableSorting />;
}
```

## Endpoint GraphQL

El endpoint GraphQL está disponible en: `http://localhost:3000/api/graphql`

Puedes probarlo con GraphQL Playground o cualquier cliente GraphQL.

### Ejemplo de Query

```graphql
query {
  users {
    id
    name
    email
  }
}
```

### Ejemplo de Mutation

```graphql
mutation {
  createUser(input: {
    email: "test@example.com"
    name: "Test User"
  }) {
    id
    email
    name
  }
}
```

## Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Genera Prisma Client y construye la app
- `npm run db:generate` - Genera el cliente de Prisma
- `npm run db:push` - Sincroniza el schema con la base de datos
- `npm run db:migrate` - Crea una migración
- `npm run db:studio` - Abre Prisma Studio

## Próximos Pasos

1. Configurar autenticación real con NextAuth
2. Agregar más schemas GraphQL según necesites
3. Implementar paginación en las queries
4. Agregar filtros y búsqueda
5. Implementar real-time con GraphQL Subscriptions (opcional)

## Notas

- El cliente de Prisma se genera automáticamente en `node_modules/.prisma/client`
- Los schemas de GraphQL se registran automáticamente al importar `schema.ts`
- TanStack Query maneja automáticamente el caché y la refetch
- Las validaciones con Zod se ejecutan automáticamente en las mutations
