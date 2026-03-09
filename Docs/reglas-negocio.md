# Reglas de Negocio - Arroces Llopis

## Slots Horarios

- Rango: 13:00 a 15:30
- Intervalo: cada 15 minutos
- Slots disponibles: 13:00, 13:15, 13:30, 13:45, 14:00, 14:15, 14:30, 14:45, 15:00, 15:15, 15:30

## Límites por Slot

| Límite | Valor |
|--------|-------|
| Máximo de pedidos | 6 |
| Máximo de raciones (PAX) | 72 |
| Mínimo de PAX por pedido | 2 |

Un slot se bloquea si se cumple **cualquiera** de los dos límites (pedidos O raciones).

## Disponibilidad Visual (Colores de Slot)

| Estado | Color | Condición |
|--------|-------|-----------|
| `green` | Verde | 0-3 pedidos Y < 36 PAX |
| `yellow` | Amarillo | 4-5 pedidos O 37-60 PAX |
| `red` | Rojo | 6 pedidos O > 60 PAX |

El campo `available: boolean` indica si aún se pueden añadir pedidos.

## Flujo de Estado de Pedidos

```
nuevo → preparando → listo → entregado
                           ↘ cancelado
```

Transiciones permitidas:
- `nuevo` → `preparando`, `cancelado`
- `preparando` → `listo`, `cancelado`
- `listo` → `entregado`, `cancelado`
- `entregado` → (estado final)
- `cancelado` → (estado final)

## Tipos de Entrega

- `local_recogida: true` → Cliente recoge en el local
- `local_recogida: false` → Entrega a domicilio (requiere dirección)

## Roles y Permisos

| Rol | /diario | /calendar | /clientes | /arroces | /stock | /admin/dashboard | /repartos |
|-----|---------|-----------|-----------|----------|--------|------------------|-----------|
| admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| gerente | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| encargado | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| cocinero | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| repartidor | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

Redirección post-login:
- `admin` → `/admin/dashboard`
- `cocinero` → `/diario`
- `repartidor` → `/repartos`
- otros → `/calendar`

## Restricciones de UI por Rol

- El botón "NUEVO PEDIDO" en `/diario` no aparece para `cocinero`
- La Sidebar muestra sólo los enlaces accesibles por el rol del usuario

## Pedido Multi-Arroz

Un mismo cliente puede pedir varios tipos de arroz. El OrderWizard permite añadir varios tipos antes de confirmar. Cada tipo de arroz genera un `Pedido` independiente (con su propia `PedidoLinea`). Cada pedido cuenta por separado hacia el límite de 6 por slot. No hay restricción de un pedido por cliente ni por slot.

## Validación Doble

Las reglas de negocio se validan **tanto en frontend como en backend**:
- Frontend: para UX inmediata (botones deshabilitados, slots bloqueados)
- Backend: re-valida antes de confirmar (race conditions, manipulación)

## Stock e Ingredientes

- Stock crítico: `stock_actual <= stock_minimo`
- Stock en aviso: `stock_actual <= stock_minimo * 1.2`
- Al registrar una compra (`/ingredients/purchase`), el stock se incrementa automáticamente
- Cada arroz tiene una receta (`arroz_ingredientes`) que define cuánto ingrediente consume por ración
- **Al crear un pedido**: se descuenta del stock la cantidad = `cantidad_por_racion × pax` para cada ingrediente de la receta
- **Al cancelar un pedido**: el stock se restaura automáticamente (`adjust_stock_from_order(restore=True)`)
- **Al reactivar un pedido cancelado**: el stock se descuenta de nuevo
- Si el arroz no tiene receta definida, no hay movimiento de stock

## Recogida de Recipientes (Recogidas)

- Cuando se entrega un pedido de reparto a domicilio, los recipientes quedan en casa del cliente
- El campo `recogido` del pedido indica si los recipientes han sido devueltos
- La pestaña "Recogidas" en `/repartos` muestra pedidos entregados (últimas 4 semanas) con `recogido = false`
- Al marcar una recogida, se puede registrar feedback del cliente (valoración 1-10 + comentario)
- Los pedidos de recogida en local (`local_recogida = true`) no aparecen en la lista de recogidas pendientes

## Precios

- El precio de cada arroz se registra como snapshot en `pedido_lineas.precio_unitario` en el momento del pedido (protección ante cambios de precio retroactivos)
- El histórico de precios se guarda en `historico_precios` tanto para precios de venta (arroces) como de compra (ingredientes)
