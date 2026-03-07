# Frontend - Arroces Llopis

## Stack y Configuración

- **React 19** + **TypeScript 5.9** (strict, erasableSyntaxOnly, noUnusedLocals)
- **Vite 7** como bundler
- **react-router-dom 7** para routing
- **Firebase SDK 12** para autenticación
- Sin framework CSS — dark mode personalizado con glassmorphism

### Restricciones TypeScript importantes
- `erasableSyntaxOnly: true` → No se pueden usar `public` en parámetros de constructor
- `verbatimModuleSyntax: true` → Usar `import type` para tipos
- `noUnusedLocals` y `noUnusedParameters: true` → No dejar variables sin usar

## Tipos de Dominio

Todos en `frontend/src/types/index.ts`. Interfaces clave:

```typescript
Cliente, Arroz, Ingrediente, Usuario, Pedido, PedidoLinea
OrderStatus = 'nuevo' | 'preparando' | 'listo' | 'entregado' | 'cancelado'
Slot, AvailabilityResponse, SlotStatus = 'green' | 'yellow' | 'red'
AuthUser { uid, email, displayName, rol? }
OrderCreateRequest, OrderCreateResponse
CalendarMonthResponse { [date: string]: { count, total_pax } }
```

## API Layer (`frontend/src/api/`)

### `client.ts` — HTTP base client
```typescript
get<T>(endpoint)         // GET /api/v1{endpoint}
post<T>(endpoint, body)  // POST
put<T>(endpoint, body)   // PUT
patch<T>(endpoint, body) // PATCH
del<T>(endpoint)         // DELETE
class ApiError { status: number; message: string }
```
- Inyecta automáticamente el Firebase idToken en `Authorization: Bearer`
- En prod usa `/management-api` como base; en dev `VITE_API_BASE_URL` o `http://localhost:5001/api/v1`
- Hace ping al inicio; si falla lanza `ApiError(0, 'Backend no disponible')`

> **Nota**: `ingredients.ts` usa `fetch` directamente, no el client base. Es un patrón inconsistente a evitar en nuevas funciones.

### Módulos API
| Archivo | Funciones principales |
|---------|----------------------|
| `auth.ts` | `signIn`, `signOut`, `getUserProfile` |
| `availability.ts` | `checkAvailability(date)` |
| `pedidos.ts` | `getPedidos`, `getPedido`, `createOrder`, `updateOrderStatus`, `updatePedido`, `getMonthlySummary` |
| `arroces.ts` | `getRices`, `getArroz`, `createArroz`, `updateArroz`, `deleteArroz` |
| `clientes.ts` | `getClientes`, `lookupClient`, `updateCliente` |
| `stats.ts` | `getDashboardStats`, `getExpenseStats` |
| `ingredients.ts` | `getIngredients`, `updateIngredient`, `recordPurchase`, `getRiceRecipe`, `updateRiceRecipe` |

## Autenticación (`hooks/useAuth.ts`)

```typescript
// Contexto
const { user, loading, signIn, signOut, refreshProfile } = useAuth();

// user es AuthUser | null:
// { uid, email, displayName, rol? }
```

Flujo:
1. Firebase `onAuthStateChanged` detecta sesión
2. `getUserProfile()` llama `GET /api/v1/auth/me` para obtener el `rol` de la BD
3. El rol se fusiona en el objeto `user`

## Routing y Guards (`App.tsx`)

```tsx
<ProtectedRoute>   // Requiere user != null
<PublicRoute>      // Redirige si ya hay sesión
<RoleRoute allowedRoles={['admin', 'gerente']}>  // Requiere rol específico
```

Rutas:
```
/login           → LoginPage (pública)
/diario          → DashboardPage
/calendar        → CalendarPage
/clientes        → ClientsPage
/arroces         → RicesPage
/stock           → StockPage
/admin/dashboard → AdminDashboard
/repartos        → RepartosPage
*                → redirect /calendar
```

## Componentes Clave

### `AvailabilityGrid`
- Muestra los slots del día con colores (green/yellow/red)
- Soporta drag-and-drop para mover pedidos entre slots
- Recibe `slots`, `loading`, `error`, callbacks `onSlotSelect`, `onDropOrder`

### `OrderWizard` (4 pasos)
```
Step 0 (StepContact)    → Buscar cliente por teléfono / crear nuevo
Step 1 (StepSelection)  → Elegir arroz + PAX
Step 2 (StepFulfillment)→ Recogida o domicilio + observaciones
Step 3 (StepConfirm)    → Resumen + "Añadir otro arroz" o confirmar
```
- Soporta múltiples arroces por pedido (llama `createOrder` por cada item)
- Se puede cambiar el slot activo desde el paso 3 si el original se llena

### `OrderCard`
- Tarjeta de pedido con cambio de estado
- Soporta drag táctil (`onDragStartTouch`) para móvil
- Muestra: nombre cliente, arroz, PAX, hora, status badge

### `Sidebar`
- Iconos de navegación filtrados según rol del usuario
- Fijo a la izquierda, colapsado (solo iconos con `title` tooltip)

## Sistema de Estilos

### Variables CSS globales (`index.css`)
```css
/* Backgrounds */
--bg-primary: #0d0d0d
--bg-secondary: #1a1a1a
--bg-card: rgba(30,30,30,0.8)
--bg-glass: rgba(255,255,255,0.05)

/* Acento dorado */
--gold: #d4af37
--gold-light: #e8c852
--gold-bg: rgba(212,175,55,0.15)

/* Texto */
--text-primary: #f0f0f0
--text-secondary: #a0a0a0
--text-muted: #666

/* Status */
--status-green: #2ecc71  / --status-green-bg
--status-yellow: #f1c40f / --status-yellow-bg
--status-red: #e74c3c   / --status-red-bg
--status-blue (para badges informativos)

/* Bordes */
--border-subtle: rgba(255,255,255,0.08)
--border-gold: rgba(212,175,55,0.3)

/* Radios */
--radius: 12px  --radius-sm: 8px  --radius-lg: 16px

/* Touch */
--touch-min: 48px  (mínimo para botones táctiles)
```

### Clase Glassmorphism
```css
.glass-card {
  background: var(--bg-card);
  backdrop-filter: blur(var(--glass-blur));  /* 12px */
  border: var(--glass-border);
  border-radius: var(--radius);
}
```

### Convenciones CSS
- Cada componente tiene su propio archivo `.css` junto al `.tsx`
- CSS plano, sin módulos CSS (clases globales)
- Mobile-first: `@media (max-width: 768px)` para breakpoints móvil
- Mínimo táctil: 48px (definido en `--touch-min`)

## Páginas

### `DashboardPage` (`/diario`)
Vista operativa principal. Split izquierda (AvailabilityGrid) / derecha (lista de pedidos).
- Seleccionar slot → muestra pedidos de esa franja
- Sin slot seleccionado → resumen agrupado por hora (OrderSummaryPill)
- Drag & drop (ratón y táctil) para mover pedidos entre slots → `ConfirmMoveModal`
- FAB "NUEVO PEDIDO" (oculto para `cocinero`)

### `CalendarPage` (`/calendar`)
Vista mensual. Cada día muestra `count` y `total_pax`. Clic en día navega a `/diario?date=YYYY-MM-DD`.

### `AdminDashboard` (`/admin/dashboard`)
Panel de estadísticas. Tabs "Ingresos" / "Gastos". Filtros de período (quarter, month, semester, ytd) y modo (full, mtd).

### `StockPage` (`/stock`)
Gestión de inventario. Lista de ingredientes con estado de stock (ok/warning/critical). Modo compra para registrar entradas de stock.

### `RicesPage` (`/arroces`)
CRUD de arroces con `RiceEditModal`. Desde aquí también se gestiona la receta de cada arroz (`RecipeEditor`).
