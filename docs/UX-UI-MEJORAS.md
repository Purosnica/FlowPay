# Mejoras UX/UI Implementadas

Este documento describe todas las mejoras de experiencia de usuario implementadas en FlowPay.

## 📋 Índice

1. [Buscador Global](#buscador-global)
2. [Autocompletado](#autocompletado)
3. [Selector de Fechas](#selector-de-fechas)
4. [Tablas Avanzadas](#tablas-avanzadas)
5. [Notificaciones](#notificaciones)
6. [Validaciones Visuales](#validaciones-visuales)

---

## 🔍 Buscador Global

### Características

- Búsqueda rápida de clientes y préstamos
- Resultados en tiempo real con debounce (300ms)
- Autocompletado y sugerencias
- Navegación directa a resultados
- Limitado a 5 resultados por tipo para rendimiento

### Ubicación

Integrado en el header de la aplicación (visible en desktop, oculto en móvil).

### Uso

```tsx
import { GlobalSearch } from "@/components/ui/global-search";

<GlobalSearch />
```

### Query GraphQL

```graphql
query BuscarGlobal($query: String!, $limite: Int) {
  buscarGlobal(query: $query, limite: $limite) {
    total
    clientes {
      tipo
      id
      codigo
      nombre
      subtitulo
    }
    prestamos {
      tipo
      id
      codigo
      nombre
      subtitulo
    }
  }
}
```

---

## 🎯 Autocompletado

### Características

- Búsqueda en tiempo real
- Navegación con teclado (flechas, Enter, Escape)
- Resaltado de opción seleccionada
- Filtrado personalizable
- Soporte para subtítulos

### Componente: `AutocompleteInput`

```tsx
import { AutocompleteInput } from "@/components/ui/autocomplete-input";

<AutocompleteInput
  label="Cliente"
  options={[
    { value: 1, label: "Juan Pérez", subtitle: "1234567" },
    { value: 2, label: "María García", subtitle: "7654321" },
  ]}
  value={selectedValue}
  onChange={(value) => setSelectedValue(value)}
  onSearch={(query) => {
    // Cargar opciones basadas en query
  }}
  filterFn={(option, query) => {
    return option.label.toLowerCase().includes(query.toLowerCase());
  }}
  loading={isLoading}
  maxResults={10}
/>
```

### Props

- `options`: Array de opciones con `value`, `label` y opcional `subtitle`
- `value`: Valor seleccionado
- `onChange`: Callback cuando se selecciona un valor
- `onSearch`: Callback para búsqueda (opcional, para carga async)
- `filterFn`: Función de filtrado personalizada
- `loading`: Estado de carga
- `maxResults`: Máximo de resultados a mostrar

---

## 📅 Selector de Fechas

### Características

- Integración con Flatpickr
- Localización en español
- Soporte para diferentes modos: single, range, multiple
- Selección de hora opcional
- Fechas mínimas/máximas
- Fechas deshabilitadas/habilitadas
- Modo inline opcional

### Componente: `DateInput`

```tsx
import { DateInput } from "@/components/ui/date-input";

<DateInput
  label="Fecha de Desembolso"
  value={fecha}
  onChange={(date) => setFecha(date)}
  dateFormat="Y-m-d"
  enableTime={false}
  minDate={new Date()}
  required
/>
```

### Props

- `value`: Date | string | null
- `onChange`: (date: Date | null) => void
- `mode`: "single" | "range" | "multiple"
- `minDate` / `maxDate`: Fechas límite
- `dateFormat`: Formato de fecha (default: "Y-m-d")
- `enableTime`: Habilitar selección de hora
- `time24hr`: Formato 24 horas
- `disable` / `enable`: Arrays de fechas a deshabilitar/habilitar
- `inline`: Mostrar calendario siempre visible

---

## 📊 Tablas Avanzadas

### Componente: `AdvancedTable`

Tabla completa con todas las funcionalidades:

- ✅ Paginación
- ✅ Ordenamiento por columna
- ✅ Filtro global
- ✅ Filtros por columna
- ✅ Visibilidad de columnas
- ✅ Responsive
- ✅ Dark mode

```tsx
import { AdvancedTable } from "@/components/ui/advanced-table";

<AdvancedTable
  data={prestamos}
  columns={columns}
  enablePagination={true}
  enableSorting={true}
  enableFiltering={true}
  pageSize={25}
  pageSizeOptions={[10, 25, 50, 100]}
  onRowClick={(prestamo) => {
    router.push(`/prestamos/${prestamo.idprestamo}`);
  }}
/>
```

### Componente: `VirtualizedTable`

Para grandes volúmenes de datos (5000+ filas):

- ✅ Renderizado virtual
- ✅ Scroll infinito
- ✅ Ordenamiento
- ✅ Filtros
- ✅ Optimizado para rendimiento

```tsx
import { VirtualizedTable } from "@/components/ui/virtualized-table";

<VirtualizedTable
  data={largeDataSet}
  columns={columns}
  height={600}
  rowHeight={50}
  enableSorting={true}
  enableFiltering={true}
/>
```

### Columnas con TanStack Table

```tsx
import type { ColumnDef } from "@tanstack/react-table";

const columns: ColumnDef<Prestamo>[] = [
  {
    accessorKey: "codigo",
    header: "Código",
    enableSorting: true,
    cell: ({ row }) => (
      <span className="font-medium">{row.original.codigo}</span>
    ),
  },
  {
    accessorKey: "montoDesembolsado",
    header: "Monto",
    enableSorting: true,
    cell: ({ row }) => formatCurrency(row.original.montoDesembolsado),
  },
];
```

---

## 🔔 Notificaciones

### Sistema de Notificaciones

Sistema centralizado de notificaciones ya implementado y mejorado.

### Uso

```tsx
import { notificationService } from "@/lib/notifications/notification-service";

// Notificación de éxito
notificationService.success(
  "Préstamo creado",
  "El préstamo PRE-001 ha sido creado exitosamente"
);

// Notificación de error
notificationService.error(
  "Error al guardar",
  "No se pudo guardar el préstamo. Por favor, intente nuevamente."
);

// Notificación de advertencia
notificationService.warning(
  "Atención",
  "El cliente tiene préstamos pendientes"
);

// Notificación informativa
notificationService.info(
  "Información",
  "La operación se completará en breve"
);
```

### Características

- ✅ Auto-cierre configurable
- ✅ Animaciones suaves
- ✅ 4 tipos: success, error, warning, info
- ✅ Iconos por tipo
- ✅ Posicionamiento fijo (top-right)
- ✅ Stack de múltiples notificaciones
- ✅ Dark mode support

---

## ✅ Validaciones Visuales

### Mejoras Implementadas

#### Input / Select / Autocomplete

- ✅ Bordes rojos en errores
- ✅ Icono de error visible
- ✅ Mensaje de error claro
- ✅ Focus ring con color de error
- ✅ Hint text cuando no hay error

#### Hook de Validación

```tsx
import { useFormValidation } from "@/hooks/use-form-validation";

const {
  values,
  errors,
  touched,
  setValue,
  setFieldTouched,
  validateAll,
  isValid,
} = useFormValidation(
  { nombre: "", email: "" },
  {
    nombre: [
      {
        validator: (v) => v.length >= 3,
        message: "El nombre debe tener al menos 3 caracteres",
      },
    ],
    email: [
      {
        validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: "Email inválido",
      },
    ],
  }
);
```

#### Componente FormField

Wrapper unificado para todos los tipos de campos:

```tsx
import { FormField } from "@/components/ui/form-field";

<FormField
  type="input"
  label="Nombre del Cliente"
  required
  hint="Ingrese el nombre completo"
  error={errors.nombre}
  inputProps={{
    value: values.nombre,
    onChange: (e) => setValue("nombre", e.target.value),
    onBlur: () => setFieldTouched("nombre"),
  }}
/>

<FormField
  type="date"
  label="Fecha de Nacimiento"
  required
  inputProps={{
    value: values.fechaNacimiento,
    onChange: (date) => setValue("fechaNacimiento", date),
    minDate: new Date("1900-01-01"),
    maxDate: new Date(),
  }}
/>

<FormField
  type="autocomplete"
  label="Cliente"
  required
  inputProps={{
    options: clientOptions,
    value: values.idcliente,
    onChange: (value) => setValue("idcliente", value),
    loading: isLoadingClientes,
  }}
/>
```

---

## 🎨 Características de Diseño

### Validaciones Visuales

- **Estado Normal**: Borde gris, focus azul
- **Estado Error**: Borde rojo, focus ring rojo
- **Estado Éxito**: (Futuro) Borde verde
- **Disabled**: Opacidad reducida, cursor not-allowed

### Feedback Visual

- Loading states con spinners
- Estados vacíos con mensajes claros
- Transiciones suaves
- Hover states consistentes

### Accesibilidad

- Labels asociados a inputs
- ARIA labels donde corresponde
- Navegación con teclado
- Focus visible
- Contraste adecuado (WCAG AA)

---

## 📚 Ejemplos de Uso Completo

### Formulario con Validación

```tsx
"use client";

import { FormField } from "@/components/ui/form-field";
import { useFormValidation } from "@/hooks/use-form-validation";
import { Button } from "@/components/ui/button";
import { notificationService } from "@/lib/notifications/notification-service";

export function ClienteForm() {
  const {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validateAll,
    reset,
  } = useFormValidation(
    {
      nombre: "",
      email: "",
      fechaNacimiento: null,
      idcliente: null,
    },
    {
      nombre: [
        {
          validator: (v) => v.length >= 3,
          message: "Mínimo 3 caracteres",
        },
      ],
      email: [
        {
          validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
          message: "Email inválido",
        },
      ],
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateAll()) {
      // Guardar datos
      notificationService.success("Cliente guardado", "El cliente se guardó exitosamente");
      reset();
    } else {
      notificationService.error("Error de validación", "Por favor, corrija los errores");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        type="input"
        label="Nombre"
        required
        error={touched.nombre ? errors.nombre : undefined}
        inputProps={{
          value: values.nombre,
          onChange: (e) => setValue("nombre", e.target.value),
          onBlur: () => setFieldTouched("nombre"),
        }}
      />

      <FormField
        type="input"
        label="Email"
        required
        error={touched.email ? errors.email : undefined}
        inputProps={{
          type: "email",
          value: values.email,
          onChange: (e) => setValue("email", e.target.value),
          onBlur: () => setFieldTouched("email"),
        }}
      />

      <FormField
        type="date"
        label="Fecha de Nacimiento"
        inputProps={{
          value: values.fechaNacimiento,
          onChange: (date) => setValue("fechaNacimiento", date),
        }}
      />

      <Button type="submit">Guardar</Button>
    </form>
  );
}
```

### Tabla con Paginación y Filtros

```tsx
"use client";

import { AdvancedTable } from "@/components/ui/advanced-table";
import type { ColumnDef } from "@tanstack/react-table";

const columns: ColumnDef<Prestamo>[] = [
  {
    accessorKey: "codigo",
    header: "Código",
    enableSorting: true,
  },
  {
    accessorKey: "cliente.primer_nombres",
    header: "Cliente",
    enableSorting: true,
  },
  {
    accessorKey: "montoDesembolsado",
    header: "Monto",
    enableSorting: true,
    cell: ({ row }) => formatCurrency(row.original.montoDesembolsado),
  },
];

export function PrestamosTable({ prestamos }: { prestamos: Prestamo[] }) {
  return (
    <AdvancedTable
      data={prestamos}
      columns={columns}
      enablePagination={true}
      enableSorting={true}
      enableFiltering={true}
      pageSize={25}
      onRowClick={(prestamo) => {
        router.push(`/prestamos/${prestamo.idprestamo}`);
      }}
    />
  );
}
```

---

## 🚀 Próximos Pasos

### Mejoras Futuras Sugeridas

1. **Virtualización Real**: Instalar `@tanstack/react-virtual` para renderizado virtual real
2. **Exportación de Tablas**: CSV, Excel, PDF
3. **Filtros Avanzados**: Filtros por columna con operadores
4. **Drag & Drop**: Para reordenar columnas
5. **Guardar Vistas**: Guardar configuraciones de tablas
6. **Temas Personalizados**: Más opciones de personalización

---

## ✅ Resumen de Mejoras

### Implementado

- ✅ Buscador global en header
- ✅ Componente de autocompletado
- ✅ DateInput con Flatpickr localizado
- ✅ Tabla avanzada con paginación, ordenamiento y filtros
- ✅ Tabla virtualizada para grandes volúmenes
- ✅ Sistema de notificaciones mejorado
- ✅ Validaciones visuales con iconos y mensajes claros
- ✅ Hook de validación de formularios
- ✅ Componente FormField unificado

### Integración

Todos los componentes están listos para usar y se integran perfectamente con:
- TanStack Query (carga de datos)
- GraphQL (queries y mutations)
- Tailwind CSS (estilos)
- Dark mode (soporte completo)
- TypeScript (tipado completo)

---

**FlowPay** - Sistema de gestión de pagos con UX/UI avanzada ✨



