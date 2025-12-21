# DOCUMENTACIÓN: LÓGICA DE MORA AUTOMÁTICA

## 📋 ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Lógica Financiera](#lógica-financiera)
3. [Flujo de Proceso](#flujo-de-proceso)
4. [Configuración](#configuración)
5. [Ejemplos de Cálculo](#ejemplos-de-cálculo)
6. [Implementación Técnica](#implementación-técnica)

---

## 🎯 RESUMEN EJECUTIVO

El sistema de **Mora Automática** calcula y actualiza diariamente:

- ✅ **Mora acumulada** en cuotas vencidas
- ✅ **Estados de cuotas** (PENDIENTE → VENCIDA)
- ✅ **Estados de préstamos** (EN_CURSO → EN_MORA → CASTIGADO)
- ✅ **Promesas de pago** vencidas (PENDIENTE → INCUMPLIDA)

**Frecuencia de ejecución:** Una vez al día (recomendado: 2:00 AM)

---

## 💰 LÓGICA FINANCIERA

### 1. CÁLCULO DE MORA

#### Fórmula Base

```
Días de Atraso Efectivo = Max(0, Días desde Vencimiento - Días de Gracia)
Mora = (Saldo Capital + Saldo Interés) × Tasa Mora Diaria × Días de Atraso Efectivo
```

Donde:
- **Saldo Capital** = Capital Programado - Capital Pagado
- **Saldo Interés** = Interés Programado - Interés Pagado
- **Tasa Mora Diaria** = Tasa Mora Anual ÷ 365
- **Días desde Vencimiento** = Días transcurridos desde la fecha de vencimiento
- **Días de Gracia** = Configuración del sistema (default: 0)
- **Días de Atraso Efectivo** = Días sobre los que se calcula la mora (después de días de gracia)

#### Ejemplo Práctico

**Escenario:**
- Cuota vence: **1 de enero**
- Fecha actual: **5 de enero**
- Capital programado: **$1,000**
- Capital pagado: **$0**
- Interés programado: **$50**
- Interés pagado: **$0**
- Tasa mora anual: **36%** (0.36)

**Cálculo:**

1. **Días de atraso:**
   ```
   5 de enero - 1 de enero = 4 días
   ```

2. **Saldo pendiente:**
   ```
   Capital pendiente = $1,000 - $0 = $1,000
   Interés pendiente = $50 - $0 = $50
   Saldo total = $1,000 + $50 = $1,050
   ```

3. **Tasa mora diaria:**
   ```
   Tasa diaria = 0.36 ÷ 365 = 0.0009863 (0.09863% diario)
   ```

4. **Mora calculada:**
   ```
   Mora = $1,050 × 0.0009863 × 4 = $4.14
   ```

#### Notas Importantes

- ⚠️ La mora se calcula **después de los días de gracia** configurados
- ⚠️ Si una cuota está **parcialmente pagada**, la mora se calcula solo sobre el saldo pendiente
- ⚠️ La mora se **acumula diariamente** hasta que la cuota sea pagada completamente
- ⚠️ La **tasa de mora** se obtiene desde la configuración del sistema (no del préstamo)
- ⚠️ Todos los eventos se **registran en auditoría** para trazabilidad completa

---

### 2. ESTADOS DE CUOTAS

#### Transiciones de Estado

```
PENDIENTE → VENCIDA (cuando pasa la fecha de vencimiento)
PENDIENTE → PARCIAL (cuando hay pago parcial)
PARCIAL → VENCIDA (cuando pasa la fecha y aún hay saldo)
VENCIDA → PAGADA (cuando se paga completamente)
```

#### Reglas de Actualización

| Condición | Acción |
|-----------|--------|
| Fecha vencimiento < Hoy AND Estado = PENDIENTE | Cambiar a VENCIDA |
| Fecha vencimiento < Hoy AND Estado = PARCIAL | Cambiar a VENCIDA |
| Capital pagado < Capital programado | Mantener/Actualizar estado |
| Capital pagado = Capital programado AND Interés pagado = Interés programado | Cambiar a PAGADA |

---

### 3. ESTADOS DE PRÉSTAMOS

#### Transiciones de Estado

```
EN_CURSO → EN_MORA (cuando tiene al menos 1 cuota vencida)
EN_MORA → CASTIGADO (cuando la mora excede días configurados, default: 90 días)
EN_MORA → EN_CURSO (cuando todas las cuotas están al día)
```

#### Reglas de Actualización

| Condición | Acción |
|-----------|--------|
| Estado = EN_CURSO AND Tiene cuotas VENCIDAS | Cambiar a EN_MORA |
| Estado = EN_MORA AND Días mora máxima ≥ DIAS_MORA_CASTIGADO | Cambiar a CASTIGADO |
| Estado = EN_MORA AND Todas las cuotas al día | Cambiar a EN_CURSO |

**Nota:** El estado se actualiza basándose en la cuota con mayor mora acumulada.

---

### 4. PROMESAS DE PAGO

#### Transiciones de Estado

```
PENDIENTE → INCUMPLIDA (cuando pasa la fecha y no hay cumplimiento)
PENDIENTE → CUMPLIDA (cuando se registra un pago en la fecha)
```

#### Reglas de Detección

| Condición | Acción |
|-----------|--------|
| Estado = PENDIENTE AND Fecha promesa < Hoy AND Fecha cumplimiento = NULL | Cambiar a INCUMPLIDA |
| Estado = PENDIENTE AND Fecha cumplimiento != NULL | Mantener PENDIENTE (se actualiza manualmente a CUMPLIDA) |

---

## 🔄 FLUJO DE PROCESO

### Diagrama de Flujo

```
INICIO
  │
  ├─→ 1. Obtener cuotas vencidas
  │     (Estado: PENDIENTE o PARCIAL)
  │     (Fecha vencimiento < Hoy)
  │
  ├─→ 2. Para cada cuota vencida:
  │     │
  │     ├─→ Calcular días de atraso
  │     ├─→ Calcular saldos pendientes
  │     ├─→ Calcular mora acumulada
  │     ├─→ Actualizar estado a VENCIDA
  │     └─→ Actualizar campos:
  │           - diasMoraAcumulados
  │           - moraProgramada
  │
  ├─→ 3. Obtener préstamos EN_CURSO
  │
  ├─→ 4. Para cada préstamo:
  │     │
  │     ├─→ Verificar si tiene cuotas VENCIDAS
  │     ├─→ Si tiene cuotas vencidas:
  │     │     ├─→ Obtener cuota con mayor mora
  │     │     ├─→ Si mora > 90 días: CASTIGADO
  │     │     └─→ Si no: EN_MORA
  │     └─→ Actualizar estado del préstamo
  │
  ├─→ 5. Obtener promesas PENDIENTES vencidas
  │
  ├─→ 6. Para cada promesa vencida:
  │     └─→ Cambiar estado a INCUMPLIDA
  │
  └─→ FIN (Retornar estadísticas)
```

---

## ⚙️ CONFIGURACIÓN

### Parámetros del Sistema

Todos los parámetros se configuran desde el módulo de **Configuración del Sistema**:

| Parámetro | Clave | Valor por Defecto | Descripción |
|-----------|-------|-------------------|-------------|
| Tasa de Mora | `TASA_MORA` | `0.36` (36%) | Tasa de mora anual |
| Días de Gracia | `DIAS_GRACIA` | `0` | Días antes de aplicar mora |
| Días para Castigo | `DIAS_MORA_CASTIGADO` | `90` | Días de mora para castigar préstamo |

### Variables de Entorno

```env
# Token secreto para autenticación del cron job
CRON_SECRET=tu-token-secreto-aqui
```

**Nota:** La tasa de mora y días de gracia se obtienen dinámicamente desde la configuración del sistema, no desde variables de entorno.

### Configuración de Cron Job

#### Opción 1: Vercel Cron

Crear archivo `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/mora-automatica?token=TU_TOKEN_SECRETO",
      "schedule": "0 2 * * *"
    }
  ]
}
```

#### Opción 2: GitHub Actions

Crear `.github/workflows/mora-automatica.yml`:

```yaml
name: Mora Automática
on:
  schedule:
    - cron: '0 2 * * *'  # Diario a las 2:00 AM UTC
  workflow_dispatch:  # Permite ejecución manual

jobs:
  ejecutar:
    runs-on: ubuntu-latest
    steps:
      - name: Ejecutar Mora Automática
        run: |
          curl -X GET "https://tu-dominio.com/api/cron/mora-automatica?token=${{ secrets.CRON_SECRET }}"
```

#### Opción 3: node-cron (Servidor Dedicado)

```javascript
const cron = require('node-cron');
const fetch = require('node-fetch');

cron.schedule('0 2 * * *', async () => {
  try {
    const response = await fetch('https://tu-dominio.com/api/cron/mora-automatica', {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });
    const data = await response.json();
    console.log('Mora automática ejecutada:', data);
  } catch (error) {
    console.error('Error ejecutando mora automática:', error);
  }
});
```

---

## 📊 EJEMPLOS DE CÁLCULO

### Ejemplo 1: Cuota Simple

**Datos:**
- Capital: $5,000
- Interés: $250
- Fecha vencimiento: 15 de enero
- Fecha actual: 20 de enero
- Tasa mora: 36% anual

**Cálculo:**
```
Días atraso = 5 días
Saldo = $5,000 + $250 = $5,250
Tasa diaria = 0.36 / 365 = 0.0009863
Mora = $5,250 × 0.0009863 × 5 = $25.89
```

### Ejemplo 2: Cuota Parcialmente Pagada

**Datos:**
- Capital: $5,000 (pagado: $2,000)
- Interés: $250 (pagado: $100)
- Fecha vencimiento: 15 de enero
- Fecha actual: 20 de enero
- Tasa mora: 36% anual

**Cálculo:**
```
Días atraso = 5 días
Saldo capital pendiente = $5,000 - $2,000 = $3,000
Saldo interés pendiente = $250 - $100 = $150
Saldo total = $3,000 + $150 = $3,150
Tasa diaria = 0.36 / 365 = 0.0009863
Mora = $3,150 × 0.0009863 × 5 = $15.53
```

### Ejemplo 3: Préstamo con Múltiples Cuotas

**Datos:**
- Préstamo con 3 cuotas vencidas:
  - Cuota 1: 10 días de mora
  - Cuota 2: 25 días de mora
  - Cuota 3: 95 días de mora

**Resultado:**
```
Estado del préstamo: CASTIGADO
(Máxima mora: 95 días > 90 días)
```

---

## 🔧 IMPLEMENTACIÓN TÉCNICA

### Archivos Principales

1. **`src/lib/services/mora-automatica.ts`**
   - Servicio principal con toda la lógica
   - Funciones: `ejecutarMoraAutomatica()`, `calcularMora()`, etc.

2. **`src/app/api/cron/mora-automatica/route.ts`**
   - Endpoint API para ejecución por cron job
   - Autenticación mediante token

### Uso Programático

```typescript
import { ejecutarMoraAutomatica } from "@/lib/services/mora-automatica";

// Ejecutar manualmente (sin transacción)
const resultado = await ejecutarMoraAutomatica();

// Ejecutar con transacción única (todo o nada)
const resultadoTx = await ejecutarMoraAutomatica(true);

console.log(`Cuotas actualizadas: ${resultado.cuotasActualizadas}`);
console.log(`Préstamos actualizados: ${resultado.prestamosActualizados}`);
console.log(`Promesas marcadas: ${resultado.promesasMarcadas}`);
console.log(`Mora total calculada: $${resultado.moraTotalCalculada}`);
console.log(`Errores: ${resultado.errores.length}`);
```

### Integración con Configuración

El servicio se integra automáticamente con el módulo de configuración:

```typescript
import {
  obtenerTasaMora,
  obtenerDiasGracia,
  obtenerDiasMoraCastigado,
} from "@/lib/config/config-service";

// Estos valores se obtienen automáticamente en el proceso
const tasaMora = await obtenerTasaMora(); // 0.36
const diasGracia = await obtenerDiasGracia(); // 0
const diasCastigo = await obtenerDiasMoraCastigado(); // 90
```

### Respuesta del Endpoint

```json
{
  "success": true,
  "timestamp": "2024-01-20T02:00:00.000Z",
  "resultado": {
    "cuotasActualizadas": 15,
    "prestamosActualizados": 8,
    "promesasMarcadas": 3,
    "moraTotalCalculada": 1250.50,
    "errores": []
  }
}
```

---

## ⚠️ CONSIDERACIONES IMPORTANTES

1. **Tasa de Mora:** ✅ Se obtiene desde la configuración del sistema (`TASA_MORA`), no del préstamo.

2. **Días de Gracia:** ✅ Configurable desde el sistema (`DIAS_GRACIA`). La mora solo se calcula después de estos días.

3. **Año Base:** El cálculo usa 365 días. Algunas instituciones financieras usan 360 días (configurable).

4. **Mora Compuesta vs Simple:** Actualmente se calcula mora simple. Para mora compuesta, la fórmula sería diferente.

5. **Horario de Ejecución:** Se recomienda ejecutar en horario de baja actividad (madrugada, ej: 2:00 AM).

6. **Idempotencia:** El proceso puede ejecutarse múltiples veces sin duplicar cálculos.

7. **Transacciones:** El proceso puede ejecutarse con o sin transacción única:
   - Sin transacción: Más flexible, continúa aunque falle una parte
   - Con transacción: Todo o nada, más seguro pero menos flexible

8. **Auditoría:** ✅ Todas las actualizaciones se registran automáticamente en `tbl_auditoria`:
   - Inicio y fin del proceso
   - Cálculo de mora por cuota
   - Cambio de estado de préstamos
   - Marcado de promesas incumplidas

9. **Estados:** ✅ Cambios de estado correctos:
   - Cuotas: PENDIENTE/PARCIAL → VENCIDA
   - Préstamos: EN_CURSO → EN_MORA → CASTIGADO

---

## 📝 NOTAS FINALES

- ✅ El sistema está diseñado para ser **independiente del proveedor de cron**
- ✅ La lógica financiera está **claramente documentada** en el código
- ✅ El proceso es **idempotente** y puede ejecutarse múltiples veces
- ✅ Incluye **manejo de errores** y logging
- ✅ Preparado para **escalar** con grandes volúmenes de datos

---

**Última actualización:** Enero 2024

