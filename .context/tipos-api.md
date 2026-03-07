# Contexto: Tipos TypeScript y Contrato de API

## Archivo de Tipos
Todos en `frontend/src/types/index.ts`.

## Entidades de Dominio

```typescript
interface Cliente {
  id: number; nombre: string; telefono?: string
  direccion?: string; codigo_postal?: string; observaciones?: string
  num_pedidos?: number; raciones?: number; activo?: boolean
}

interface Arroz {
  id: number; nombre: string; precio: number
  caldo?: string; disponible?: boolean
}

interface Ingrediente {
  id: number; nombre: string; unidad_medida: string
  stock_actual: number; stock_minimo: number; precio_actual?: number
}

interface Usuario {
  id: number; username: string
  rol: 'admin' | 'cocinero' | 'repartidor' | 'gerente'
  activo: boolean
}

type OrderStatus = 'nuevo' | 'preparando' | 'listo' | 'entregado' | 'cancelado'

interface PedidoLinea {
  id: number; pedido_id: number; arroz_id: number
  precio_unitario: number; arroz_nombre?: string
}

interface Pedido {
  id: number; cliente_id: number; cliente_nombre?: string
  telefono?: string; direccion?: string
  pax: number; fecha_pedido: string   // ISO datetime
  observaciones?: string; status: OrderStatus
  entregado: boolean; recogido: boolean; local_recogida: boolean
  usuario_asignado_id?: number; review?: number
  comentarios_recogida?: string; lineas?: PedidoLinea[]
  created_at?: string
}

interface AuthUser {
  uid: string; email: string | null; displayName: string | null
  rol?: 'admin' | 'cocinero' | 'repartidor' | 'gerente' | 'encargado'
}
```

## Tipos de Disponibilidad

```typescript
type SlotStatus = 'green' | 'yellow' | 'red'

interface Slot {
  time: string           // "13:00"
  orders_count: number
  pax_total: number
  available: boolean
  remaining_orders: number
  remaining_pax: number
  status: SlotStatus
}

interface AvailabilityResponse {
  date: string
  slots: Slot[]
}

interface CalendarMonthResponse {
  [date: string]: { count: number; total_pax: number }
}
```

## Tipos de Pedido/Cliente

```typescript
interface ClientLookupResponse {
  found: boolean
  clients?: Cliente[]
}

interface OrderCreateRequest {
  date: string; time: string
  client: { id: number | null; nombre: string; telefono: string; direccion: string; codigo_postal: string }
  order: { arroz_id: number; pax: number; recogida: boolean; observaciones?: string }
}

interface OrderCreateResponse {
  success: boolean; order_id?: number
  message: string; error_code?: string
}

interface PedidosFilters {
  status?: OrderStatus; fecha?: string; cliente_id?: number
}
```

## Tipos de Stock / Recetas

```typescript
interface ArrozIngrediente {
  ingrediente_id: number; nombre: string
  cantidad_por_racion: number; unidad_medida: string
}

interface RecetaResponse {
  rice_id: number; rice_name: string
  ingredients: ArrozIngrediente[]
}

interface CompraItem {
  ingrediente_id: number; cantidad: number; precio_unitario: number
}

interface CompraRequest {
  proveedor_id: number; items: CompraItem[]
  observaciones?: string; fecha?: string
}
```

## Resumen de Endpoints por Módulo

| Módulo | Endpoints |
|--------|-----------|
| Auth | `GET /auth/me` |
| Availability | `POST /availability/check`, `GET /pedidos/calendar` |
| Orders | `POST /orders/create`, `GET /pedidos`, `GET /pedidos/:id`, `PATCH /pedidos/:id/status`, `PATCH /pedidos/:id` |
| Clients | `POST /clients/lookup`, `GET /clientes`, `PUT /clientes/:id` |
| Rices | `GET /rices`, `POST /rices`, `PUT /rices/:id`, `DELETE /rices/:id`, `GET /rices/:id/recipe`, `POST /rices/:id/recipe` |
| Ingredients | `GET /ingredients`, `PUT /ingredients/:id`, `POST /ingredients/purchase` |
| Stats | `GET /stats/dashboard`, `GET /stats/expenses` |

## Errores API

```typescript
class ApiError extends Error {
  status: number   // 0 = sin conexión, 401 = no auth, 403 = sin permisos, 404, 500
}

// error_code especiales en body:
// "SLOT_FULL" → al crear pedido si el slot está lleno
```

## Base URL en el Cliente API

```typescript
// frontend/src/api/client.ts
const BASE_URL = isProd
  ? '/management-api'                                     // producción
  : (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/v1')  // dev
```
