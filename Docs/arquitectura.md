# Arquitectura del Sistema - Arroces Llopis

## Visión General

Sistema de gestión de pedidos para un negocio de catering de arroces. Arquitectura cliente-servidor desacoplada con autenticación Firebase.

```
[React SPA] ←→ [Firebase Auth] ←→ [Flask API /api/v1] ←→ [MySQL]
```

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19, TypeScript 5.9 (strict + erasableSyntaxOnly), Vite 7 |
| Mobile | Capacitor 8 (iOS/Android), appId: com.arrocesllopis.app |
| Routing | react-router-dom 7 |
| Auth | Firebase SDK (frontend) + firebase-admin (backend) |
| Backend | Python/Flask, SQLAlchemy ORM, Flask-CORS |
| Base de Datos | MySQL |
| CSS | Custom dark mode, glassmorphism, sin frameworks |

## Equipo y Responsabilidades

- **Claude Code** → Frontend (`frontend/`)
- **Gemini** → Backend (`backend/`)
- **`compartido.md`** → Contrato de API compartido (fuente de verdad)

## Estructura de Directorios

```
ArrocesLlopis/
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Router + guards de roles
│   │   ├── types/index.ts       # Todos los tipos TS del dominio
│   │   ├── api/                 # Capa de servicio HTTP
│   │   │   ├── client.ts        # HTTP client base (get/post/put/patch/del)
│   │   │   ├── auth.ts          # signIn, signOut, getUserProfile
│   │   │   ├── availability.ts  # checkAvailability
│   │   │   ├── pedidos.ts       # createOrder, getPedidos, updatePedido...
│   │   │   ├── arroces.ts       # getRices, createArroz, updateArroz...
│   │   │   ├── clientes.ts      # getClientes, lookupClient, updateCliente...
│   │   │   ├── stats.ts         # getDashboardStats, getExpenseStats
│   │   │   └── ingredients.ts   # getIngredients, recordPurchase, recipes...
│   │   ├── hooks/
│   │   │   ├── useAuth.ts       # Context + provider de autenticación
│   │   │   └── useAvailability.ts # Disponibilidad de slots
│   │   ├── components/
│   │   │   ├── Layout/          # Layout.tsx (Outlet) + Sidebar.tsx
│   │   │   ├── AvailabilityGrid/ # Grid de slots por hora
│   │   │   ├── OrderWizard/     # Wizard 4 pasos para nuevo pedido
│   │   │   ├── OrderCard/       # Tarjeta de pedido individual
│   │   │   ├── Modals/          # RiceEditModal, RecipeEditor, ConfirmMoveModal
│   │   │   ├── Stats/           # AdminStatCard
│   │   │   └── Login/           # Login.tsx
│   │   └── pages/
│   │       ├── DashboardPage.tsx    # /diario - vista operativa diaria
│   │       ├── CalendarPage.tsx     # /calendar - vista mensual
│   │       ├── ClientsPage.tsx      # /clientes
│   │       ├── RicesPage.tsx        # /arroces
│   │       ├── StockPage.tsx        # /stock - ingredientes e inventario
│   │       ├── AdminDashboard.tsx   # /admin/dashboard - estadísticas
│   │       ├── RepartosPage.tsx     # /repartos
│   │       └── LoginPage.tsx        # /login
│   └── public/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # App factory: Flask + SQLAlchemy + CORS + logging
│   │   ├── main.py              # Entry point (puerto 5001)
│   │   ├── auth.py              # @requires_auth, @requires_role decorators
│   │   ├── models.py            # ORM models
│   │   └── routes/
│   │       ├── __init__.py      # Blueprint api_v1_bp (prefijo /api/v1)
│   │       ├── availability.ts  # POST /availability/check
│   │       ├── orders.py        # POST /orders/create
│   │       ├── pedidos.py       # GET/PATCH /pedidos
│   │       ├── clients.py       # POST /clients/lookup, CRUD clientes
│   │       ├── rices.py         # CRUD /rices + recetas
│   │       ├── stats.py         # GET /stats/dashboard, /stats/expenses
│   │       ├── ingredients.py   # CRUD ingredientes + compras
│   │       └── auth.py          # GET /auth/me (perfil usuario)
│   ├── config/
│   │   └── settings.py          # Carga .env: DATABASE_URL, SECRET_KEY, Firebase
│   └── utils/
│       └── logger.py            # Logger centralizado
├── database/
│   └── schema.sql               # Schema completo MySQL
├── compartido.md                # Contrato API (actualizar siempre que cambie)
└── docs/                        # Esta documentación
```

## Flujo de Autenticación

```
1. Usuario → Login.tsx (email + password)
2. Firebase signInWithEmailAndPassword()
3. onAuthStateChanged dispara en useAuth.ts
4. Frontend llama GET /api/v1/auth/me con Bearer <idToken>
5. Backend: verify_id_token() → busca email en tabla usuarios
6. Devuelve { rol } → se fusiona en AuthUser
7. App.tsx redirige según rol
```

## Entornos

| Variable | Dev | Producción |
|----------|-----|-----------|
| API base | `http://localhost:5001/api/v1` | `/management-api` → nginx proxy |
| Frontend | `http://localhost:5173` | `https://solvency.ddns.net/management/` |
| `VITE_API_BASE_URL` | Opcional (hay fallback) | No necesaria (usa `/management-api`) |

## Patrones Importantes

### API Client (`frontend/src/api/client.ts`)
- Todas las llamadas pasan por funciones genéricas `get<T>`, `post<T>`, `put<T>`, `patch<T>`, `del<T>`
- Inyecta automáticamente `Authorization: Bearer <Firebase idToken>`
- Hace ping al backend al inicio; si no responde, lanza `ApiError(0, 'Backend no disponible')`
- `ingredients.ts` usa `fetch` directamente (patrón alternativo, inconsistente)

### Logging Backend
- Cada request se loguea en `backend/logs/` con método, path, status, duración, IP y Firebase UID
- Excepciones no manejadas se capturan en `teardown_request`
