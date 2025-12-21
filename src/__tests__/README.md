# Tests - FlowPay

Esta carpeta contiene la estructura de tests del proyecto.

## Estructura

```
src/__tests__/
├── unit/              # Tests unitarios
│   ├── services/      # Tests de servicios
│   ├── repositories/  # Tests de repositorios
│   └── utils/         # Tests de utilidades
├── integration/       # Tests de integración
│   └── api/           # Tests de API GraphQL
├── mocks/             # Mocks para tests
│   ├── repositories/  # Mocks de repositorios
│   └── services/      # Mocks de servicios
└── setup.ts           # Configuración global de tests
```

## Uso

Para ejecutar los tests:

```bash
npm test
```

Para ejecutar tests en modo watch:

```bash
npm test:watch
```

## Notas

- Los mocks están preparados para facilitar tests futuros
- La estructura sigue las mejores prácticas de testing
- Los tests unitarios deben ser rápidos y aislados
- Los tests de integración prueban el sistema completo

