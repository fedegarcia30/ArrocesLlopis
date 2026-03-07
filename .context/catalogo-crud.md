# Contexto: Catálogo (Arroces y Clientes)

## Archivos Clave
```
frontend/src/pages/RicesPage.tsx
frontend/src/pages/ClientsPage.tsx
frontend/src/components/Modals/RiceEditModal.tsx
frontend/src/components/Modals/RecipeEditor.tsx
frontend/src/api/arroces.ts
frontend/src/api/clientes.ts
frontend/src/types/index.ts       # Arroz, Cliente, RecetaResponse, ArrozIngrediente
```

## Tipos
```typescript
interface Arroz {
  id: number
  nombre: string
  precio: number
  caldo?: string        // tipo de caldo
  disponible?: boolean  // false = soft-deleted
}

interface Cliente {
  id: number
  nombre: string
  telefono?: string
  direccion?: string
  codigo_postal?: string
  observaciones?: string
  num_pedidos?: number   // auto-calculado por trigger MySQL
  raciones?: number      // total histórico de raciones
  activo?: boolean
}
```

## API Arroces
```typescript
// frontend/src/api/arroces.ts
getRices(): Promise<Arroz[]>                          // GET /rices
getArroz(id): Promise<Arroz>                          // GET /rices/:id
createArroz(data: Partial<Arroz>): Promise<{ id, message }>  // POST /rices
updateArroz(id, data: Partial<Arroz>): Promise<{ message }>  // PUT /rices/:id
deleteArroz(id): Promise<{ message }>                 // DELETE /rices/:id (soft-delete)
```

## API Clientes
```typescript
// frontend/src/api/clientes.ts
getClientes(): Promise<Cliente[]>                                 // GET /clientes
lookupClient(phone: string): Promise<ClientLookupResponse>        // POST /clients/lookup
updateCliente(id, data: Partial<Cliente>): Promise<Cliente>       // PUT o PATCH /clientes/:id
```

```typescript
interface ClientLookupResponse {
  found: boolean
  clients?: Cliente[]   // array porque puede haber varios con el mismo número
}
```

## Endpoints Backend Arroces
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/rices` | Lista todos (admin: incluye no disponibles) |
| POST | `/rices` | Crear arroz `{ nombre, precio, caldo?, disponible? }` |
| PUT | `/rices/:id` | Editar arroz completo |
| DELETE | `/rices/:id` | Soft-delete (disponible=false) |
| GET | `/rices/:id/recipe` | Receta del arroz (ingredientes + cantidades) |
| POST | `/rices/:id/recipe` | Guardar/actualizar receta |

## Endpoints Backend Clientes
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/clientes` | Lista todos los clientes activos |
| POST | `/clients/lookup` | Buscar por teléfono `{ phone }` |
| PUT/PATCH | `/clientes/:id` | Actualizar cliente |

## Receta de Arroz
```typescript
interface RecetaResponse {
  rice_id: number
  rice_name: string
  ingredients: ArrozIngrediente[]
}

interface ArrozIngrediente {
  ingrediente_id: number
  nombre: string
  cantidad_por_racion: number  // cantidad por PAX
  unidad_medida: string        // 'g', 'ml', 'ud'
}
```

La receta se edita con `RecipeEditor` modal (dentro de `RiceEditModal`).
Guardar → `POST /rices/:id/recipe` con array `[{ ingrediente_id, cantidad_por_racion }]`.

## Componentes UI

### RiceEditModal
- Modal para crear/editar un arroz
- Campos: nombre, precio, caldo, disponible
- Incluye botón para abrir `RecipeEditor`

### RecipeEditor
- Lista los ingredientes disponibles (`GET /ingredients`)
- Permite asignar `cantidad_por_racion` a cada ingrediente
- Guarda con `updateRiceRecipe(riceId, ingredients)`

## Convenciones de Datos
- `disponible: false` = soft-deleted, no aparece en catálogo público pero sí en admin
- `num_pedidos` y `raciones` en Cliente son calculados por trigger MySQL, no editar manualmente
- Precios siempre en euros, 2 decimales
- Los precios de arroces se registran como snapshot en `pedido_lineas` al crear pedido
