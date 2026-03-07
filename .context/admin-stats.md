# Contexto: Admin Dashboard y Estadísticas

## Archivos Clave
```
frontend/src/pages/AdminDashboard.tsx
frontend/src/components/Stats/AdminStatCard.tsx
frontend/src/api/stats.ts
```

## Acceso
Ruta `/admin/dashboard` — solo rol `admin`.

## API Estadísticas (`frontend/src/api/stats.ts`)

```typescript
getDashboardStats(period?: string, mode?: string): Promise<DashboardStats>
// GET /stats/dashboard?period=quarter&mode=full

getExpenseStats(period?: string, mode?: string): Promise<ExpenseStats>
// GET /stats/expenses?period=quarter&mode=full
```

### Parámetros
- `period`: `'month'` | `'quarter'` | `'semester'` | `'ytd'`
- `mode`: `'full'` (período completo) | `'mtd'` (mes hasta hoy)

## Interfaces de Respuesta

### DashboardStats (ingresos)
```typescript
interface DashboardStats {
  summary: {
    revenue: Metric    // Ingresos totales
    rations: Metric    // Raciones servidas
    orders: Metric     // Número de pedidos
    avg_ticket: Metric // Ticket medio
  }
  period_info: {
    current: { label: string }   // ej: "Q1 2026"
    previous: { label: string }  // ej: "Q4 2025"
  }
  top_arroces: { nombre, rations, subtotal }[]
  top_clients: { nombre, orders, spent, rations }[]
  top_zipcodes: { cp, orders, revenue }[]
  busiest_month: string | null
  history: {
    revenue: TrendData   // arrays de valores por período
    rations: TrendData
    orders: TrendData
    clients: TrendData
  }
}

interface Metric {
  value: number
  growth: number    // % crecimiento vs período anterior (puede ser negativo)
  label: string
  sublabel: string
  sparkline?: number[]
}

interface TrendData {
  current: number[]  // período actual
  prev1: number[]    // -1 período
  prev2: number[]    // -2 períodos
  prev3: number[]    // -3 períodos
}
```

### ExpenseStats (gastos)
```typescript
interface ExpenseStats {
  summary: {
    total_expense: Metric
    purchases_count: Metric
    stock_alerts: Metric & { status?: 'warning' | 'ok' }
  }
  top_ingredients: { nombre, qty, spent, unit }[]
  top_providers: { nombre, count, spent }[]
}
```

## AdminDashboard — Lógica UI

### Tabs
- **Ingresos** (`activeTab === 'revenue'`): usa `DashboardStats`
- **Gastos** (`activeTab === 'expenses'`): usa `ExpenseStats`

### Filtros
- `period`: selector de período (quarter por defecto)
- `mode`: 'full' | 'mtd'
- `trendMetric`: qué métrica mostrar en el gráfico de tendencia ('revenue' | 'rations' | 'orders' | 'clients')

### Carga de Datos
```typescript
// Carga ambas stats en paralelo al montar y cuando cambian los filtros
const [revData, expData] = await Promise.all([
  getDashboardStats(period, mode),
  getExpenseStats(period, mode)
])
```

## AdminStatCard
Componente para mostrar una métrica individual con:
- Valor principal
- Indicador de crecimiento (verde/rojo según positivo/negativo)
- Sublabel descriptivo
- Sparkline opcional (mini gráfico de tendencia)
