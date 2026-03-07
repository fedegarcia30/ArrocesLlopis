# Contexto: Pedidos y Dashboard

## Archivos Clave
```
frontend/src/pages/DashboardPage.tsx       # Vista operativa principal
frontend/src/pages/CalendarPage.tsx        # Vista mensual
frontend/src/components/AvailabilityGrid/  # Grid de slots
frontend/src/components/OrderWizard/       # Wizard nuevo pedido (4 pasos)
frontend/src/components/OrderCard/         # Tarjeta de pedido
frontend/src/components/Modals/ConfirmMoveModal.tsx
frontend/src/api/pedidos.ts
frontend/src/api/availability.ts
frontend/src/hooks/useAvailability.ts
frontend/src/types/index.ts                # Slot, Pedido, AvailabilityResponse...
```

## Slots Horarios
- 13:00 a 15:30, cada 15 minutos
- Límites: 6 pedidos MAX o 72 PAX MAX por slot
- Colores: green (0-3 ped, <36 pax) | yellow (4-5 ped, 37-60 pax) | red (lleno)

## API de Disponibilidad
```typescript
// POST /availability/check
checkAvailability(date: string): Promise<AvailabilityResponse>
// { date, slots: [{ time, orders_count, pax_total, available, remaining_orders, remaining_pax, status }] }

// GET /pedidos/calendar?year=YYYY&month=M
getMonthlySummary(year, month): Promise<CalendarMonthResponse>
// { "2026-05-10": { count: 3, total_pax: 24 } }
```

## API de Pedidos
```typescript
getPedidos(filters?: { status?, fecha?, cliente_id? }): Promise<Pedido[]>
getPedido(id): Promise<Pedido>
createOrder(data: OrderCreateRequest): Promise<OrderCreateResponse>
updateOrderStatus(id, status: OrderStatus): Promise<Pedido>
updatePedido(id, data: Partial<Pedido>): Promise<Pedido>  // mover slot: { fecha_pedido: "2026-05-10 14:00" }
```

## Interfaz Pedido
```typescript
interface Pedido {
  id, cliente_id, cliente_nombre?, telefono?, direccion?
  pax, fecha_pedido: string  // ISO datetime (incluye hora del slot)
  observaciones?, status: OrderStatus
  entregado: boolean, recogido: boolean, local_recogida: boolean
  lineas?: PedidoLinea[]  // [{ id, arroz_id, arroz_nombre?, precio_unitario }]
  review?, comentarios_recogida?, created_at?
}
type OrderStatus = 'nuevo' | 'preparando' | 'listo' | 'entregado' | 'cancelado'
```

## DashboardPage — Lógica Central
- **Split layout**: izquierda = AvailabilityGrid, derecha = lista pedidos
- Seleccionar slot → `selectedSlot` → filtra `filteredPedidos` por hora
- Sin slot → vista resumen agrupada por hora con `OrderSummaryPill`
- Drag-and-drop (HTML5 + táctil) para mover pedidos:
  - `AvailabilityGrid.onDropOrder` → abre `ConfirmMoveModal`
  - Touch: `setTouchDragInfo` + listeners globales `touchmove`/`touchend`
- Mueve todos los pedidos del cliente en el mismo slot (no solo 1)
- FAB "+ NUEVO PEDIDO": visible solo si `user.rol !== 'cocinero'` y slot seleccionado disponible

## OrderWizard — 4 Pasos
```
Step 0: StepContact   → teléfono → POST /clients/lookup → cliente encontrado o datos nuevos
Step 1: StepSelection → elegir Arroz (GET /rices) + PAX (mín 2, máx remaining_pax)
Step 2: StepFulfillment → recogida(bool) + observaciones + dirección alternativa
Step 3: StepConfirm   → resumen, "Añadir otro arroz" (vuelve a Step 1), o confirmar
```
- Múltiples arroces: cada item llama `createOrder` secuencialmente
- Si el slot se llena en Step 3, se puede cambiar a otro desde `StepConfirm`
- `canProceed()` controla si el botón "Siguiente" está habilitado

## OrderCreateRequest (payload a API)
```typescript
{
  date: "2026-05-10",
  time: "13:30",
  client: { id: 123 | null, nombre, telefono, direccion, codigo_postal },
  order: { arroz_id, pax, recogida: boolean, observaciones? }
}
```

## Flujo de Estado de Pedidos
```
nuevo → preparando → listo → entregado
                           ↘ cancelado
```

## CSS Clases Importantes
- `.dashboard` → contenedor principal
- `.dashboard-split` → flex row izquierda/derecha
- `.slot-card` → cada slot en el grid; `.slot-card.drag-over` al hacer hover con drag
- `.order-card` → tarjeta pedido
- `.fab-new-order` → botón flotante nuevo pedido
- `.touch-drag-ghost` → elemento visual al arrastrar táctilmente
- Status badges: `.order-status-badge.nuevo/.preparando/.listo/.entregado/.cancelado`
