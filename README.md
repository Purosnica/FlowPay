# FlowPay - Dashboard de Pagos

**FlowPay** es un dashboard administrativo moderno construido con Next.js 16, diseñado para gestionar pagos, transacciones y análisis financieros.

## 🚀 Características

- **Dashboard Completo** - Interfaz moderna y responsive para gestión de pagos
- **GraphQL API** - API GraphQL con Pothos y validación con Zod
- **SQL Server** - Base de datos SQL Server con Prisma ORM
- **TanStack Query** - Manejo eficiente de estado del servidor y caché
- **TanStack Table** - Tablas avanzadas con ordenamiento y filtrado
- **Dark Mode** - Soporte completo para modo oscuro y claro
- **TypeScript** - Código completamente tipado
- **Componentes Reutilizables** - Más de 200 componentes UI listos para usar

## 🛠️ Stack Tecnológico

- **Next.js 16** - Framework React con App Router
- **React 19** - Biblioteca UI
- **TypeScript** - Tipado estático
- **Prisma ORM** - ORM para SQL Server
- **Pothos** - Constructor de esquemas GraphQL
- **Zod** - Validación de esquemas
- **TanStack Query** - Estado del servidor
- **TanStack Table** - Tablas avanzadas
- **Axios** - Cliente HTTP
- **Tailwind CSS** - Estilos
- **ApexCharts** - Gráficos interactivos

## 📦 Instalación

1. Clona el repositorio y navega al directorio:

```bash
cd FlowPay
```

2. Instala las dependencias:

```bash
npm install
```

3. Configura las variables de entorno:

Crea un archivo `.env` en la raíz del proyecto:

```env
DATABASE_URL="sqlserver://localhost:1433;database=flowpay;user=sa;password=YourPassword123;encrypt=true;trustServerCertificate=true"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
NEXT_PUBLIC_DEMO_USER_MAIL="demo@example.com"
NEXT_PUBLIC_DEMO_USER_PASS="demo123"
```

4. Configura la base de datos:

```bash
# Generar cliente de Prisma
npm run db:generate

# Crear tablas
npm run db:push

# (Opcional) Poblar con datos de ejemplo
npm run db:seed
```

5. Inicia el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

## 📚 Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Inicia el servidor de producción
- `npm run lint` - Ejecuta el linter
- `npm run db:generate` - Genera el cliente de Prisma
- `npm run db:push` - Sincroniza el schema con la base de datos
- `npm run db:migrate` - Crea una migración
- `npm run db:studio` - Abre Prisma Studio
- `npm run db:seed` - Ejecuta el seed de la base de datos

## 📖 Documentación

- [Guía de Integración](./README-INTEGRATION.md) - Configuración completa del stack
- [Configuración SQL Server](./docs/SQL-SERVER-SETUP.md) - Guía de SQL Server
- [Auditoría de Seguridad](./SECURITY-AUDIT.md) - Reporte de seguridad

## 🏗️ Estructura del Proyecto

```
src/
├── app/              # App Router de Next.js
├── components/       # Componentes React reutilizables
├── lib/             # Utilidades y configuraciones
│   ├── prisma.ts    # Cliente de Prisma
│   ├── axios.ts     # Cliente HTTP
│   └── graphql/     # Configuración GraphQL
├── hooks/           # Custom hooks
├── services/        # Servicios de datos
└── types/           # Tipos TypeScript
```

## 🔒 Seguridad

El proyecto ha sido auditado y no contiene código malicioso ni seguimiento no autorizado. Todas las vulnerabilidades han sido corregidas.

## 📝 Licencia

Este proyecto es privado.

## 🤝 Contribuir

Este es un proyecto privado. Para sugerencias o mejoras, contacta al equipo de desarrollo.

---

**FlowPay** - Dashboard de gestión de pagos moderno y eficiente.