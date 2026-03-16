# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Arroces Llopis is an order management system for a rice catering business. React/TypeScript frontend with Capacitor for mobile, Flask/Python backend, MySQL database. The system manages customers, rice products, orders with time-slot availability, delivery logistics, client analytics, and inventory.

## Commands

### Frontend (from `frontend/`)
```bash
npm run dev          # Dev server with HMR (host: true, accesible por IP local)
npm run build        # TypeScript compile + Vite build (modo production)
npm run build:mobile # Build para Capacitor/Android (modo mobile, usa .env.mobile)
npm run cap:sync     # Sincronizar build con proyecto nativo Capacitor
npm run android:open # Abrir proyecto Android en Android Studio
npm run lint         # ESLint
npm run preview      # Preview production build
```

### Backend (from `backend/`)
```bash
# Activate venv first: source venv/bin/activate (or venv\Scripts\activate on Windows)
python app/main.py          # Run Flask on http://localhost:5001 (debug mode)
pip install -r requirements.txt  # Install deps
```

### Database
```bash
mysql -u root -p < database/schema.sql   # Init/reset schema
```

## Deployment Environments

Three build/deployment modes, each with its own `.env` file:

| Mode | `.env` file | `VITE_API_BASE_URL` | Uso |
|------|------------|---------------------|-----|
| **Dev** | `.env` (default) | `/arrocesllopis-api` (proxied by Vite → localhost:5001) | `npm run dev` — desarrollo local con HMR |
| **Production** | `.env.production` | `/api/v1` | `npm run build` — desplegado en PythonAnywhere, Flask sirve el `dist/` y la API |
| **Mobile** | `.env.mobile` | `https://llopis-fedegarcia30.pythonanywhere.com/api/v1` | `npm run build:mobile` — Capacitor Android/iOS, URL absoluta al backend remoto |

- **Dev proxy**: Vite reescribe `/arrocesllopis-api/*` → `http://127.0.0.1:5001/api/v1/*` (ver `vite.config.ts`)
- **Production**: Flask sirve el frontend estático desde `backend/dist/` y la API bajo `/api/v1`
- **Mobile**: Capacitor empaqueta el `dist/` como app nativa; necesita URL absoluta al backend
- **SSH Tunnel**: El backend soporta túnel SSH opcional para conectar a la BD remota desde local (`app/utils/tunnel.py`)

## Architecture

### Backend (Flask)
- **App factory**: `backend/app/__init__.py` — creates Flask app, initializes SQLAlchemy + CORS, configures request logging, serves frontend static files
- **Models**: `backend/app/models.py` — SQLAlchemy ORM models (Cliente, Arroz, Usuario, Pedido)
- **Config**: `backend/config/settings.py` — loads from `.env` (DATABASE_URL, SECRET_KEY, AIRTABLE keys)
- **Entry point**: `backend/app/main.py`
- **Routes** (blueprints under `app/routes/`): `rices`, `clients`, `availability`, `orders`, `pedidos`, `stats`, `ingredients`, `auth`
- **CORS origins**: localhost:5173 (dev), localhost:5001, PythonAnywhere, `capacitor://localhost` (iOS), `http://localhost` (Android)

### Frontend (React + Vite + Capacitor)
- Entry: `frontend/src/main.tsx` → `App.tsx`
- All TS types in `frontend/src/types/index.ts`
- API layer: `frontend/src/api/client.ts` — generic `get/post/put/patch/del` with auto Firebase token injection + backend availability check
- Auth: `useAuth` hook/context in `frontend/src/hooks/useAuth.ts` wraps Firebase Auth and fetches user role from backend
- Mobile: Capacitor config in `frontend/capacitor.config.ts` (appId: com.arrocesllopis.app)
- TypeScript strict mode + `erasableSyntaxOnly` — cannot use `public` parameter properties in constructors

### Mobile-specific Components
- **SafeAreaProvider** (`components/SafeAreaProvider.tsx`): reads device safe area insets via `capacitor-plugin-safe-area`, sets CSS custom properties `--safe-top/bottom/left/right` globally
- **useScreenOrientation** (`hooks/useScreenOrientation.tsx`): locks orientation — portrait on phones (<768px), landscape on tablets
- CSS uses `--safe-top`, `--safe-bottom` etc. for padding in layout and map components
- Touch gestures: swipe between tabs in RepartosPage

### UI/CSS System
- Dark mode only with glassmorphism + gold accents
- CSS custom properties in `index.css`: `--gold-*`, `--glass-*`, `--bg-*`, `--text-*`, `--safe-*`
- Responsive typography via `clamp()` (`--text-xs` through `--text-3xl`)
- Minimum touch target: `--touch-min: 44px`
- Fonts: Inter (body) + Montserrat (headings), loaded via Google Fonts

### Roles & Routes
- Roles: `admin`, `gerente`, `encargado`, `cocinero`, `repartidor`
- Route guards via `RoleRoute` component in `App.tsx`:
  - `/calendar` — admin, encargado, gerente, cocinero
  - `/diario` — admin, encargado, gerente, cocinero
  - `/clientes`, `/arroces`, `/stock` — admin, encargado, gerente
  - `/admin/dashboard` — admin only
  - `/mapa` — admin, encargado, gerente
  - `/repartos` — all roles
- After login, each role redirects to its default page (admin→`/admin/dashboard`, cocinero→`/diario`, repartidor→`/repartos`, others→`/calendar`)

### Pages
- **CalendarPage**: vista mensual de disponibilidad de slots
- **DashboardPage** (`/diario`): pedidos del día con drag-drop por status
- **ClientsPage**: listado con búsqueda/paginación/sort + pestaña de análisis con `ClientAnalysisModal` y `AdminStatCard`
- **RicesPage**: CRUD de arroces
- **StockPage**: gestión de ingredientes, modo compra con registro de purchases
- **AdminDashboard**: panel de estadísticas de negocio (admin only)
- **RepartosPage**: dos sub-vistas con tabs + swipe — "Repartos" (entregas semanales por franja horaria) y "Recogidas" (recogidas pendientes con feedback/rating)
- **MapaPage**: mapa Leaflet con pedidos geolocalizados, filtros local/reparto, comparativa de periodos

### Database (MySQL)
- Schema: `database/schema.sql` — includes orders + inventory tables
- Soft deletes via `deleted_at` timestamp on main entities
- Triggers auto-update `clientes.num_pedidos` on order insert/soft-delete
- Views: `vista_pedidos_detallados`, `vista_stock_critico`
- `pedido_lineas` links pedidos to arroces (many-to-many with price snapshot)

### API Design
- Base URL: `http://localhost:5001/api/v1` (blueprint prefix `/api/v1`)
- `compartido.md` is the authoritative API contract — update it when endpoints change
- All secured endpoints use `Authorization: Bearer <Firebase idToken>`
- Backend verifies token via `firebase_admin.auth.verify_id_token()`
- API client (`src/api/client.ts`) does a backend availability ping before first request; caches result

### Key Business Rules
- Time slots: max 6 orders AND max 72 rations per slot
- Minimum 2 PAX per order
- Availability color: Green (0-3 orders, <36 pax), Yellow (4-5 orders, 37-60 pax), Red (6 orders or >60 pax)
- Order statuses: nuevo → preparando → listo → entregado | cancelado
- Repartos default view: recogidas on Mon–Thu, repartos on Fri–Sun

## Shared Interface
`compartido.md` is the bridge document between backend and frontend teams. Update it when adding/changing endpoints so the frontend team stays in sync. The frontend team is Claude Code; the backend team is Gemini.

## Language
Code comments, git messages, and documentation: Spanish preferred (matches business domain). Variable/function names in code can be English or Spanish matching existing conventions.
