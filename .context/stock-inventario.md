# Contexto: Stock e Inventario

## Archivos Clave
```
frontend/src/pages/StockPage.tsx
frontend/src/api/ingredients.ts     # NOTA: usa fetch directo, no api/client.ts
frontend/src/components/Modals/RecipeEditor.tsx
frontend/src/types/index.ts         # Ingrediente, ArrozIngrediente, CompraRequest, CompraItem
```

## Tipos
```typescript
interface Ingrediente {
  id: number
  nombre: string
  unidad_medida: string   // 'g', 'ml', 'ud', etc.
  stock_actual: number
  stock_minimo: number
  precio_actual?: number  // último precio de compra
}

interface CompraRequest {
  proveedor_id: number
  items: CompraItem[]
  observaciones?: string
  fecha?: string           // YYYY-MM-DD, si no se usa hoy
}

interface CompraItem {
  ingrediente_id: number
  cantidad: number
  precio_unitario: number
}
```

## API Ingredientes (`frontend/src/api/ingredients.ts`)

> **Importante**: este módulo usa `fetch` directamente (no el client base de `api/client.ts`).
> Usa `VITE_API_BASE_URL || '/api/v1'` como base.

```typescript
getIngredients(): Promise<Ingrediente[]>
updateIngredient(id, data: Partial<Ingrediente>): Promise<void>   // PUT /ingredients/:id
recordPurchase(data: CompraRequest): Promise<void>                  // POST /ingredients/purchase
getRiceRecipe(riceId): Promise<RecetaResponse>                      // GET /rices/:id/recipe
updateRiceRecipe(riceId, ingredients): Promise<void>                // POST /rices/:id/recipe
```

## Endpoints Backend
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/ingredients` | Lista todos los ingredientes |
| PUT | `/ingredients/:id` | Actualizar ingrediente (stock, nombre, mínimo, precio) |
| POST | `/ingredients/purchase` | Registrar compra (incrementa stock, guarda historial) |
| GET | `/rices/:id/recipe` | Receta de un arroz |
| POST | `/rices/:id/recipe` | Guardar receta de un arroz |

Query param en purchase: `?fecha=YYYY-MM-DD` (opcional, default: hoy)

## StockPage — Lógica

### Estados de Stock
```typescript
getStockStatus(item: Ingrediente): 'critical' | 'warning' | 'ok'
// critical: stock_actual <= stock_minimo
// warning:  stock_actual <= stock_minimo * 1.2
// ok:       stock_actual > stock_minimo * 1.2
```

### Modo Compra
- Toggle `isPurchaseMode` en la página
- Permite introducir `qty` y `price` para múltiples ingredientes a la vez
- Al confirmar → `recordPurchase({ proveedor_id: 1, items: [...] })`
  - El proveedor se hardcodea a 1 (mejorable)
  - El backend actualiza `stock_actual` e `ingredientes.precio_actual`

### Edición de Ingrediente
- Modal inline (`editingItem`)
- Campos editables: nombre, unidad_medida, stock_minimo, stock_actual, precio_actual
- Guarda con `updateIngredient(id, data)`

## Modelo Base de Datos
```python
# backend/app/models.py
class Ingrediente:
    id, nombre (unique), unidad_medida='g'
    stock_actual: Numeric(10,3)   # precisión para gramos/ml
    stock_minimo: Numeric(10,3)
    precio_actual: Numeric(10,2)  # último precio de compra

class ArrozIngrediente:
    arroz_id, ingrediente_id
    cantidad_por_racion: Numeric(10,3)   # cantidad por PAX

class Compra:
    proveedor_id, fecha_compra, total, observaciones

class CompraLinea:
    compra_id, ingrediente_id, cantidad, precio_unitario

class HistoricoPrecio:
    item_id, tipo_item ('venta'|'compra'), precio, fecha_inicio
```

## Vista MySQL
`vista_stock_critico` — ingredientes con `stock_actual <= stock_minimo`

## Acceso por Rol
La ruta `/stock` solo es accesible para `admin`, `encargado`, `gerente`.
