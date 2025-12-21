# 🚀 Mejoras y Buenas Prácticas - FlowPay Fullstack

Este documento contiene recomendaciones de mejoras basadas en buenas prácticas para frontend y backend.

## 📋 Índice

1. [Estructura del Proyecto](#estructura-del-proyecto)
2. [Backend / API](#backend--api)
3. [Frontend](#frontend)
4. [Seguridad](#seguridad)
5. [Manejo de Errores](#manejo-de-errores)
6. [Validación y Tipos](#validación-y-tipos)
7. [Base de Datos](#base-de-datos)
8. [Testing](#testing)
9. [Performance](#performance)
10. [DevOps y CI/CD](#devops-y-cicd)
11. [Documentación](#documentación)

---

## 🏗️ Estructura del Proyecto

### ✅ Mejoras Recomendadas

#### 1. Organización de Carpetas API

**Problema actual:** No hay estructura clara para las rutas API de Next.js.

**Solución:**
```
src/app/
├── api/
│   ├── graphql/
│   │   └── route.ts
│   ├── auth/
│   │   ├── login/
│   │   │   └── route.ts
│   │   └── logout/
│   │       └── route.ts
│   └── [resource]/
│       └── route.ts
```

#### 2. Separación de Lógica de Negocio

**Crear estructura:**
```
src/
├── app/              # Next.js App Router
├── components/       # Componentes UI
├── lib/             # Utilidades y configuraciones
├── services/        # Lógica de negocio
│   ├── auth.service.ts
│   ├── payment.service.ts
│   └── user.service.ts
├── repositories/    # Acceso a datos (Prisma)
│   ├── user.repository.ts
│   └── payment.repository.ts
├── validators/      # Validaciones con Zod
│   ├── auth.validator.ts
│   └── payment.validator.ts
└── types/          # Tipos TypeScript
```

---

## 🔧 Backend / API

### ✅ Mejoras Recomendadas

#### 1. Crear Endpoint GraphQL

**Problema:** No existe el endpoint `/api/graphql/route.ts`

**Solución:** Crear `src/app/api/graphql/route.ts`:

```typescript
import { createYoga } from 'graphql-yoga';
import { schema } from '@/lib/graphql/schema';
import type { NextRequest } from 'next/server';

const { handleRequest } = createYoga({
  schema,
  graphqlEndpoint: '/api/graphql',
  fetchAPI: {
    Request: NextRequest,
  },
  context: async (req) => {
    // Agregar contexto (usuario autenticado, etc.)
    return {
      prisma,
      user: await getCurrentUser(req),
    };
  },
});

export { handleRequest as GET, handleRequest as POST };
```

#### 2. Manejo de Errores Centralizado

**Crear:** `src/lib/errors/app-error.ts`:

```typescript
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}
```

#### 3. Middleware de Autenticación

**Crear:** `src/lib/middleware/auth.ts`:

```typescript
import { NextRequest } from 'next/server';
import { UnauthorizedError } from '@/lib/errors/app-error';

export async function getCurrentUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!token) {
    throw new UnauthorizedError();
  }
  
  // Verificar token JWT
  // Retornar usuario
}
```

#### 4. Rate Limiting

**Instalar:** `npm install @upstash/ratelimit @upstash/redis`

**Crear:** `src/lib/middleware/rate-limit.ts`:

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const rateLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
});
```

#### 5. Validación con Zod en GraphQL

**Mejorar:** `src/lib/graphql/builder.ts`:

```typescript
// Agregar validación automática
builder.mutationField('createUser', (t) =>
  t.prismaField({
    type: 'User',
    args: {
      data: t.arg({ type: CreateUserInput, required: true }),
    },
    resolve: async (query, _parent, args, ctx) => {
      // Validación automática con Zod
      const validated = CreateUserSchema.parse(args.data);
      return ctx.prisma.user.create({ data: validated, ...query });
    },
  })
);
```

#### 6. Logging Estructurado

**Instalar:** `npm install pino pino-pretty`

**Crear:** `src/lib/logger.ts`:

```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' 
    ? { target: 'pino-pretty' }
    : undefined,
});
```

---

## 🎨 Frontend

### ✅ Mejoras Recomendadas

#### 1. Manejo de Errores en React Query

**Mejorar:** `src/hooks/use-graphql-query.ts`:

```typescript
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { graphqlRequest } from "@/lib/graphql/client";
import { toast } from "sonner"; // o tu librería de notificaciones

export function useGraphQLQuery<T = any>(
  query: string,
  variables?: Record<string, any>,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">
) {
  return useQuery<T>({
    queryKey: [query, variables],
    queryFn: () => graphqlRequest<T>(query, variables),
    retry: (failureCount, error: any) => {
      // No reintentar en errores 4xx
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
    onError: (error: any) => {
      const message = error?.response?.data?.errors?.[0]?.message || error.message;
      toast.error(message || "Error al cargar datos");
    },
    ...options,
  });
}
```

#### 2. Error Boundary

**Crear:** `src/components/ErrorBoundary.tsx`:

```typescript
"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    // Enviar a servicio de logging (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Algo salió mal</h2>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-primary text-white rounded"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### 3. Loading States Consistentes

**Crear:** `src/components/ui/loading.tsx`:

```typescript
export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`${sizeClasses[size]} border-4 border-gray-200 border-t-primary rounded-full animate-spin`}
      />
    </div>
  );
}

export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  );
}
```

#### 4. Formularios con React Hook Form + Zod

**Instalar:** `npm install react-hook-form @hookform/resolvers`

**Ejemplo:** `src/components/forms/UserForm.tsx`:

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const userSchema = z.object({
  name: z.string().min(2, "Nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
});

type UserFormData = z.infer<typeof userSchema>;

export function UserForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const onSubmit = async (data: UserFormData) => {
    // Lógica de envío
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Campos del formulario */}
    </form>
  );
}
```

#### 5. Variables de Entorno Tipadas

**Crear:** `src/lib/env.ts`:

```typescript
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
```

---

## 🔒 Seguridad

### ✅ Mejoras Recomendadas

#### 1. Autenticación con NextAuth.js

**Instalar:** `npm install next-auth`

**Crear:** `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) return null;

        const isValid = await compare(credentials.password, user.password);

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

#### 2. Middleware de Protección de Rutas

**Crear:** `src/middleware.ts`:

```typescript
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Lógica adicional de middleware
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Verificar permisos según la ruta
        if (req.nextUrl.pathname.startsWith("/admin")) {
          return token?.role === "admin";
        }
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
```

#### 3. Sanitización de Inputs

**Instalar:** `npm install dompurify @types/dompurify`

**Crear:** `src/lib/sanitize.ts`:

```typescript
import DOMPurify from "dompurify";

export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") {
    return html;
  }
  return DOMPurify.sanitize(html);
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, "");
}
```

#### 4. Headers de Seguridad

**Mejorar:** `next.config.mjs`:

```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};
```

#### 5. Variables de Entorno Seguras

**Crear:** `.env.example`:

```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/flowpay"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-min-32-chars"

# API
NEXT_PUBLIC_API_URL="http://localhost:3000/api"

# Rate Limiting (Upstash)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# Logging
LOG_LEVEL="info"
```

---

## ⚠️ Manejo de Errores

### ✅ Mejoras Recomendadas

#### 1. Error Handler Global

**Crear:** `src/app/error.tsx`:

```typescript
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Algo salió mal!</h2>
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-white rounded"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
```

#### 2. Not Found Page

**Crear:** `src/app/not-found.tsx`:

```typescript
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-4xl font-bold mb-4">404</h2>
        <p className="mb-4">Página no encontrada</p>
        <Link href="/" className="text-primary hover:underline">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
```

#### 3. Toast Notifications

**Instalar:** `npm install sonner`

**Agregar a:** `src/app/providers.tsx`:

```typescript
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-right" />
    </>
  );
}
```

---

## ✅ Validación y Tipos

### ✅ Mejoras Recomendadas

#### 1. Schemas Zod Centralizados

**Crear:** `src/validators/index.ts`:

```typescript
import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/, "Debe contener mayúscula"),
});

export const updateUserSchema = createUserSchema.partial();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
```

#### 2. Tipos Compartidos

**Crear:** `src/types/index.ts`:

```typescript
import type { User, Payment } from "@prisma/client";

export type UserWithRelations = User & {
  payments?: Payment[];
};

export type ApiResponse<T> = {
  data: T;
  message?: string;
  errors?: string[];
};
```

---

## 🗄️ Base de Datos

### ✅ Mejoras Recomendadas

#### 1. Índices en Prisma Schema

**Mejorar:** `prisma/schema.prisma`:

```prisma
model tbl_pais {
  idpais Int @id @default(autoincrement())
  codepais String @unique
  descripcion String
  estado Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([codepais])
  @@index([estado])
  @@map("tbl_pais")
}
```

#### 2. Soft Deletes

**Agregar a modelos:**

```prisma
model tbl_pais {
  // ... campos existentes
  deletedAt DateTime?
  
  @@index([deletedAt])
}
```

#### 3. Migraciones Versionadas

**Usar:** Siempre usar `prisma migrate` en lugar de `db push` en producción:

```bash
npm run db:migrate
```

#### 4. Connection Pooling

**Mejorar:** `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Cerrar conexión al terminar
if (process.env.NODE_ENV === "production") {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}
```

---

## 🧪 Testing

### ✅ Mejoras Recomendadas

#### 1. Configuración de Testing

**Instalar:**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
```

**Crear:** `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

#### 2. Tests de Componentes

**Crear:** `src/components/__tests__/Button.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

describe("Button", () => {
  it("renders correctly", () => {
    // Test implementation
  });
});
```

#### 3. Tests de API

**Crear:** `src/app/api/__tests__/graphql.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("GraphQL API", () => {
  it("should return users", async () => {
    // Test implementation
  });
});
```

---

## ⚡ Performance

### ✅ Mejoras Recomendadas

#### 1. Optimización de Imágenes

**Ya configurado en:** `next.config.mjs` ✅

#### 2. Code Splitting

**Usar:** Dynamic imports para componentes pesados:

```typescript
import dynamic from "next/dynamic";

const HeavyComponent = dynamic(() => import("@/components/HeavyComponent"), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});
```

#### 3. Caché de React Query

**Mejorar:** `src/app/providers.tsx`:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minuto
      gcTime: 5 * 60 * 1000, // 5 minutos (antes cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

#### 4. Bundle Analysis

**Instalar:** `npm install -D @next/bundle-analyzer`

**Agregar a:** `next.config.mjs`:

```javascript
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer(nextConfig);
```

---

## 🚀 DevOps y CI/CD

### ✅ Mejoras Recomendadas

#### 1. GitHub Actions

**Crear:** `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

#### 2. Pre-commit Hooks

**Instalar:** `npm install -D husky lint-staged`

**Configurar:** `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

#### 3. Docker

**Crear:** `Dockerfile`:

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 📚 Documentación

### ✅ Mejoras Recomendadas

#### 1. README Mejorado

**Incluir:**
- Arquitectura del proyecto
- Diagramas de flujo
- Guía de contribución
- Changelog

#### 2. Documentación de API

**Usar:** GraphQL Codegen para documentación automática

**Instalar:** `npm install -D @graphql-codegen/cli`

#### 3. Comentarios JSDoc

**Ejemplo:**

```typescript
/**
 * Obtiene un usuario por su ID
 * @param userId - ID del usuario
 * @returns Usuario encontrado o null
 * @throws {NotFoundError} Si el usuario no existe
 */
export async function getUserById(userId: string) {
  // Implementation
}
```

---

## 📊 Resumen de Prioridades

### 🔴 Alta Prioridad
1. ✅ Crear endpoint GraphQL (`/api/graphql/route.ts`)
2. ✅ Implementar autenticación (NextAuth.js)
3. ✅ Manejo centralizado de errores
4. ✅ Validación con Zod
5. ✅ Variables de entorno tipadas

### 🟡 Media Prioridad
6. ✅ Error Boundaries
7. ✅ Rate Limiting
8. ✅ Logging estructurado
9. ✅ Testing básico
10. ✅ CI/CD pipeline

### 🟢 Baja Prioridad
11. ✅ Documentación mejorada
12. ✅ Bundle analysis
13. ✅ Docker setup
14. ✅ Pre-commit hooks

---

## 🎯 Próximos Pasos

1. Revisar y priorizar las mejoras según tus necesidades
2. Implementar las mejoras de alta prioridad primero
3. Configurar CI/CD y testing
4. Documentar decisiones arquitectónicas
5. Establecer estándares de código en el equipo

---

**Nota:** Este documento es una guía. Adapta las recomendaciones según las necesidades específicas de tu proyecto.











